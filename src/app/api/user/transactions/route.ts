import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const supa = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const type = searchParams.get('type')
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 100)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)

  // Fetch user account ids
  const { data: accounts } = await supa
    .from('accounts')
    .select('id')
    .eq('user_id', user.id)

  const ids = (accounts ?? []).map(a => a.id)
  if (ids.length === 0) return NextResponse.json({ items: [], total: 0 })

  let query = supa
    .from('transactions')
    .select('*', { count: 'exact' })
    .in('account_id', ids)

  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)
  if (type) query = query.eq('type', type)

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)
  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ items: data ?? [], total: count ?? 0 })
}

