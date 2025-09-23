import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function POST() {
  try {
    // Require reserved_amount to exist for bulk finalize
    const { data: hasCol } = await supabaseAdmin.rpc('check_column_exists', { p_table: 'accounts', p_column: 'reserved_amount' })
    if (!hasCol) return NextResponse.json({ error: 'reserved_amount column missing. Please apply SQL migration before bulk finalize.' }, { status: 400 })

    type AcctRow = { id: string; balance?: number | null; reserved_amount?: number | null; verified_at?: string | null }
    const { data: accts, error } = await supabaseAdmin
      .from('accounts')
      .select('id, balance, reserved_amount, verified_at')
      .gt('reserved_amount', 0)
      .not('verified_at', 'is', null)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const list = (accts || []) as AcctRow[]
    if (!list.length) return NextResponse.json({ ok: true, finalized: 0 })

    let finalized = 0
    const nowIso = new Date().toISOString()

    for (const a of list) {
      const amount = Number(a.reserved_amount || 0)
      if (!(amount > 0)) continue
      const newBal = Number(a.balance || 0) + amount

      const { error: insErr } = await supabaseAdmin
        .from('transactions')
        .insert({ account_id: a.id, type: 'COMMISSION', amount, status: 'completed', created_at: nowIso })
      if (insErr) continue
      const { error: updErr } = await supabaseAdmin
        .from('accounts')
        .update({ balance: newBal, reserved_amount: 0 })
        .eq('id', a.id)
      if (updErr) continue
      finalized += 1
    }

    try { revalidatePath('/admin'); revalidatePath('/dashboard') } catch {}
    return NextResponse.json({ ok: true, finalized })
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

