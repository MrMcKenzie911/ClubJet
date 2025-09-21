#!/usr/bin/env node

// Quick check for admin accounts without needing full env setup
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Load .env.local manually
function loadDotEnvLocal() {
  const envPath = '.env.local'
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let val = line.slice(idx + 1)
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

loadDotEnvLocal()

// Use the known project reference to construct URL
const PROJECT_REF = 'chennidpiiqbmbelgnul'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || `https://${PROJECT_REF}.supabase.co`

console.log('🔍 Admin Account Check')
console.log('=====================')
console.log(`Project: ${PROJECT_REF}`)
console.log(`URL: ${SUPABASE_URL}`)

// We need the service key to proceed
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
if (!SERVICE_KEY) {
  console.log('\n❌ Missing SUPABASE_SERVICE_KEY environment variable')
  console.log('\nTo run this check, you need to:')
  console.log('1. Get your Supabase service key from: https://supabase.com/dashboard/project/chennidpiiqbmbelgnul/settings/api')
  console.log('2. Set it as an environment variable:')
  console.log('   Windows: set SUPABASE_SERVICE_KEY=your_service_key_here')
  console.log('   Linux/Mac: export SUPABASE_SERVICE_KEY=your_service_key_here')
  console.log('3. Or create a .env.local file with:')
  console.log('   NEXT_PUBLIC_SUPABASE_URL=https://chennidpiiqbmbelgnul.supabase.co')
  console.log('   SUPABASE_SERVICE_KEY=your_service_key_here')
  console.log('\nThen run: node check-admin-accounts.mjs')
  process.exit(1)
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY)

async function checkAdminAccount(email) {
  console.log(`\n📧 Checking: ${email}`)
  
  try {
    // 1. Check if profile exists
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role, pin_code, approval_status, created_at')
      .eq('email', email)
      .maybeSingle()
    
    if (profileErr) {
      console.log(`❌ Profile query error: ${profileErr.message}`)
      return false
    }
    
    if (!profile) {
      console.log(`❌ No profile found for ${email}`)
      return false
    }
    
    console.log(`✅ Profile found:`)
    console.log(`   ID: ${profile.id}`)
    console.log(`   Role: ${profile.role}`)
    console.log(`   PIN: ${profile.pin_code || 'NOT SET'}`)
    console.log(`   Approval: ${profile.approval_status || 'N/A'}`)
    
    // 2. Check if auth user exists
    const { data: authUsers, error: authErr } = await supabaseAdmin.auth.admin.listUsers()
    if (authErr) {
      console.log(`❌ Auth list error: ${authErr.message}`)
      return false
    }
    
    const authUser = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (!authUser) {
      console.log(`❌ No auth user found for ${email}`)
      return false
    }
    
    console.log(`✅ Auth user found: ${authUser.id}`)
    console.log(`   Email confirmed: ${authUser.email_confirmed_at ? 'YES' : 'NO'}`)
    console.log(`   Last sign in: ${authUser.last_sign_in_at || 'NEVER'}`)
    
    // 3. Check if PIN is set and try to fix auth password
    if (!profile.pin_code) {
      console.log(`⚠️  No PIN set - this will prevent login`)
      return false
    }
    
    // Try to sync auth password to PIN
    console.log(`🔧 Syncing auth password to PIN: ${profile.pin_code}`)
    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
      password: profile.pin_code
    })
    
    if (updateErr) {
      console.log(`❌ Failed to sync auth password: ${updateErr.message}`)
      return false
    } else {
      console.log(`✅ Auth password synced to PIN`)
    }
    
    return true
    
  } catch (e) {
    console.log(`💥 Exception checking ${email}: ${e.message}`)
    return false
  }
}

async function main() {
  try {
    console.log('\n🎯 Checking both admin accounts...')
    
    const richard = await checkAdminAccount('richard.nuffer@live.com')
    const rnuffer = await checkAdminAccount('rnuffer@live.com')
    
    console.log('\n📊 Summary:')
    console.log(`richard.nuffer@live.com: ${richard ? '✅ FIXED' : '❌ ISSUES'}`)
    console.log(`rnuffer@live.com: ${rnuffer ? '✅ FIXED' : '❌ ISSUES'}`)
    
    if (richard && rnuffer) {
      console.log('\n🎉 Both admin accounts should now be able to log in!')
      console.log('Try logging in with their respective PINs.')
    } else {
      console.log('\n⚠️  Some issues remain. Check the details above.')
    }
    
  } catch (e) {
    console.error('💥 Test failed:', e.message)
    process.exit(1)
  }
}

main()
