import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { finalizeCommissionAtomic } from '@/lib/dataIntegrity'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    // Get admin user for audit trail
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (adminProfile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const parsed = await req.json().catch(() => ({})) as unknown
    const body = (parsed && typeof parsed === 'object') ? parsed as { account_id?: string; amount?: number } : {}
    const account_id = String(body.account_id || '')
    const overrideAmount = typeof body.amount === 'number' ? Number(body.amount) : undefined
    if (!account_id) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

    // Try to read reserved_amount if column exists
    let amount = 0
    let canUseReserved = false
    try {
      const { data: hasCol } = await supabaseAdmin.rpc('check_column_exists', { p_table: 'accounts', p_column: 'reserved_amount' })
      canUseReserved = Boolean(hasCol)
    } catch {}

    if (overrideAmount !== undefined && isFinite(overrideAmount) && overrideAmount > 0) {
      amount = overrideAmount
    } else if (canUseReserved) {
      type AcctRow = { id: string; balance?: number | null; reserved_amount?: number | null }
      const { data: acct } = await supabaseAdmin
        .from('accounts')
        .select('id, balance, reserved_amount')
        .eq('id', account_id)
        .maybeSingle()
      amount = Number((acct as AcctRow | null)?.reserved_amount || 0)
    } else {
      // Fallback: read latest metadata preference
      type PrefRow = { id: string; metadata: Record<string, unknown> | null }
      const { data: pref } = await supabaseAdmin
        .from('transactions')
        .select('id, metadata')
        .eq('account_id', account_id)
        .eq('type', 'COMMISSION')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle<PrefRow>()
      const m = (pref?.metadata || {}) as Record<string, unknown>
      const raw = m?.monthly_payout_preference as unknown
      amount = typeof raw === 'number' ? raw : Number(raw || 0)
    }

    amount = Number(amount || 0)
    if (!isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'No amount to finalize' }, { status: 400 })
    }

    // Use atomic commission finalization for data integrity
    const result = await finalizeCommissionAtomic(account_id, amount, user.id)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Clear reserved amount if using reserved system
    if (canUseReserved) {
      await supabaseAdmin.from('accounts').update({ reserved_amount: 0 }).eq('id', account_id)
    } else {
      // Tag the metadata preference as finalized to avoid reuse
      await supabaseAdmin.from('transactions')
        .update({ metadata: { finalized: true } })
        .eq('account_id', account_id)
        .eq('type', 'COMMISSION')
        .order('created_at', { ascending: false })
        .limit(1)
    }

    return NextResponse.json({
      ok: true,
      amount,
      oldBalance: result.oldBalance,
      newBalance: result.newBalance,
      transactionId: result.transactionId
    })
  } catch (e) {
    console.error('finalize commission failed', e)
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

