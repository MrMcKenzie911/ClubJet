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

console.log('🔧 Final Admin Account Fix')
console.log('==========================')

async function findUserByEmailPaginated(email) {
  console.log(`🔍 Searching for: ${email}`)
  let page = 1
  const perPage = 1000
  
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.log(`❌ List error: ${error.message}`)
      return null
    }
    
    console.log(`   Checking page ${page} (${data.users.length} users)`)
    const match = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (match) {
      console.log(`✅ Found: ${match.id}`)
      return match
    }
    
    if (data.users.length < perPage) break
    page += 1
  }
  
  console.log(`❌ Not found in ${page} pages`)
  return null
}

async function fixAdminAccount(email, pin) {
  console.log(`\n🛠️  Fixing: ${email}`)
  
  try {
    // 1. Get profile
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, email, role, pin_code')
      .eq('email', email)
      .maybeSingle()
    
    if (profileErr || !profile) {
      console.log(`❌ Profile error: ${profileErr?.message || 'Not found'}`)
      return false
    }
    
    console.log(`✅ Profile: ${profile.id}`)
    
    // 2. Find auth user with pagination
    const authUser = await findUserByEmailPaginated(email)
    
    if (!authUser) {
      console.log(`❌ Auth user not found despite registration error`)
      return false
    }
    
    // 3. Update profile to match auth user ID if needed
    if (profile.id !== authUser.id) {
      console.log(`🔄 Updating profile ID: ${profile.id} → ${authUser.id}`)
      
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ 
          id: authUser.id,
          pin_code: pin,
          role: 'admin',
          approval_status: 'approved',
          updated_at: new Date().toISOString() 
        })
        .eq('email', email)
      
      if (updateErr) {
        console.log(`❌ Profile update failed: ${updateErr.message}`)
        return false
      }
      
      console.log(`✅ Profile updated`)
    } else {
      // Just update PIN and ensure admin role
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ 
          pin_code: pin,
          role: 'admin',
          approval_status: 'approved',
          updated_at: new Date().toISOString() 
        })
        .eq('id', profile.id)
      
      if (updateErr) {
        console.log(`❌ Profile PIN update failed: ${updateErr.message}`)
        return false
      }
      
      console.log(`✅ Profile PIN updated`)
    }
    
    // 4. Update auth password
    const { error: pwErr } = await supabase.auth.admin.updateUserById(authUser.id, {
      password: pin
    })
    
    if (pwErr) {
      console.log(`❌ Password update failed: ${pwErr.message}`)
      return false
    }
    
    console.log(`✅ Auth password set to: ${pin}`)
    console.log(`🎉 ${email} is ready!`)
    return true
    
  } catch (e) {
    console.log(`💥 Exception: ${e.message}`)
    return false
  }
}

async function main() {
  try {
    console.log('\n🎯 Final fix attempt...')
    
    const richard = await fixAdminAccount('richard.nuffer@live.com', '5629')
    const rnuffer = await fixAdminAccount('rnuffer@live.com', '1234')
    
    console.log('\n📊 FINAL RESULTS:')
    console.log(`richard.nuffer@live.com: ${richard ? '✅ READY' : '❌ FAILED'}`)
    console.log(`rnuffer@live.com: ${rnuffer ? '✅ READY' : '❌ FAILED'}`)
    
    if (richard && rnuffer) {
      console.log('\n🎉 SUCCESS! Both admin accounts are now 100% functional!')
      console.log('\n🔐 LOGIN CREDENTIALS:')
      console.log('   Email: richard.nuffer@live.com')
      console.log('   PIN: 5629')
      console.log('')
      console.log('   Email: rnuffer@live.com')
      console.log('   PIN: 1234')
      console.log('\n✅ Try logging in now!')
    }
    
  } catch (e) {
    console.error('💥 Final fix failed:', e.message)
    process.exit(1)
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1) })
