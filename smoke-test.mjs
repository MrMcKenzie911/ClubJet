#!/usr/bin/env node

// Smoke test for login routes - check admin accounts and diagnose login failures
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Load .env.local manually (same as other scripts)
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

// Load env from Netlify env vars or process.env
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_KEY. Set env vars.')
  console.error('Expected: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY')
  console.error('Create .env.local with these values or set as environment variables.')
  process.exit(1)
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY)
const supabaseClient = createClient(SUPABASE_URL, ANON_KEY || SERVICE_KEY)

console.log('🔍 Smoke Test: Admin Login Diagnosis')
console.log('=====================================')

async function checkAdminAccount(email) {
  console.log(`\n📧 Checking: ${email}`)
  
  // 1. Check if profile exists
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('id, email, role, pin_code, approval_status, created_at')
    .eq('email', email)
    .maybeSingle()
  
  if (profileErr) {
    console.log(`❌ Profile query error: ${profileErr.message}`)
    return
  }
  
  if (!profile) {
    console.log(`❌ No profile found for ${email}`)
    return
  }
  
  console.log(`✅ Profile found:`)
  console.log(`   ID: ${profile.id}`)
  console.log(`   Role: ${profile.role}`)
  console.log(`   PIN: ${profile.pin_code || 'NOT SET'}`)
  console.log(`   Approval: ${profile.approval_status || 'N/A'}`)
  console.log(`   Created: ${profile.created_at}`)
  
  // 2. Check if auth user exists
  const { data: authUsers, error: authErr } = await supabaseAdmin.auth.admin.listUsers()
  if (authErr) {
    console.log(`❌ Auth list error: ${authErr.message}`)
    return
  }
  
  const authUser = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
  if (!authUser) {
    console.log(`❌ No auth user found for ${email}`)
    return
  }
  
  console.log(`✅ Auth user found: ${authUser.id}`)
  console.log(`   Email confirmed: ${authUser.email_confirmed_at ? 'YES' : 'NO'}`)
  console.log(`   Last sign in: ${authUser.last_sign_in_at || 'NEVER'}`)
  
  // 3. Test PIN login if PIN is set
  if (profile.pin_code) {
    console.log(`\n🔐 Testing PIN login with: ${profile.pin_code}`)
    
    try {
      const { data: signInData, error: signInErr } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: profile.pin_code
      })
      
      if (signInErr) {
        console.log(`❌ PIN login failed: ${signInErr.message}`)
        
        // Try to fix by updating auth password to match PIN
        console.log(`🔧 Attempting to sync auth password to PIN...`)
        const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
          password: profile.pin_code
        })
        
        if (updateErr) {
          console.log(`❌ Failed to update auth password: ${updateErr.message}`)
        } else {
          console.log(`✅ Auth password updated to match PIN`)
          
          // Try login again
          const { data: retryData, error: retryErr } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: profile.pin_code
          })
          
          if (retryErr) {
            console.log(`❌ Retry login still failed: ${retryErr.message}`)
          } else {
            console.log(`✅ Retry login SUCCESS!`)
            // Sign out to clean up
            await supabaseClient.auth.signOut()
          }
        }
      } else {
        console.log(`✅ PIN login SUCCESS!`)
        // Sign out to clean up
        await supabaseClient.auth.signOut()
      }
    } catch (e) {
      console.log(`❌ PIN login exception: ${e.message}`)
    }
  } else {
    console.log(`⚠️  No PIN set - cannot test login`)
  }
}

async function main() {
  try {
    // Test both admin accounts
    await checkAdminAccount('richard.nuffer@live.com')
    await checkAdminAccount('rnuffer@live.com')
    
    console.log('\n🎯 Summary:')
    console.log('- Check if profiles exist with correct role=admin')
    console.log('- Check if PIN codes are set')
    console.log('- Check if auth users exist and are confirmed')
    console.log('- Test actual login with stored PINs')
    console.log('- Auto-fix auth password mismatches')
    
  } catch (e) {
    console.error('💥 Test failed:', e.message)
    process.exit(1)
  }
}

main()
