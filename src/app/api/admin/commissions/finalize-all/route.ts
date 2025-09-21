import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { finalizeCommissionAtomic } from '@/lib/dataIntegrity'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export const runtime = 'nodejs'

export async function POST() {
  try {
    // Get admin user for audit trail
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (adminProfile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    // Ensure reserved_amount column exists
    let hasCol = false
    try {
      const { data: colCheck } = await supabaseAdmin.rpc('check_column_exists', { p_table: 'accounts', p_column: 'reserved_amount' })
      hasCol = Boolean(colCheck)
    } catch {
      // If check fails, try to add the column
      try {
        await supabaseAdmin.rpc('exec_sql', {
          sql: 'ALTER TABLE accounts ADD COLUMN IF NOT EXISTS reserved_amount NUMERIC(14,2) NOT NULL DEFAULT 0;'
        })
        hasCol = true
      } catch (e) {
        console.log('Could not add reserved_amount column:', e)
      }
    }

    if (!hasCol) {
      return NextResponse.json({ error: 'reserved_amount column missing. Please apply SQL migration before bulk finalize.' }, { status: 400 })
    }

    type AcctRow = { id: string; balance?: number | null; reserved_amount?: number | null; verified_at?: string | null }
    const { data: accts, error } = await supabaseAdmin
      .from('accounts')
      .select('id, balance, reserved_amount, verified_at')
      .gt('reserved_amount', 0)
      .not('verified_at', 'is', null)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const list = (accts || []) as AcctRow[]
    if (!list.length) return NextResponse.json({ ok: true, finalized: 0 })

    let finalized = 0

    for (const a of list) {
      const amount = Number(a.reserved_amount || 0)
      if (!(amount > 0)) continue

      // Use atomic commission finalization for data integrity
      const result = await finalizeCommissionAtomic(a.id, amount, user.id)
      if (result.success) {
        finalized += 1
      } else {
        console.error(`Failed to finalize commission for account ${a.id}:`, result.error)
      }
    }

    return NextResponse.json({ ok: true, finalized })
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}

