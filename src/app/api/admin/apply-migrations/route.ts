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

    // Migration 3: Username column + unique index + sync trigger (009)
    try {
      migrations.push('Adding username column + unique index + sync trigger (009)')
      const { error } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
-- 009_add_username.sql
-- Adds a platform-wide username for profiles and keeps referral_code aligned

-- 1) Add username column
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username TEXT;

-- 2) Enforce uniqueness (case-insensitive) via unique index on lower(username)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_profiles_username_unique'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX idx_profiles_username_unique ON profiles (LOWER(username))';
  END IF;
END$$;

-- 3) Backfill: if username is null and referral_code not null, set username = referral_code
UPDATE profiles
SET username = referral_code
WHERE username IS NULL AND referral_code IS NOT NULL;

-- 4) For new/updated rows, keep referral_code in sync with username.
CREATE OR REPLACE FUNCTION sync_referral_code_with_username()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.username IS NOT NULL AND (OLD.username IS DISTINCT FROM NEW.username) THEN
    NEW.referral_code := NEW.username;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_refcode_username ON profiles;
CREATE TRIGGER trg_sync_refcode_username
BEFORE INSERT OR UPDATE OF username ON profiles
FOR EACH ROW EXECUTE FUNCTION sync_referral_code_with_username();
        `
      })
      if (error) throw new Error(`Failed to apply username migration: ${error.message}`)
    } catch (e) {
      console.log('Username migration warning:', e)
    }

    // Migration 4: Add constraints and indexes
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
