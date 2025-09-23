import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const requestedUserId = searchParams.get('userId') || ''

  // Auth guard: users can only export their own; admins can export any
  const supa = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })
  const { data: me } = await supa.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const isAdmin = (me?.role === 'admin')

  const userId = isAdmin ? (requestedUserId || user.id) : user.id
  if (!userId) return new NextResponse('userId required', { status: 400 })

  const { data: level1 } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name, created_at, role')
    .eq('referrer_id', userId)

  const l1Ids = (level1 || []).map(u => u.id)
  type ProfileBasic = { id: string; first_name: string|null; last_name: string|null; created_at: string|null; role?: string|null; referrer_id?: string|null }
  const { data: level2 } = l1Ids.length ? await supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name, created_at, role, referrer_id')
    .in('referrer_id', l1Ids) : { data: [] as ProfileBasic[] }

  const all = [
    ...(level1 || []).map(u => ({ ...u, level: 1, parent: userId })),
    ...(level2 || []).map(u => ({ ...u, level: 2, parent: u.referrer_id })),
  ]

  const rows: { name: string; level: number; stream: string; investment: number; joinDate: string; status: string; bonus: number }[] = []
  for (const u of all) {
    const { data: acct } = await supabaseAdmin
      .from('accounts')
      .select('type, balance, start_date, verified_at, initial_balance')
      .eq('user_id', u.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    const streamType = acct?.type === 'NETWORK' ? 'Network Stream' : 'Lender Stream'
    const investment = Number(acct?.initial_balance ?? acct?.balance ?? 0)
    const status = (u.role === 'pending' ? 'Pending' : (acct?.verified_at ? 'Active' : 'Active'))
    const bonus = u.level === 1 || u.level === 2 ? 25 : 16.67
    rows.push({
      name: `${u.first_name ?? ''} ${u.last_name ? u.last_name.slice(0,1)+'.' : ''}`.trim(),
      level: u.level,
      stream: streamType,
      investment,
      joinDate: u.created_at,
      status,
      bonus,
    })
  }

  const header = ['Member Name','Level','Stream Type','Investment','Join Date','Status','Bonuses Earned']
  const lines = [header.join(','), ...rows.map(r => [
    escapeCsv(r.name),
    String(r.level),
    escapeCsv(r.stream),
    String(r.investment),
    r.joinDate ?? '',
    r.status,
    r.bonus.toFixed(2),
  ].join(','))]
  const csv = lines.join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="referrals.csv"',
    }
  })
}

function escapeCsv(v: string) {
  if (v == null) return ''
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return '"' + v.replace(/"/g, '""') + '"'
  }
  return v
}

