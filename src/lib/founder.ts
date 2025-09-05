import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Override rates as decimals of member interest amount
export const FOUNDER_OVERRIDE_RATES = {
  3: 0.0010, // 0.10%
  4: 0.0007, // 0.07%
  5: 0.0005, // 0.05%
} as const

export type Level = 3|4|5

export async function isFoundingMember(profileId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from('profiles').select('is_founding_member').eq('id', profileId).maybeSingle()
  return !!data?.is_founding_member
}

export async function getFounderForUser(userId: string): Promise<string|null> {
  // Founder is the top-most ancestor that has is_founding_member=true, up to 5 levels
  const { data: rel } = await supabaseAdmin
    .from('referral_relationships')
    .select('level_1_referrer_id, level_2_referrer_id, level_3_referrer_id, level_4_referrer_id, level_5_referrer_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (!rel) return null
  const levels: (string|null|undefined)[] = [rel.level_1_referrer_id, rel.level_2_referrer_id, rel.level_3_referrer_id, rel.level_4_referrer_id, rel.level_5_referrer_id]
  for (const id of levels) {
    if (!id) continue
    if (await isFoundingMember(id)) return id
  }
  return null
}

export async function computeFounderOverridesForAccount(account: { id: string, user_id: string }, memberInterestAmount: number, calcMonthISO: string) {
  // Find founding member in the user chain
  const founderId = await getFounderForUser(account.user_id)
  if (!founderId) return

  // Figure out at which level the founder is relative to this user
  const { data: rel } = await supabaseAdmin
    .from('referral_relationships')
    .select('level_1_referrer_id, level_2_referrer_id, level_3_referrer_id, level_4_referrer_id, level_5_referrer_id')
    .eq('user_id', account.user_id)
    .maybeSingle()
  if (!rel) return

  const idsByLevel: Record<Level, string|null|undefined> = { 3: rel.level_3_referrer_id, 4: rel.level_4_referrer_id, 5: rel.level_5_referrer_id }
  let founderLevel: Level | null = null
  ;(Object.keys(idsByLevel) as unknown as Level[]).forEach((lvl) => {
    if (idsByLevel[lvl] === founderId) founderLevel = lvl
  })
  if (!founderLevel) return

  const rate = FOUNDER_OVERRIDE_RATES[founderLevel]
  const override = +(memberInterestAmount * rate).toFixed(2)
  if (override <= 0) return

  // Record payout row
  await supabaseAdmin.from('founder_override_payouts').upsert({
    founder_id: founderId,
    user_id: account.user_id,
    account_id: account.id,
    level: founderLevel,
    member_interest_amount: memberInterestAmount,
    override_rate: rate,
    override_amount: override,
    calculation_month: calcMonthISO
  }, { onConflict: 'founder_id,account_id,calculation_month,level' })

  // Credit founder’s first account
  const { data: acct } = await supabaseAdmin
    .from('accounts')
    .select('id')
    .eq('user_id', founderId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (acct?.id) {
    await supabaseAdmin.rpc('increment_balance', { account_id: acct.id, amount: override })
    await supabaseAdmin.from('transactions').insert({ account_id: acct.id, type: 'COMMISSION', amount: override, status: 'completed', metadata: { founder_level: founderLevel, source_account: account.id } })
  }
}

