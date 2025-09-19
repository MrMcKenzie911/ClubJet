import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any)) as { account_id?: string, amount?: number }
    const account_id = String(body.account_id || '')
    const overrideAmount = typeof body.amount === 'number' ? Number(body.amount) : undefined
    if (!account_id) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

    // Try to read reserved_amount if column exists
    let amount = 0
    let canUseReserved = false
    try {
      const { data: hasCol } = await (supabaseAdmin as any).rpc('check_column_exists', { p_table: 'accounts', p_column: 'reserved_amount' })
      canUseReserved = Boolean(hasCol)
    } catch {}

    if (overrideAmount !== undefined && isFinite(overrideAmount) && overrideAmount > 0) {
      amount = overrideAmount
    } else if (canUseReserved) {
      const { data: acct } = await supabaseAdmin
        .from('accounts')
        .select('id, balance, reserved_amount')
        .eq('id', account_id)
        .maybeSingle()
      amount = Number((acct as any)?.reserved_amount || 0)
    } else {
      // Fallback: read latest metadata preference
      const { data: pref } = await supabaseAdmin
        .from('transactions')
        .select('id, metadata')
        .eq('account_id', account_id)
        .eq('type', 'COMMISSION')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const m = (pref?.metadata || {}) as any
      amount = Number(m?.monthly_payout_preference || 0)
    }

    amount = Number(amount || 0)
    if (!isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'No amount to finalize' }, { status: 400 })
    }

    // Post commission and update account
    const nowIso = new Date().toISOString()
    const { data: acct2 } = await supabaseAdmin
      .from('accounts')
      .select('id, balance')
      .eq('id', account_id)
      .maybeSingle()

    const newBal = Number(acct2?.balance || 0) + amount

    const ins = supabaseAdmin.from('transactions').insert({ account_id, type: 'COMMISSION', amount, status: 'completed', created_at: nowIso })
    const upd = canUseReserved
      ? supabaseAdmin.from('accounts').update({ balance: newBal, reserved_amount: 0 }).eq('id', account_id)
      : supabaseAdmin.from('accounts').update({ balance: newBal }).eq('id', account_id)

    const [insRes, updRes] = await Promise.all([ins, upd])
    if ((insRes as any).error) return NextResponse.json({ error: (insRes as any).error.message }, { status: 500 })
    if ((updRes as any).error) return NextResponse.json({ error: (updRes as any).error.message }, { status: 500 })

    // Optionally tag the metadata preference as finalized to avoid reuse
    if (!canUseReserved) {
      await supabaseAdmin.from('transactions')
        .update({ metadata: { finalized: true } })
        .eq('account_id', account_id)
        .eq('type', 'COMMISSION')
        .order('created_at', { ascending: false })
        .limit(1)
    }

    return NextResponse.json({ ok: true, amount })
  } catch (e) {
    console.error('finalize commission failed', e)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

