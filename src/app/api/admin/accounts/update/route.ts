import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { adminUpdateBalance } from '@/lib/dataIntegrity'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export const runtime = 'nodejs'

// POST /api/admin/accounts/update
// Body: { account_id: string, balance?: number, monthly_payout?: number }
export async function POST(req: Request) {
  try {
    // Get admin user for audit trail
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (adminProfile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const parsed = await req.json().catch(() => ({})) as unknown
    const body = (parsed && typeof parsed === 'object') ? parsed as Record<string, unknown> : {}
    const account_id = String(body.account_id ?? '')
    if (!account_id) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

    // Handle balance update with full audit trail
    if (body.balance !== undefined) {
      const newBalance = Number(body.balance)
      const reason = String(body.reason || 'Admin balance adjustment')

      const result = await adminUpdateBalance(account_id, newBalance, user.id, reason)

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }
    }

    type Patch = { reserved_amount?: number }
    const patch: Patch = {}

    // Check if reserved_amount column exists in production; gracefully fallback if not
    let canSetReserved = false
    try {
      const { data: hasCol } = await supabaseAdmin.rpc('check_column_exists', { p_table: 'accounts', p_column: 'reserved_amount' })
      canSetReserved = Boolean(hasCol)
    } catch {}

    if (body.monthly_payout !== undefined) {
      const monthlyVal = Number(body.monthly_payout)
      if (canSetReserved) {
        patch.reserved_amount = monthlyVal
      } else {
        // Fallback: store admin preference as a zero-amount COMMISSION metadata record to avoid hard failure
        const nowIso = new Date().toISOString()
        await supabaseAdmin.from('transactions').insert({
          account_id,
          type: 'COMMISSION',
          amount: 0,
          status: 'posted',
          created_at: nowIso,
          metadata: { monthly_payout_preference: monthlyVal }
        })
      }
    }

    if (Object.keys(patch).length > 0) {
      const { error } = await supabaseAdmin.from('accounts').update(patch).eq('id', account_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, warning: canSetReserved ? undefined : "reserved_amount column missing; stored preference via metadata" })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

