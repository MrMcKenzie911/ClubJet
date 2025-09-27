import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { creditSystemAccount } from '@/lib/system'

export const runtime = 'nodejs'

// POST /api/admin/commissions/distribute-system
// Body: { account_id?: string, jared?: number, ross?: number, bne?: number }
// Credits system accounts immediately using current resolved owner mapping (env ID -> env email -> fallback email)
export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (adminProfile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const bodyUnknown = await req.json().catch(() => ({})) as unknown
    const body = (bodyUnknown && typeof bodyUnknown === 'object') ? bodyUnknown as { account_id?: string; jared?: number; ross?: number; bne?: number } : {}

    const jared = Number(body.jared || 0)
    const ross = Number(body.ross || 0)
    const bne = Number(body.bne || 0)

    if (!(jared > 0) && !(ross > 0) && !(bne > 0)) {
      return NextResponse.json({ error: 'No positive amounts provided' }, { status: 400 })
    }

    const credited = { jared: 0, ross: 0, bne: 0 }

    if (jared > 0) { await creditSystemAccount('JARED', jared); credited.jared = jared }
    if (ross > 0) { await creditSystemAccount('ROSS', ross); credited.ross = ross }
    if (bne > 0) { await creditSystemAccount('BNE', bne); credited.bne = bne }

    try { /* do not revalidate paths here; balances are on separate accounts */ } catch {}

    return NextResponse.json({ ok: true, credited })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

