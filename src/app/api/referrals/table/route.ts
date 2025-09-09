import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

export const runtime = 'nodejs'

// GET /api/referrals/table?userId=...  -> returns flat rows + analytics
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId') || ''
  if (!userId) return NextResponse.json({ rows: [], analytics: { l1: 0, l2: 0, totalBonus: 0, avgInvestment: 0 } })

  // Level 1 referrals
  const { data: level1 } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name, created_at, role')
    .eq('referrer_id', userId)

  const l1Ids = (level1 || []).map(u => u.id)
  const { data: level2 } = l1Ids.length ? await supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name, created_at, role, referrer_id')
    .in('referrer_id', l1Ids) : { data: [] as any[] }

  const all = [
    ...(level1 || []).map(u => ({ ...u, level: 1, parent: userId })),
    ...(level2 || []).map(u => ({ ...u, level: 2, parent: u.referrer_id })),
  ]

  // For each referral, read first account for stream type & investment (balance)
  const rows: any[] = []
  for (const u of all) {
    const { data: acct } = await supabaseAdmin
      .from('accounts')
      .select('type, balance, start_date, verified_at')
      .eq('user_id', u.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    const streamType = acct?.type === 'NETWORK' ? 'Network Stream' : 'Lender Stream'
    const investment = Number(acct?.balance ?? 0)
    const status = (u.role === 'pending' ? 'Pending' : (acct?.verified_at ? 'Active' : 'Active'))

    // Bonus rules (example based on your samples):
    // Level 1: $25, Level 2: $25, Level >=3 (not loaded yet) would be $16.67
    const bonus = u.level === 1 || u.level === 2 ? 25 : 16.67

    rows.push({
      id: u.id,
      name: `${u.first_name ?? ''} ${u.last_name ? u.last_name.slice(0,1)+'.' : ''}`.trim(),
      level: `Level ${u.level}`,
      stream: streamType,
      investment,
      joinDate: u.created_at,
      status,
      bonus,
    })
  }

  const l1 = (level1 || []).length
  const l2 = (level2 || []).length
  const totalBonus = rows.reduce((s, r) => s + Number(r.bonus || 0), 0)
  const avgInvestment = rows.length ? Math.round(rows.reduce((s, r) => s + Number(r.investment || 0), 0) / rows.length) : 0

  return NextResponse.json({ rows, analytics: { l1, l2, totalBonus, avgInvestment } })
}

