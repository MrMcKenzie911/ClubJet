import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function creditSystemAccount(kind: 'JARED'|'ROSS'|'BNE', amount: number) {
  const ownerId = kind === 'JARED' ? process.env.SYSTEM_ACCOUNT_JARED
    : kind === 'ROSS' ? process.env.SYSTEM_ACCOUNT_ROSS
    : process.env.SYSTEM_ACCOUNT_BNE
  if (!ownerId || !amount || amount <= 0) return
  const { data: acct } = await supabaseAdmin
    .from('accounts')
    .select('id, balance')
    .eq('user_id', ownerId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (!acct?.id) return
  await supabaseAdmin.from('accounts').update({ balance: Number(acct.balance) + amount }).eq('id', acct.id)
  await supabaseAdmin.from('transactions').insert({ account_id: acct.id, type: 'COMMISSION', amount, status: 'completed', metadata: { system: kind } })
}

export async function slushRecord(transaction_type: 'deposit'|'payout', amount: number, description: string, reference_account_id?: string) {
  if (!amount || amount <= 0) return
  await supabaseAdmin.from('slush_fund_transactions').insert({ transaction_type, amount, reference_account_id, description })
}

export async function creditSlushFund(amount: number, description: string, reference_account_id?: string) {
  return slushRecord('deposit', amount, description, reference_account_id)
}

