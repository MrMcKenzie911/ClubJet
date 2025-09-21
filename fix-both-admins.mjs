import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

function loadDotEnvLocal() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const envPath = path.resolve(__dirname, '.env.local')
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
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY envs. Aborting.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

console.log('🔧 Fixing Both Admin Accounts')
console.log('=============================')

async function ensureAdminWithPin({ email, pin, first_name, last_name }) {
  console.log(`\n🛠️  Processing: ${email}`)
  
  try {
    // Try to find existing auth user via Admin API list
    const { data: list, error: listErr } = await supabase.auth.admin.listUsers()
    if (listErr) throw listErr
    
    let user = list.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    
    if (!user) {
      console.log(`🔨 Creating Auth user...`)
      const created = await supabase.auth.admin.createUser({ 
        email, 
        password: pin, 
        email_confirm: true 
      })
      if (created.error) throw created.error
      user = created.data.user
      console.log(`✅ Auth user created: ${user.id}`)
    } else {
      console.log(`✅ Auth user found: ${user.id}`)
      // Update password to match PIN
      const { error: pwErr } = await supabase.auth.admin.updateUserById(user.id, { password: pin })
      if (pwErr) throw pwErr
      console.log(`✅ Password updated to PIN: ${pin}`)
    }
    
    // Upsert profile with role admin and PIN
    const { error: upErr } = await supabase.from('profiles').upsert({
      id: user.id,
      email,
      first_name,
      last_name,
      role: 'admin',
      approval_status: 'approved',
      pin_code: pin,
      updated_at: new Date().toISOString(),
    })
    if (upErr) throw upErr
    
    console.log(`✅ Profile updated with PIN: ${pin}`)
    console.log(`🎉 ${email} is ready for login!`)
    return true
    
  } catch (e) {
    console.log(`❌ Failed to fix ${email}: ${e.message}`)
    return false
  }
}

async function main() {
  try {
    console.log('\n🎯 Fixing both admin accounts...')
    
    // Fix richard.nuffer@live.com with PIN 5629
    const richard = await ensureAdminWithPin({ 
      email: 'richard.nuffer@live.com', 
      pin: '5629', 
      first_name: 'Richard', 
      last_name: 'Nuffer' 
    })
    
    // Fix rnuffer@live.com with PIN 1234
    const rnuffer = await ensureAdminWithPin({ 
      email: 'rnuffer@live.com', 
      pin: '1234', 
      first_name: 'Richard', 
      last_name: 'Nuffer' 
    })
    
    console.log('\n📊 Final Results:')
    console.log(`richard.nuffer@live.com: ${richard ? '✅ FIXED' : '❌ FAILED'}`)
    console.log(`rnuffer@live.com: ${rnuffer ? '✅ FIXED' : '❌ FAILED'}`)
    
    if (richard && rnuffer) {
      console.log('\n🎉 SUCCESS! Both admin accounts are now functional!')
      console.log('\n🔐 Login Credentials:')
      console.log('   richard.nuffer@live.com → PIN: 5629')
      console.log('   rnuffer@live.com → PIN: 1234')
      console.log('\n✅ You can now log in with these credentials!')
    } else {
      console.log('\n⚠️  Some fixes failed. Check the errors above.')
    }
    
  } catch (e) {
    console.error('💥 Fix failed:', e.message)
    process.exit(1)
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1) })
