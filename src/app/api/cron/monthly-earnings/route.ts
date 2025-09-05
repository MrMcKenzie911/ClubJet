import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { calculateVariableCommission, calculateFixedCommission, getFixedRate } from '@/lib/commissions'
import { creditSystemAccount, creditSlushFund } from '@/lib/system'

export const runtime = 'nodejs'

export async function GET() {
  // In real deployments, you'd guard via a CRON_SECRET
  const today = new Date()
  const monthDate = new Date(today.getFullYear(), today.getMonth(), 1)

  // Fetch a gross rate (fallback 3%)
  const grossRate = 3.0

  const { data: accounts } = await supabaseAdmin.from('accounts').select('*').eq('is_active', true)
  if (!accounts) return NextResponse.json({ processed: 0 })

  let processed = 0
  for (const acct of accounts) {
    const balance = Number(acct.balance || 0)
    if (balance <= 0) continue

    const isVariable = String(acct.type).toUpperCase() === 'NETWORK' || String(acct.account_type || '').toUpperCase() === 'VARIABLE'
    const isInLockup = acct.lockup_end_date ? new Date(acct.lockup_end_date) > today : false

    const { data: chain } = await supabaseAdmin
      .from('referral_relationships')
      .select('level_1_referrer_id, level_2_referrer_id')
      .eq('user_id', acct.user_id)
      .maybeSingle()

    if (isVariable) {
      if (isInLockup) {
        // Variable lockup: 0.66% to member only
        const member = balance * 0.0066
        await creditMember(acct.id, member)
        await recordDistribution(acct.id, grossRate, { member, ref1: 0, ref2: 0, slush: 0, jared: 0, ross: 0, bne: 0, total: member }, monthDate)
      } else {
        const hasLevel2 = !!chain?.level_2_referrer_id
        const dist = calculateVariableCommission(balance, grossRate, hasLevel2)
        // Enforce minimum 0.5% for member after lockup using slush top-up
        const minMember = balance * 0.005
        if (dist.member < minMember) {
          const topup = minMember - dist.member
          dist.member = minMember
          dist.total = dist.total + topup
          // Record slush payout for top-up
          await creditMember(acct.id, topup)
          await import('@/lib/system').then(m => m.slushRecord('payout', topup, 'min_topup_payout', acct.id))
        }
        await distribute(acct.id, dist, chain)
        await recordDistribution(acct.id, grossRate, dist, monthDate)
      }
    } else {
      // Fixed: pay member fixed rate first by initial_balance tier; then split remainder 6 ways
      const initial = Number(acct.initial_balance || balance)
      const hasLevel2 = !!chain?.level_2_referrer_id
      const dist = calculateFixedCommission(balance, initial, grossRate, hasLevel2)
      await distribute(acct.id, dist, chain)
      await recordDistribution(acct.id, grossRate, dist, monthDate)
    }

    processed++
  }

  return NextResponse.json({ processed })
}

async function creditMember(accountId: string, amount: number) {
  await supabaseAdmin.rpc('increment_balance', { account_id: accountId, amount })
  await supabaseAdmin.from('transactions').insert({ account_id: accountId, type: 'INTEREST', amount, status: 'completed' })
}

type Dist = { member: number; ref1: number; ref2: number; slush: number; jared: number; ross: number; bne: number; total: number }

async function distribute(accountId: string, dist: Dist, chain: { level_1_referrer_id?: string|null, level_2_referrer_id?: string|null } | null) {
  // Credit member
  await supabaseAdmin.rpc('increment_balance', { account_id: accountId, amount: dist.member })
  await supabaseAdmin.from('transactions').insert({ account_id: accountId, type: 'INTEREST', amount: dist.member, status: 'completed' })

  // Credit referrers
  if (chain?.level_1_referrer_id && dist.ref1 > 0) {
    await creditFirstAccount(chain.level_1_referrer_id, dist.ref1)
  }
  if (chain?.level_2_referrer_id && dist.ref2 > 0) {
    await creditFirstAccount(chain.level_2_referrer_id, dist.ref2)
  }

  // Credit system accounts
  await creditSystemAccount('JARED', dist.jared)
  await creditSystemAccount('ROSS', dist.ross)
  await creditSystemAccount('BNE', dist.bne)
  await creditSlushFund(dist.slush, 'monthly_distribution', accountId)
}

async function creditFirstAccount(ownerId: string, amount: number) {
  const { data: acct } = await supabaseAdmin
    .from('accounts')
    .select('id')
    .eq('user_id', ownerId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (!acct?.id) return
  await supabaseAdmin.rpc('increment_balance', { account_id: acct.id, amount })
  await supabaseAdmin.from('transactions').insert({ account_id: acct.id, type: 'COMMISSION', amount, status: 'completed' })
}

async function recordDistribution(accountId: string, grossRate: number, dist: Dist, monthDate: Date) {
  await supabaseAdmin.from('commission_distributions').insert({
    account_id: accountId,
    gross_rate: grossRate,
    gross_amount: dist.total,
    member_share: dist.member,
    referrer1_share: dist.ref1,
    referrer2_share: dist.ref2,
    slush_share: dist.slush,
    jared_share: dist.jared,
    ross_share: dist.ross,
    bne_share: dist.bne,
    calculation_month: new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).toISOString().slice(0,10)
  })
}

