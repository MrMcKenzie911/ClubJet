import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const supa = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.redirect(new URL('/login', req.url))

    const form = await req.formData()
    let account_id = String(form.get('account_id') || '')
    const amount = parseFloat(String(form.get('amount') || '0'))
    const method = String(form.get('method') || 'WIRE')

    // Fallback to user's first account if not provided
    if (!account_id) {
      const { data: acct } = await supabaseAdmin
        .from('accounts')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (acct?.id) account_id = acct.id
      else {
        // Create a default account to support first-time user action
        const { data: created, error: cErr } = await supabaseAdmin
          .from('accounts')
          .insert({ user_id: user.id, type: 'LENDER', balance: 0, minimum_balance: 5000, start_date: new Date().toISOString() })
          .select('id')
          .maybeSingle()
        if (cErr) throw cErr
        account_id = created?.id || ''
      }
    }

    if (!account_id || !amount || amount <= 0) return NextResponse.redirect(new URL('/dashboard?toast=error', req.url))

    // Enforce lockups and pilot restrictions
    const { data: acct } = await supabaseAdmin
      .from('accounts')
      .select('id, type, balance, minimum_balance, start_date, lockup_end_date')
      .eq('id', account_id)
      .maybeSingle()

    const now = new Date()
    if (acct) {
      // Pilot mode: Lender with balance < $5,000 cannot withdraw
      if (acct.type === 'LENDER' && Number(acct.balance ?? 0) < 5000) {
        return NextResponse.redirect(new URL('/dashboard?toast=pilot_lock', req.url))
      }
      // Lockup enforcement using lockup_end_date when present
      if (acct.lockup_end_date) {
        const end = new Date(acct.lockup_end_date as unknown as string)
        if (now < end) {
          return NextResponse.redirect(new URL('/dashboard?toast=locked', req.url))
        }
      }
    }

    const { error: insErr } = await supabaseAdmin
      .from('withdrawal_requests')
      .insert({ account_id, amount, method, status: 'pending' })
    if (insErr) throw insErr

    return NextResponse.redirect(new URL('/dashboard?toast=withdraw_submitted', req.url))
  } catch (e) {
    console.error('api user/withdrawal failed', e)
    return NextResponse.redirect(new URL('/dashboard?toast=error', req.url))
  }
}

