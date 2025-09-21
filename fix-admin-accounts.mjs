#!/usr/bin/env node

// Fix admin accounts by creating missing Auth users and setting PINs
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

console.log('🔧 Admin Account Repair Tool')
console.log('============================')

async function fixAdminAccount(email, defaultPin = null) {
  console.log(`\n🛠️  Fixing: ${email}`)
  
  try {
    // 1. Get the profile
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role, pin_code, approval_status')
      .eq('email', email)
      .maybeSingle()
    
    if (profileErr || !profile) {
      console.log(`❌ Profile not found: ${profileErr?.message || 'No profile'}`)
      return false
    }
    
    console.log(`✅ Profile found: ${profile.id}`)
    
    // 2. Check if Auth user exists
    const { data: authUsers, error: authErr } = await supabaseAdmin.auth.admin.listUsers()
    if (authErr) {
      console.log(`❌ Auth list error: ${authErr.message}`)
      return false
    }
    
    let authUser = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    
    // 3. Create Auth user if missing
    if (!authUser) {
      console.log(`🔨 Creating missing Auth user...`)
      
      const pin = profile.pin_code || defaultPin
      if (!pin) {
        console.log(`❌ No PIN available to create Auth user`)
        return false
      }
      
      const { data: createResult, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: pin,
        email_confirm: true,
        user_metadata: {
          email: email
        }
      })
      
      if (createErr) {
        console.log(`❌ Failed to create Auth user: ${createErr.message}`)
        return false
      }
      
      authUser = createResult.user
      console.log(`✅ Auth user created: ${authUser.id}`)
      
      // Update profile to link to the new auth user ID
      const { error: updateErr } = await supabaseAdmin
        .from('profiles')
        .update({ id: authUser.id, updated_at: new Date().toISOString() })
        .eq('id', profile.id)
      
      if (updateErr) {
        console.log(`⚠️  Warning: Could not update profile ID: ${updateErr.message}`)
      } else {
        console.log(`✅ Profile ID updated to match Auth user`)
      }
    } else {
      console.log(`✅ Auth user already exists: ${authUser.id}`)
    }
    
    // 4. Set PIN if missing
    if (!profile.pin_code && defaultPin) {
      console.log(`🔨 Setting default PIN: ${defaultPin}`)
      
      const { error: pinErr } = await supabaseAdmin
        .from('profiles')
        .update({ pin_code: defaultPin, updated_at: new Date().toISOString() })
        .eq('email', email)
      
      if (pinErr) {
        console.log(`❌ Failed to set PIN: ${pinErr.message}`)
        return false
      }
      
      console.log(`✅ PIN set in profile`)
      
      // Also update Auth password
      const { error: authPinErr } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password: defaultPin
      })
      
      if (authPinErr) {
        console.log(`❌ Failed to set Auth password: ${authPinErr.message}`)
        return false
      }
      
      console.log(`✅ Auth password set`)
    }
    
    // 5. Sync Auth password to PIN if both exist
    if (profile.pin_code) {
      console.log(`🔄 Syncing Auth password to PIN: ${profile.pin_code}`)
      
      const { error: syncErr } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password: profile.pin_code
      })
      
      if (syncErr) {
        console.log(`❌ Failed to sync password: ${syncErr.message}`)
        return false
      }
      
      console.log(`✅ Auth password synced`)
    }
    
    console.log(`🎉 ${email} is now ready for login!`)
    return true
    
  } catch (e) {
    console.log(`💥 Exception fixing ${email}: ${e.message}`)
    return false
  }
}

async function main() {
  try {
    console.log('\n🎯 Fixing both admin accounts...')
    
    // Fix richard.nuffer@live.com (has PIN 5629)
    const richard = await fixAdminAccount('richard.nuffer@live.com')
    
    // Fix rnuffer@live.com (needs default PIN)
    const rnuffer = await fixAdminAccount('rnuffer@live.com', '1234')
    
    console.log('\n📊 Final Summary:')
    console.log(`richard.nuffer@live.com: ${richard ? '✅ FIXED - Login with PIN 5629' : '❌ FAILED'}`)
    console.log(`rnuffer@live.com: ${rnuffer ? '✅ FIXED - Login with PIN 1234' : '❌ FAILED'}`)
    
    if (richard && rnuffer) {
      console.log('\n🎉 SUCCESS! Both admin accounts are now functional!')
      console.log('🔐 Login credentials:')
      console.log('   richard.nuffer@live.com → PIN: 5629')
      console.log('   rnuffer@live.com → PIN: 1234')
    } else {
      console.log('\n⚠️  Some repairs failed. Check the details above.')
    }
    
  } catch (e) {
    console.error('💥 Repair failed:', e.message)
    process.exit(1)
  }
}

main()
