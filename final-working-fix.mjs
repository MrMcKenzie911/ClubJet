import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

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
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

console.log('🔧 Final Working Fix')
console.log('====================')

async function workingFix() {
  try {
    console.log('\n🎯 Using 6-character passwords (Supabase requirement)...')
    
    // Use 6-character passwords that match the PINs but are valid
    const richardPassword = '562900'  // 5629 + 00 to make it 6 chars
    const rnufferPassword = '123400'  // 1234 + 00 to make it 6 chars
    
    console.log('\n🛠️  Fixing richard.nuffer@live.com...')
    
    // Update auth password (6 chars minimum)
    const { error: richard1 } = await supabase.auth.admin.updateUserById('19d6cbf4-cb39-416c-93db-d5b6f7f957a3', {
      password: richardPassword
    })
    
    if (richard1) {
      console.log(`❌ Richard auth update failed: ${richard1.message}`)
    } else {
      console.log(`✅ Richard auth password set to ${richardPassword}`)
    }
    
    // Update profile to use the 6-char password as PIN
    const { error: richardProfile } = await supabase
      .from('profiles')
      .update({ 
        pin_code: richardPassword,
        role: 'admin',
        approval_status: 'approved',
        updated_at: new Date().toISOString() 
      })
      .eq('id', '19d6cbf4-cb39-416c-93db-d5b6f7f957a3')
    
    if (richardProfile) {
      console.log(`❌ Richard profile update failed: ${richardProfile.message}`)
    } else {
      console.log(`✅ Richard profile updated with PIN ${richardPassword}`)
    }
    
    console.log('\n🛠️  Fixing rnuffer@live.com...')
    
    // Update profile first
    const { error: rnufferProfile } = await supabase
      .from('profiles')
      .update({ 
        pin_code: rnufferPassword,
        role: 'admin',
        approval_status: 'approved',
        updated_at: new Date().toISOString() 
      })
      .eq('id', '754f73ec-c799-4911-93ae-dfd1d9c30c77')
    
    if (rnufferProfile) {
      console.log(`❌ RNuffer profile update failed: ${rnufferProfile.message}`)
    } else {
      console.log(`✅ RNuffer profile updated with PIN ${rnufferPassword}`)
    }
    
    // Update auth password
    const { error: rnuffer1 } = await supabase.auth.admin.updateUserById('754f73ec-c799-4911-93ae-dfd1d9c30c77', {
      password: rnufferPassword
    })
    
    if (rnuffer1) {
      console.log(`❌ RNuffer auth update failed: ${rnuffer1.message}`)
    } else {
      console.log(`✅ RNuffer auth password set to ${rnufferPassword}`)
    }
    
    console.log('\n📊 FINAL STATUS:')
    console.log(`richard.nuffer@live.com: ${!richard1 && !richardProfile ? '✅ FIXED' : '❌ FAILED'}`)
    console.log(`rnuffer@live.com: ${!rnuffer1 && !rnufferProfile ? '✅ FIXED' : '❌ FAILED'}`)
    
    if (!richard1 && !richardProfile && !rnuffer1 && !rnufferProfile) {
      console.log('\n🎉 SUCCESS! Both admin accounts are now 100% functional!')
      console.log('\n🔐 NEW LOGIN CREDENTIALS:')
      console.log('   Email: richard.nuffer@live.com')
      console.log('   PIN: 562900')
      console.log('')
      console.log('   Email: rnuffer@live.com')
      console.log('   PIN: 123400')
      console.log('\n✅ Use these 6-digit PINs to log in!')
      console.log('\n📝 Note: I updated the PINs to meet Supabase\'s 6-character minimum requirement.')
      console.log('    The original PIN 5629 is now 562900')
      console.log('    The new PIN for rnuffer is 123400')
    } else {
      console.log('\n⚠️  Some updates failed. Check the errors above.')
    }
    
  } catch (e) {
    console.error('💥 Working fix failed:', e.message)
    process.exit(1)
  }
}

workingFix()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1) })
