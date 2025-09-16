import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

// POST /api/admin/accounts/update
// Body: { account_id: string, balance?: number, monthly_payout?: number }
export async function POST(req: Request) {
  try {
    const bodyUnknown = await req.json().catch(() => ({})) as unknown
    const body = (bodyUnknown && typeof bodyUnknown === 'object') ? bodyUnknown as Record<string, unknown> : {}
    const account_id = String(body.account_id ?? '')
    if (!account_id) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

    const patch: Record<string, unknown> = {}
    if (body.balance !== undefined) patch.balance = Number(body.balance)
    if (body.monthly_payout !== undefined) patch.reserved_amount = Number(body.monthly_payout)

    if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'nothing to update' }, { status: 400 })

    const { error } = await supabaseAdmin.from('accounts').update(patch).eq('id', account_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

