import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

async function ensureAdmin(req: Request) {
  const res = await fetch(new URL('/api/admin/guard', req.url), { cache: 'no-store' })
  return res.ok
}

export async function GET(req: Request) {
  try {
    if (!(await ensureAdmin(req))) return NextResponse.redirect(new URL('/login', req.url))

    const { data: profiles, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, email, role, created_at')
      .order('created_at', { ascending: false })
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

    const { data: accounts, error: aErr } = await supabaseAdmin
      .from('accounts')
      .select('id, user_id, type, balance')
    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 })

    const byUser: Record<string, any[]> = {}
    for (const a of accounts ?? []) {
      const uid = (a as any).user_id as string
      if (!byUser[uid]) byUser[uid] = []
      byUser[uid].push(a)
    }

    const result = (profiles ?? []).map((p) => ({ ...p, accounts: byUser[p.id] ?? [] }))
    return NextResponse.json({ users: result })
  } catch (e) {
    console.error('GET /api/admin/users/list failed', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

