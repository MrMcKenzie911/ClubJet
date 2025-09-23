import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { revalidatePath } from 'next/cache'

export const runtime = 'nodejs'

function nextReleaseDate(requestedAt: Date): string {
  const d = new Date(requestedAt)
  const y = d.getUTCFullYear(); const m = d.getUTCMonth(); const day = d.getUTCDate()
  if (day <= 1) return new Date(Date.UTC(y, m, 10)).toISOString().slice(0,10)
  return new Date(Date.UTC(y, m+1, 10)).toISOString().slice(0,10)
}

export async function POST(req: Request) {
  try {
    const supa = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.redirect(new URL('/login', req.url))
    const { data: me } = await supa.from('profiles').select('role').eq('id', user.id).single()
    if (me?.role !== 'admin') return NextResponse.redirect(new URL('/login', req.url))

    const form = await req.formData()
    const wrId = String(form.get('wr_id') || '')
    const decision = String(form.get('decision') || '')
    if (!wrId || !decision) return NextResponse.redirect(new URL('/admin?toast=error', req.url))

    if (decision === 'approve') {
      const schedule = nextReleaseDate(new Date())
      // fetch withdrawal details
      const { data: wr } = await supabaseAdmin
        .from('withdrawal_requests')
        .select('id, account_id, amount, method')
        .eq('id', wrId)
        .maybeSingle()

      await supabaseAdmin
        .from('withdrawal_requests')
        .update({ status: 'approved', scheduled_release_at: schedule })
        .eq('id', wrId)

      // Immediately decrement account balance and record withdrawal transaction
      if (wr?.account_id && wr?.amount) {
        const { data: acct } = await supabaseAdmin
          .from('accounts')
          .select('id, balance')
          .eq('id', wr.account_id)
          .maybeSingle()
        if (acct?.id) {
          const newBal = Math.max(0, Number(acct.balance || 0) - Number(wr.amount || 0))
          await supabaseAdmin.from('accounts').update({ balance: newBal }).eq('id', acct.id)
          await supabaseAdmin.from('transactions').insert({ account_id: acct.id, type: 'WITHDRAWAL', amount: Number(wr.amount), status: 'posted', metadata: wr.method ? { method: wr.method } : null })
        }
      }
      try { revalidatePath('/admin'); revalidatePath('/dashboard') } catch {}
      return NextResponse.redirect(new URL('/admin?toast=withdrawal_approved', req.url))
    } else if (decision === 'deny') {
      await supabaseAdmin.from('withdrawal_requests').update({ status: 'denied' }).eq('id', wrId)
      try { revalidatePath('/admin'); revalidatePath('/dashboard') } catch {}
      return NextResponse.redirect(new URL('/admin?toast=withdrawal_denied', req.url))
    }

    return NextResponse.redirect(new URL('/admin?toast=error', req.url))
  } catch (e) {
    console.error('api decide-withdrawal failed', e)
    return NextResponse.redirect(new URL('/admin?toast=error', req.url))
  }
}

