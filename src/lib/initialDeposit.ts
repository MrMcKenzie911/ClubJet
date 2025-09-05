import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { calculateSignupFee } from '@/lib/fees'

export async function processInitialDeposit(userId: string) {
  // fetch pending deposit if any
  const { data: pending } = await supabaseAdmin
    .from('pending_deposits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!pending) return

  // create or find account
  const acctType = pending.account_type as 'LENDER'|'NETWORK'
  let { data: acct } = await supabaseAdmin.from('accounts')
    .select('id, balance')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!acct?.id) {
    const minBal = acctType === 'NETWORK' ? 500 : 5000
    const { data: created, error: cErr } = await supabaseAdmin
      .from('accounts')
      .insert({ user_id: userId, type: acctType, balance: 0, minimum_balance: minBal })
      .select('id')
      .maybeSingle()
    if (cErr) throw cErr
    acct = created
  }

  const amount = Number(pending.amount)
  const fees = calculateSignupFee(amount)
  const hasLevel2 = await getHasLevel2(userId)

  // net deposit after fee
  const net = amount - fees.fee

  // credit net to member account and record deposit txn
  await supabaseAdmin.from('accounts').update({ balance: (Number(acct?.balance || 0) + net) }).eq('id', acct!.id)
  await supabaseAdmin.from('transactions').insert({ account_id: acct!.id, type: 'DEPOSIT', amount, status: 'completed', metadata: { fee: fees.fee, net } })

  // record signup fee breakdown
  await supabaseAdmin.from('signup_fees').insert({ user_id: userId, initial_deposit: amount, fee_amount: fees.fee, referrer1_share: fees.ref1, referrer2_share: fees.ref2, slush_fund_share: fees.slush })

  // credit referrers
  const { data: chain } = await supabaseAdmin
    .from('referral_relationships')
    .select('level_1_referrer_id, level_2_referrer_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (chain?.level_1_referrer_id && fees.ref1 > 0) {
    await creditFirstAccount(chain.level_1_referrer_id, fees.ref1, 'COMMISSION')
  }
  if (hasLevel2 && chain?.level_2_referrer_id && fees.ref2 > 0) {
    await creditFirstAccount(chain.level_2_referrer_id, fees.ref2, 'COMMISSION')
  }

  // credit slush fund as transaction record
  await supabaseAdmin.from('slush_fund_transactions').insert({ transaction_type: 'deposit', amount: fees.slush, reference_account_id: acct!.id, description: 'signup_fee' })

  // cleanup pending deposit
  await supabaseAdmin.from('pending_deposits').delete().eq('id', pending.id)
}

async function getHasLevel2(userId: string) {
  const { data: chain } = await supabaseAdmin
    .from('referral_relationships')
    .select('level_2_referrer_id')
    .eq('user_id', userId)
    .maybeSingle()
  return !!chain?.level_2_referrer_id
}

async function creditFirstAccount(ownerId: string, amount: number, type: 'COMMISSION'|'INTEREST') {
  const { data: acct } = await supabaseAdmin
    .from('accounts')
    .select('id, balance')
    .eq('user_id', ownerId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (!acct?.id) return
  await supabaseAdmin.from('accounts').update({ balance: (Number(acct.balance) + amount) }).eq('id', acct.id)
  await supabaseAdmin.from('transactions').insert({ account_id: acct.id, type, amount, status: 'completed' })
}

