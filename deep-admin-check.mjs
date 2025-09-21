#!/usr/bin/env node

// Deep diagnostic for admin accounts - find Auth users by email directly
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SERVICE_KEY')
  process.exit(1)
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY)

console.log('🔍 Deep Admin Account Analysis')
console.log('==============================')

async function findAuthUserByEmail(email) {
  // Try multiple approaches to find the auth user
  console.log(`\n🔎 Searching for Auth user: ${email}`)
  
  // Method 1: List all users and search
  try {
    let page = 1
    const perPage = 1000
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
      if (error) {
        console.log(`❌ List users error: ${error.message}`)
        break
      }
      
      const match = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
      if (match) {
        console.log(`✅ Found via list: ${match.id}`)
        return match
      }
      
      if (data.users.length < perPage) break
      page += 1
    }
  } catch (e) {
    console.log(`❌ List search failed: ${e.message}`)
  }
  
  // Method 2: Try to get user by email (if supported)
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserByEmail(email)
    if (!error && data) {
      console.log(`✅ Found via getUserByEmail: ${data.user.id}`)
      return data.user
    }
  } catch (e) {
    // This method might not be available
  }
  
  console.log(`❌ Auth user not found for ${email}`)
  return null
}

async function fixAuthUser(email, pin) {
  console.log(`\n🔧 Attempting to fix Auth user for: ${email}`)
  
  // Get profile first
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('id, email, role, pin_code')
    .eq('email', email)
    .maybeSingle()
  
  if (profileErr || !profile) {
    console.log(`❌ Profile not found`)
    return false
  }
  
  // Try to find existing auth user
  let authUser = await findAuthUserByEmail(email)
  
  if (authUser) {
    console.log(`✅ Auth user exists: ${authUser.id}`)
    
    // Check if profile ID matches auth user ID
    if (profile.id !== authUser.id) {
      console.log(`⚠️  Profile ID mismatch: profile=${profile.id}, auth=${authUser.id}`)
      
      // Update profile to match auth user ID
      const { error: updateErr } = await supabaseAdmin
        .from('profiles')
        .update({ id: authUser.id, updated_at: new Date().toISOString() })
        .eq('email', email)
      
      if (updateErr) {
        console.log(`❌ Failed to update profile ID: ${updateErr.message}`)
      } else {
        console.log(`✅ Profile ID updated to match Auth user`)
      }
    }
    
    // Update auth password to match PIN
    const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
      password: pin
    })
    
    if (pwErr) {
      console.log(`❌ Failed to update password: ${pwErr.message}`)
      return false
    } else {
      console.log(`✅ Password updated to: ${pin}`)
    }
    
    return true
  } else {
    console.log(`❌ No Auth user found - cannot fix`)
    return false
  }
}

async function main() {
  try {
    console.log('\n🎯 Deep analysis of admin accounts...')
    
    // Check richard.nuffer@live.com
    const richard = await fixAuthUser('richard.nuffer@live.com', '5629')
    
    // Check rnuffer@live.com - set PIN first if needed
    const { data: rnufferProfile } = await supabaseAdmin
      .from('profiles')
      .select('pin_code')
      .eq('email', 'rnuffer@live.com')
      .maybeSingle()
    
    if (rnufferProfile && !rnufferProfile.pin_code) {
      console.log(`\n🔨 Setting PIN for rnuffer@live.com...`)
      await supabaseAdmin
        .from('profiles')
        .update({ pin_code: '1234', updated_at: new Date().toISOString() })
        .eq('email', 'rnuffer@live.com')
      console.log(`✅ PIN set to 1234`)
    }
    
    const rnuffer = await fixAuthUser('rnuffer@live.com', '1234')
    
    console.log('\n📊 Final Results:')
    console.log(`richard.nuffer@live.com: ${richard ? '✅ FIXED - PIN: 5629' : '❌ FAILED'}`)
    console.log(`rnuffer@live.com: ${rnuffer ? '✅ FIXED - PIN: 1234' : '❌ FAILED'}`)
    
    if (richard && rnuffer) {
      console.log('\n🎉 SUCCESS! Both admin accounts should now work!')
      console.log('\n🔐 Test these login credentials:')
      console.log('   Email: richard.nuffer@live.com, PIN: 5629')
      console.log('   Email: rnuffer@live.com, PIN: 1234')
    }
    
  } catch (e) {
    console.error('💥 Analysis failed:', e.message)
    process.exit(1)
  }
}

main()
