import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const supa = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: me } = await supa.from('profiles').select('role').eq('id', user.id).single()
    if (me?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: profiles, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, email, role, created_at')
      .order('created_at', { ascending: false })
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

    const { data: accounts, error: aErr } = await supabaseAdmin
      .from('accounts')
      .select('id, user_id, type, balance')
    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 })

    type AccountRow = { id: string; user_id: string; type: string; balance: number }
    const byUser: Record<string, AccountRow[]> = {}
    for (const a of (accounts ?? []) as AccountRow[]) {
      const uid = a.user_id
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

