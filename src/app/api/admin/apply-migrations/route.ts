import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export const runtime = 'nodejs'

// POST /api/admin/apply-migrations
// Applies critical database migrations for missing columns
export async function POST() {
  try {
    // Verify admin access
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (adminProfile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const migrations = []

    // Migration 1: Add missing columns to profiles table
    try {
      await supabaseAdmin.from('profiles').select('pin_code').limit(1).maybeSingle()
    } catch {
      migrations.push('Adding pin_code column to profiles')
      const { error } = await supabaseAdmin.rpc('exec_sql', { 
        sql: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin_code TEXT;'
      })
      if (error) throw new Error(`Failed to add pin_code: ${error.message}`)
    }

    try {
      await supabaseAdmin.from('profiles').select('account_type').limit(1).maybeSingle()
    } catch {
      migrations.push('Adding account_type column to profiles')
      const { error } = await supabaseAdmin.rpc('exec_sql', { 
        sql: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type TEXT;'
      })
      if (error) throw new Error(`Failed to add account_type: ${error.message}`)
    }

    try {
      await supabaseAdmin.from('profiles').select('investment_amount').limit(1).maybeSingle()
    } catch {
      migrations.push('Adding investment_amount column to profiles')
      const { error } = await supabaseAdmin.rpc('exec_sql', { 
        sql: 'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS investment_amount NUMERIC(14,2);'
      })
      if (error) throw new Error(`Failed to add investment_amount: ${error.message}`)
    }

    // Migration 2: Add missing columns to accounts table
    try {
      await supabaseAdmin.from('accounts').select('reserved_amount').limit(1).maybeSingle()
    } catch {
      migrations.push('Adding reserved_amount column to accounts')
      const { error } = await supabaseAdmin.rpc('exec_sql', { 
        sql: 'ALTER TABLE accounts ADD COLUMN IF NOT EXISTS reserved_amount NUMERIC(14,2) NOT NULL DEFAULT 0;'
      })
      if (error) throw new Error(`Failed to add reserved_amount: ${error.message}`)
    }

    // Migration 3: Add constraints and indexes
    try {
      migrations.push('Adding constraints and indexes')
      const { error } = await supabaseAdmin.rpc('exec_sql', { 
        sql: `
          ALTER TABLE profiles ADD CONSTRAINT IF NOT EXISTS profiles_account_type_check 
          CHECK (account_type IS NULL OR account_type IN ('LENDER', 'NETWORK'));
          
          CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON profiles(account_type);
          CREATE INDEX IF NOT EXISTS idx_profiles_pin_code ON profiles(pin_code);
        `
      })
      if (error) console.log('Constraint/index creation warning:', error.message)
    } catch (e) {
      console.log('Non-critical constraint/index error:', e)
    }

    return NextResponse.json({
      success: true,
      migrations,
      message: migrations.length > 0 
        ? `Applied ${migrations.length} migrations successfully`
        : 'All migrations already applied'
    })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error'
    console.error('Migration failed:', e)
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: errorMessage
    }, { status: 500 })
  }
}
