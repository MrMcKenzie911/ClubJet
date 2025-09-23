import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supa = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: me } = await supa.from('profiles').select('role').eq('id', user.id).single()
    if (me?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Get all users (admins, approved users, pending, rejected) and include approval_status
    const { data: profiles, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, email, role, created_at, is_founding_member, approval_status')
      .order('created_at', { ascending: false })
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

    type ProfileRow = {
      id: string
      first_name: string | null
      last_name: string | null
      email: string | null
      role: string | null
      created_at: string
      is_founding_member: boolean | null
      approval_status: string | null
    }

    // Get accounts for these users (include both verified and pending)
    const profs = (profiles ?? []) as ProfileRow[]
    const ids: string[] = profs.map((p) => p.id)
    const { data: accounts, error: aErr } = await supabaseAdmin
      .from('accounts')
      .select('id, user_id, type, balance, reserved_amount, verified_at')
      .in('user_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 })

    type AccountRow = { id: string; user_id: string; type: string; balance: number; reserved_amount?: number; verified_at: string | null }
    const byUser: Record<string, AccountRow[]> = {}
    for (const a of (accounts ?? []) as AccountRow[]) {
      const uid = a.user_id
      if (!byUser[uid]) byUser[uid] = []
      byUser[uid].push(a)
    }

    // Return all users; attach accounts (may be empty if none yet)
    const result = profs.map((p) => ({ ...p, accounts: byUser[p.id] ?? [] }))

    console.log(`Returning ${result.length} users (all roles) for user management list`)
    return NextResponse.json({ users: result })
  } catch (e) {
    console.error('GET /api/admin/users/list failed', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

