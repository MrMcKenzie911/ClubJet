import { supabaseAdmin } from './supabaseAdmin'

async function resolveSystemOwnerId(kind: 'JARED'|'ROSS'|'BNE'): Promise<string|null> {
  // 1) Prefer explicit owner ID envs
  const envId = kind === 'JARED' ? process.env.SYSTEM_ACCOUNT_JARED
    : kind === 'ROSS' ? process.env.SYSTEM_ACCOUNT_ROSS
    : process.env.SYSTEM_ACCOUNT_BNE
  if (envId) return envId
  // 2) Fallback to email-based lookup (env or default emails provided by CEO)
  const envEmail = kind === 'JARED' ? process.env.SYSTEM_EMAIL_JARED
    : kind === 'ROSS' ? process.env.SYSTEM_EMAIL_ROSS
    : process.env.SYSTEM_EMAIL_BNE
  const fallbackEmail = kind === 'JARED' ? 'jaredadmin@clubaureus.com'
    : kind === 'ROSS' ? 'rossadmin@clubaureus.com'
    : 'bnefund@clubaureus.com'
  const email = envEmail || fallbackEmail
  try {
    const { data: prof } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()
    return (prof as { id?: string } | null)?.id ?? null
  } catch {
    return null
  }
}

export async function creditSystemAccount(kind: 'JARED'|'ROSS'|'BNE', amount: number) {
  if (!amount || amount <= 0) return
  const ownerId = await resolveSystemOwnerId(kind)
  if (!ownerId) return
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

