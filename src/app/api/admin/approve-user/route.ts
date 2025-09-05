import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
  // Ensure admin guard (direct)
  const supa = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url))
  const { data: me } = await supa.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return NextResponse.redirect(new URL('/login', req.url))

    const form = await req.formData()
    const userId = String(form.get('user_id') || '')
    const decision = String(form.get('decision') || '')
    if (!userId || !decision) {
      return NextResponse.redirect(new URL('/admin?toast=error', req.url))
    }

    if (decision === 'approve') {
      const { error: upErr } = await supabaseAdmin.from('profiles').update({ role: 'user', approval_status: 'approved', approved_by: user.id, approved_at: new Date().toISOString() }).eq('id', userId)
      if (upErr) throw upErr
      // Ensure user has an account and verify the earliest one
      let { data: acct } = await supabaseAdmin
        .from('accounts')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (!acct?.id) {
        const { data: created, error: cErr } = await supabaseAdmin
          .from('accounts')
          .insert({ user_id: userId, type: 'LENDER', balance: 0, minimum_balance: 5000, start_date: new Date().toISOString() })
          .select('id')
          .maybeSingle()
        if (cErr) throw cErr
        acct = created
      }
      if (acct?.id) {
        const { error: vErr } = await supabaseAdmin.from('accounts').update({ verified_at: new Date().toISOString() }).eq('id', acct.id)
        if (vErr) throw vErr
      }

      // Process initial deposit and signup fee if any pending_deposits exist
      try {
        const { processInitialDeposit } = await import('@/lib/initialDeposit')
        await processInitialDeposit(userId)
      } catch (e) {
        console.warn('processInitialDeposit skipped or failed', e)
      }

      return NextResponse.redirect(new URL('/admin?toast=user_approved', req.url))
    } else if (decision === 'reject') {
      const { error: delErr } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
      if (delErr) throw delErr
      return NextResponse.redirect(new URL('/admin?toast=user_rejected', req.url))
    }

    return NextResponse.redirect(new URL('/admin?toast=error', req.url))
  } catch (e) {
    console.error('api approve-user failed', e)
    return NextResponse.redirect(new URL('/admin?toast=error', req.url))
  }
}

