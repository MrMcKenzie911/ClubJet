import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function GET() {
  const today = new Date()
  const isTenth = today.getUTCDate() === 10
  if (!isTenth) return NextResponse.json({ message: 'Not 10th' })

  const todayISO = today.toISOString().slice(0,10)
  const { data: withdrawals } = await supabaseAdmin
    .from('withdrawal_requests')
    .select('*, account:account_id(id, user_id, balance)')
    .eq('status', 'approved')
    .lte('scheduled_release_at', todayISO)

  if (!withdrawals) return NextResponse.json({ processed: 0 })

  let processed = 0
  for (const wr of withdrawals) {
    const acct = wr.account
    if (!acct) continue

    const newBal = Number(acct.balance || 0) - Number(wr.amount || 0)
    if (newBal < 0) continue

    await supabaseAdmin.from('accounts').update({ balance: newBal }).eq('id', acct.id)
    await supabaseAdmin.from('transactions').insert({ account_id: acct.id, type: 'WITHDRAWAL', amount: -Number(wr.amount), status: 'completed', metadata: { method: wr.method } })
    await supabaseAdmin.from('withdrawal_requests').update({ status: 'completed', processed_at: new Date().toISOString() }).eq('id', wr.id)
    processed++
  }

  return NextResponse.json({ processed })
}

