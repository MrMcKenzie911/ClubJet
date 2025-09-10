import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

function parseEnvFile(filePath) {
  const txt = fs.readFileSync(filePath, 'utf8')
  const env = {}
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
    if (!m) continue
    const key = m[1]
    let val = m[2]
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    env[key] = val
  }
  return env
}

function normalizeStream(streamType) {
  const s = (streamType || '').toLowerCase()
  if (s.includes('lender')) return 'LENDER'
  return 'NETWORK' // map Network/Pilot to NETWORK per schema
}

function deriveNames(fullName) {
  const parts = (fullName || '').trim().split(/\s+/)
  const first = parts[0] || ''
  const last = parts.slice(1).join(' ') || null
  return { first, last }
}

async function main() {
  const datasetArg = process.argv[2] || 'clubjet-app/Club Aereus Real Client Data Set.txt'
  const envPath = 'clubjet-app/.env.local'

  if (!fs.existsSync(datasetArg)) throw new Error('Dataset not found: ' + datasetArg)
  if (!fs.existsSync(envPath)) throw new Error('Env file not found: ' + envPath)

  // Parse env
  const env = parseEnvFile(envPath)
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_KEY
  if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in env')

  const supabase = createClient(url, serviceKey)

  // Read dataset JSON (strip header lines before first '{')
  const txt = fs.readFileSync(datasetArg, 'utf8')
  const braceIdx = txt.indexOf('{')
  if (braceIdx < 0) throw new Error('Dataset does not contain JSON object')
  const jsonTxt = txt.slice(braceIdx)
  const data = JSON.parse(jsonTxt)
  const clients = data.clients
  if (!Array.isArray(clients)) throw new Error('Invalid dataset: clients[] missing')

  // First pass: create users, profiles, accounts, deposit
  const codeToId = new Map()
  const emailToId = new Map()

  for (const c of clients) {
    const { first, last } = deriveNames(c.name)
    const accountType = normalizeStream(c.stream_type)
    const joinDate = c.join_date
    const pin = String(c.password)

    // find or create auth user
    let authId = null
    try {
      const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const found = existing.users.find(u => (u.email || '').toLowerCase() === (c.email || '').toLowerCase())
      if (found) authId = found.id
    } catch {}

    if (!authId) {
      try {
        let created = await supabase.auth.admin.createUser({
          email: c.email,
          password: pin,
          email_confirm: true,
          user_metadata: { phone: c.phone, pin_code: pin, referral_code: c.own_code }
        })
        if (!created.data.user) {
          created = await supabase.auth.admin.createUser({
            email: c.email,
            password: `Cj${pin}!${pin}`,
            email_confirm: true,
            user_metadata: { phone: c.phone, pin_code: pin, referral_code: c.own_code }
          })
        }
        authId = created.data.user?.id ?? null
      } catch {}
    }
    if (!authId) throw new Error('Failed to create or find auth user for ' + c.email)

    emailToId.set(c.email.toLowerCase(), authId)

    // upsert profile by email
    const prof = {
      id: authId,
      email: c.email,
      first_name: first,
      last_name: last,
      phone: c.phone,
      role: 'user',
      approval_status: 'approved',
      referral_code: c.own_code,
      referral_level: c.level ?? null,
      is_founding_member: ((c.status || '').toLowerCase().includes('founding')),
      created_at: new Date(joinDate).toISOString(),
      updated_at: new Date(joinDate).toISOString(),
    }
    await supabase.from('profiles').upsert(prof, { onConflict: 'email' })
    codeToId.set(c.own_code, authId)

    // account ensure
    const { data: existingAccts } = await supabase.from('accounts').select('id').eq('user_id', authId).limit(1)
    let accountId = existingAccts && existingAccts.length > 0 ? existingAccts[0].id : null
    if (!accountId) {
      const { data: acctIns, error: acctErr } = await supabase.from('accounts')
        .insert({
          user_id: authId,
          type: accountType,
          balance: Number(c.investment),
          initial_balance: Number(c.investment),
          start_date: c.join_date,
          verified_at: new Date(joinDate).toISOString(),
          is_active: true,
        })
        .select('id')
        .single()
      if (acctErr) throw new Error('Account insert failed for ' + c.email + ': ' + acctErr.message)
      accountId = acctIns.id
    }

    // deposit if none
    if (accountId) {
      const { data: txs } = await supabase.from('transactions').select('id').eq('account_id', accountId).eq('type', 'DEPOSIT').limit(1)
      if (!txs || txs.length === 0) {
        await supabase.from('transactions').insert({
          account_id: accountId,
          type: 'DEPOSIT',
          amount: Number(c.investment),
          status: 'posted',
          metadata: { seed: 'clubjet', stream: c.stream_type },
          created_at: new Date(joinDate).toISOString(),
        })
      }
    }
  }

  // Second pass: referrers
  for (const c of clients) {
    const childId = emailToId.get((c.email || '').toLowerCase())
    if (!childId) continue
    if (c.referrer_code) {
      const parentId = codeToId.get(c.referrer_code)
      if (parentId) {
        await supabase.from('profiles').update({ referrer_id: parentId }).eq('id', childId)
      }
    }
  }

  console.log(JSON.stringify({ ok: true, inserted: clients.length }))
}

main().catch(err => { console.error(err); process.exit(1) })

