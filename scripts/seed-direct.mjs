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
  const datasetArg = process.argv[2] || 'scripts/seed-clubjet-payload.json'
  const envPath = '.env.local'

  if (!fs.existsSync(datasetArg)) throw new Error('Dataset not found: ' + datasetArg)

  // Parse env from file if present; otherwise from process.env
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL
  let serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (fs.existsSync(envPath)) {
    const env = parseEnvFile(envPath)
    url = url || env.NEXT_PUBLIC_SUPABASE_URL
    serviceKey = serviceKey || env.SUPABASE_SERVICE_KEY
  }
  if (!url || !serviceKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in env')

  const supabase = createClient(url, serviceKey)

  // Read dataset JSON supporting either {clients:[]} or {records:[]}
  const txt = fs.readFileSync(datasetArg, 'utf8')
  let data
  try {
    data = JSON.parse(txt)
  } catch {
    // fall back: strip any header before first '{'
    const braceIdx = txt.indexOf('{')
    if (braceIdx < 0) throw new Error('Dataset does not contain JSON object')
    data = JSON.parse(txt.slice(braceIdx))
  }
  let clients = Array.isArray(data.clients) ? data.clients : null
  if (!clients && Array.isArray(data.records)) {
    clients = data.records.map(r => ({
      name: r.name,
      phone: r.phone,
      email: r.email,
      password: r.pin,
      investment: r.investment,
      stream_type: r.stream,
      level: r.level,
      status: r.status,
      referrer_code: r.referrerCode,
      own_code: r.ownCode,
      join_date: r.joinDate,
    }))
  }
  if (!Array.isArray(clients)) throw new Error('Invalid dataset: clients[] or records[] missing')

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

