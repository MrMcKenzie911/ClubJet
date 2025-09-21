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

console.log('🔧 Direct Admin Fix')
console.log('===================')

async function directFix() {
  try {
    console.log('\n🎯 Direct approach using known profile IDs...')
    
    // From our earlier diagnostic, we know:
    // richard.nuffer@live.com: ID 19d6cbf4-cb39-416c-93db-d5b6f7f957a3, PIN 5629
    // rnuffer@live.com: ID 754f73ec-c799-4911-93ae-dfd1d9c30c77, PIN NOT SET
    
    console.log('\n🛠️  Fixing richard.nuffer@live.com...')
    
    // Try to update auth password using the profile ID as auth user ID
    const { error: richard1 } = await supabase.auth.admin.updateUserById('19d6cbf4-cb39-416c-93db-d5b6f7f957a3', {
      password: '5629'
    })
    
    if (richard1) {
      console.log(`❌ Richard auth update failed: ${richard1.message}`)
    } else {
      console.log(`✅ Richard auth password set to 5629`)
    }
    
    console.log('\n🛠️  Fixing rnuffer@live.com...')
    
    // Set PIN in profile first
    const { error: rnufferProfile } = await supabase
      .from('profiles')
      .update({ 
        pin_code: '1234',
        role: 'admin',
        approval_status: 'approved',
        updated_at: new Date().toISOString() 
      })
      .eq('id', '754f73ec-c799-4911-93ae-dfd1d9c30c77')
    
    if (rnufferProfile) {
      console.log(`❌ RNuffer profile update failed: ${rnufferProfile.message}`)
    } else {
      console.log(`✅ RNuffer profile updated with PIN 1234`)
    }
    
    // Try to update auth password
    const { error: rnuffer1 } = await supabase.auth.admin.updateUserById('754f73ec-c799-4911-93ae-dfd1d9c30c77', {
      password: '1234'
    })
    
    if (rnuffer1) {
      console.log(`❌ RNuffer auth update failed: ${rnuffer1.message}`)
    } else {
      console.log(`✅ RNuffer auth password set to 1234`)
    }
    
    // Test login for both accounts
    console.log('\n🧪 Testing logins...')
    
    // Test richard.nuffer@live.com
    const testClient1 = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SERVICE_KEY)
    const { data: login1, error: loginErr1 } = await testClient1.auth.signInWithPassword({
      email: 'richard.nuffer@live.com',
      password: '5629'
    })
    
    if (loginErr1) {
      console.log(`❌ Richard login test failed: ${loginErr1.message}`)
    } else {
      console.log(`✅ Richard login test SUCCESS!`)
      await testClient1.auth.signOut()
    }
    
    // Test rnuffer@live.com
    const testClient2 = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SERVICE_KEY)
    const { data: login2, error: loginErr2 } = await testClient2.auth.signInWithPassword({
      email: 'rnuffer@live.com',
      password: '1234'
    })
    
    if (loginErr2) {
      console.log(`❌ RNuffer login test failed: ${loginErr2.message}`)
    } else {
      console.log(`✅ RNuffer login test SUCCESS!`)
      await testClient2.auth.signOut()
    }
    
    console.log('\n📊 FINAL STATUS:')
    console.log(`richard.nuffer@live.com: ${!loginErr1 ? '✅ WORKING' : '❌ FAILED'}`)
    console.log(`rnuffer@live.com: ${!loginErr2 ? '✅ WORKING' : '❌ FAILED'}`)
    
    if (!loginErr1 && !loginErr2) {
      console.log('\n🎉 SUCCESS! Both admin accounts are now 100% functional!')
      console.log('\n🔐 LOGIN CREDENTIALS:')
      console.log('   richard.nuffer@live.com → PIN: 5629')
      console.log('   rnuffer@live.com → PIN: 1234')
      console.log('\n✅ You can now log in to the admin dashboard!')
    } else {
      console.log('\n⚠️  Some issues remain. Check the errors above.')
    }
    
  } catch (e) {
    console.error('💥 Direct fix failed:', e.message)
    process.exit(1)
  }
}

directFix()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1) })
