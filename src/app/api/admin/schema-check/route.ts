import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

// Returns a JSON report of required tables/columns existence per upgrade Step 1
export async function GET() {
  const checks: Record<string, boolean | string> = {}
  const errors: string[] = []

  async function hasColumn(table: string, column: string) {
    const { data, error } = await supabaseAdmin.rpc('check_column_exists', { p_table: table, p_column: column })
    if (error) return false
    return Boolean(data)
  }

  // Fallback without RPC: try selecting 0 rows
  async function trySelect<T extends string>(table: T, columns = '*') {
    const { error } = await supabaseAdmin.from(table as unknown as string).select(columns).limit(0)
    return !error
  }

  // profiles columns
  checks['profiles.referrer_id'] = await hasColumn('profiles','referrer_id') || await trySelect('profiles','referrer_id')
  checks['profiles.referral_code'] = await hasColumn('profiles','referral_code') || await trySelect('profiles','referral_code')
  checks['profiles.referral_level'] = await hasColumn('profiles','referral_level') || await trySelect('profiles','referral_level')
  checks['profiles.is_founding_member'] = await hasColumn('profiles','is_founding_member') || await trySelect('profiles','is_founding_member')
  checks['profiles.approval_status'] = await hasColumn('profiles','approval_status') || await trySelect('profiles','approval_status')

  // referral_relationships table
  checks['referral_relationships.table'] = await trySelect('referral_relationships')

  // signup_fees table
  checks['signup_fees.table'] = await trySelect('signup_fees')

  // commission_distributions table
  checks['commission_distributions.table'] = await trySelect('commission_distributions')

  // slush_fund_transactions table
  checks['slush_fund_transactions.table'] = await trySelect('slush_fund_transactions')

  // accounts columns
  checks['accounts.lockup_end_date'] = await trySelect('accounts','lockup_end_date')
  checks['accounts.reserved_amount'] = await trySelect('accounts','reserved_amount')

  for (const [k,v] of Object.entries(checks)) {
    if (!v) errors.push(k)
  }

  return NextResponse.json({ ok: errors.length === 0, missing: errors, checks })
}

