import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

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

async function ensureAdmin({ email, password, first_name, last_name }) {
  // Try to find existing auth user via Admin API list
  const { data: list, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr) throw listErr
  let user = list.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
  if (!user) {
    const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true })
    if (created.error) throw created.error
    user = created.data.user
  } else if (password) {
    // Update password
    await supabase.auth.admin.updateUserById(user.id, { password })
  }
  // Upsert profile with role admin
  const { error: upErr } = await supabase.from('profiles').upsert({
    id: user.id,
    email,
    first_name,
    last_name,
    role: 'admin',
    updated_at: new Date().toISOString(),
  })
  if (upErr) throw upErr
  console.log('Admin ensured:', email)
}

ensureAdmin({ email: 'rnuffer@live.com', password: '9999', first_name: 'Richard', last_name: 'Nuffer' })
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1) })

