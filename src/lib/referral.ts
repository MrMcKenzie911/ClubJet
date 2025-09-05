import { supabaseAdmin } from '@/lib/supabaseAdmin'

export function generateReferralCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)]
  return code
}

export async function ensureUserReferralCode(userId: string): Promise<string> {
  const { data } = await supabaseAdmin.from('profiles').select('referral_code').eq('id', userId).maybeSingle()
  if (data?.referral_code) return data.referral_code
  let tries = 0
  while (tries++ < 5) {
    const code = generateReferralCode()
    const { data: existing } = await supabaseAdmin.from('profiles').select('id').eq('referral_code', code).limit(1)
    if (!existing || existing.length === 0) {
      await supabaseAdmin.from('profiles').update({ referral_code: code }).eq('id', userId)
      return code
    }
  }
  // Last resort
  const fallback = `${Math.random().toString(36).slice(2,6)}${Date.now().toString().slice(-4)}`.toUpperCase()
  await supabaseAdmin.from('profiles').update({ referral_code: fallback }).eq('id', userId)
  return fallback
}

export async function findReferrerIdByCodeOrEmail(args: { code?: string|null, email?: string|null }): Promise<string|null> {
  const { code, email } = args
  if (code) {
    const { data } = await supabaseAdmin.from('profiles').select('id').eq('referral_code', code).maybeSingle()
    if (data?.id) return data.id
  }
  if (email) {
    const { data } = await supabaseAdmin.from('profiles').select('id').eq('email', email).maybeSingle()
    if (data?.id) return data.id
  }
  return null
}

export async function buildReferralChain(newUserId: string, directReferrerId: string|null) {
  if (!directReferrerId) {
    await supabaseAdmin.from('referral_relationships').insert({
      user_id: newUserId,
      level_1_referrer_id: null,
      level_2_referrer_id: null,
      level_3_referrer_id: null,
      level_4_referrer_id: null,
      level_5_referrer_id: null,
    })
    return
  }
  const { data: refChain } = await supabaseAdmin
    .from('referral_relationships')
    .select('*')
    .eq('user_id', directReferrerId)
    .maybeSingle()
  await supabaseAdmin.from('referral_relationships').insert({
    user_id: newUserId,
    level_1_referrer_id: directReferrerId,
    level_2_referrer_id: refChain?.level_1_referrer_id ?? null,
    level_3_referrer_id: refChain?.level_2_referrer_id ?? null,
    level_4_referrer_id: refChain?.level_3_referrer_id ?? null,
    level_5_referrer_id: refChain?.level_4_referrer_id ?? null,
  })
}

