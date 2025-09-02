import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

// Load .env.local manually (no dependency on dotenv)
function loadDotEnvLocal() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const envPath = path.resolve(__dirname, '..', '.env.local')
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

async function findUserByEmail(email) {
  let page = 1
  const perPage = 1000
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const match = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (match) return match
    if (data.users.length < perPage) return null
    page += 1
  }
}

async function ensureUser({ email, password, role }) {
  let user = await findUserByEmail(email)
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error) throw error
    user = data.user
    console.log(`Created user ${email} (${user.id})`)
  } else {
    // Update password to ensure it matches what we expect
    const { error } = await supabase.auth.admin.updateUserById(user.id, { password })
    if (error) throw error
    console.log(`Updated password for ${email} (${user.id})`)
  }

  // Upsert profile with desired role
  const { error: upsertErr } = await supabase.from('profiles').upsert({
    id: user.id,
    email,
    role,
    updated_at: new Date().toISOString(),
  })
  if (upsertErr) throw upsertErr
  console.log(`Upserted profile for ${email} -> role=${role}`)
}

async function main() {
  try {
    await ensureUser({ email: 'test@admin.com', password: '1234', role: 'admin' })
    await ensureUser({ email: 'investor@club.com', password: '4321', role: 'user' })
    console.log('All done.')
  } catch (e) {
    console.error('Error:', e?.message || e)
    process.exit(1)
  }
}

main()

