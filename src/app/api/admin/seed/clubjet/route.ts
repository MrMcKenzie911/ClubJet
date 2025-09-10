import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// POST /api/admin/seed/clubjet
// Headers: X-Seed-Token: <ADMIN_SEED_TOKEN>
// Body: { records: Array<{ name: string; phone: string; email: string; pin: string; investment: number; stream: 'Lender'|'Network'|'Pilot'; referrerCode?: string|null; ownCode: string; joinDate: string; status?: 'Founding Member'|string; level?: number; }> }
// Idempotent: uses upsert by email for profiles and checks existing accounts/transactions.
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('x-seed-token') || new URL(req.url).searchParams.get('token')
    if (!process.env.ADMIN_SEED_TOKEN || token !== process.env.ADMIN_SEED_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body || !Array.isArray(body.records)) {
      return NextResponse.json({ error: 'Invalid payload: expected { records: [...] }' }, { status: 400 })
    }

    type InRec = {
      name: string
      phone: string
      email: string
      pin: string
      investment: number
      stream: 'Lender'|'Network'|'Pilot'
      referrerCode?: string | null
      ownCode: string
      joinDate: string // YYYY-MM-DD
      status?: string
      level?: number
    }
    const records: InRec[] = body.records

    // Pass 1: Create auth users + profiles + accounts + initial deposit transaction
    const codeToId = new Map<string, string>()
    const emailToId = new Map<string, string>()

    for (const rec of records) {
      const [first_name, ...rest] = rec.name.trim().split(' ')
      const last_name = rest.join(' ') || null
      const joinDate = rec.joinDate
      const accountType = rec.stream.toUpperCase() === 'LENDER' ? 'LENDER' : 'NETWORK' // map Pilot/Network -> NETWORK (schema constraint)
      const streamLabel = rec.stream

      // 1) Create or fetch auth user
      let authId: string | null = null
      // Try to find existing by email via auth admin list
      try {
        const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 })
        const found = existing.users.find(u => u.email?.toLowerCase() === rec.email.toLowerCase())
        if (found) authId = found.id
      } catch {}
      if (!authId) {
        try {
          // Try 4-digit password first; if policy blocks, fallback
          let created = await supabaseAdmin.auth.admin.createUser({
            email: rec.email,
            password: rec.pin,
            email_confirm: true,
            user_metadata: { phone: rec.phone, pin_code: rec.pin, referral_code: rec.ownCode },
          })
          if (!created.data.user) {
            // Fallback
            created = await supabaseAdmin.auth.admin.createUser({
              email: rec.email,
              password: `Cj${rec.pin}!${rec.pin}`,
              email_confirm: true,
              user_metadata: { phone: rec.phone, pin_code: rec.pin, referral_code: rec.ownCode },
            })
          }
          authId = created.data.user?.id ?? null
        } catch {
          // As a fallback, try to fetch user again in case it was created earlier
          try {
            const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 })
            const found = existing.users.find(u => u.email?.toLowerCase() === rec.email.toLowerCase())
            if (found) authId = found.id
          } catch {}
        }
      }
      if (!authId) {
        return NextResponse.json({ error: `Failed to create or locate auth user for ${rec.email}` }, { status: 500 })
      }

      emailToId.set(rec.email.toLowerCase(), authId)

      // 2) Upsert profile (by email unique)
      const prof = {
        id: authId,
        email: rec.email,
        first_name,
        last_name,
        phone: rec.phone,
        role: 'user',
        referral_code: rec.ownCode,
        created_at: new Date(joinDate).toISOString(),
        updated_at: new Date(joinDate).toISOString(),
      }
      // Upsert on email
      await supabaseAdmin.from('profiles').upsert(prof, { onConflict: 'email' })
      codeToId.set(rec.ownCode, authId)

      // 3) Ensure one account per user (create if not exists)
      const { data: existingAccts } = await supabaseAdmin
        .from('accounts')
        .select('id')
        .eq('user_id', authId)
        .limit(1)
      const hasAcct = Array.isArray(existingAccts) && existingAccts.length > 0
      let accountId: string | null = hasAcct ? existingAccts![0].id : null
      if (!hasAcct) {
        const { data: acctIns, error: acctErr } = await supabaseAdmin
          .from('accounts')
          .insert({
            user_id: authId,
            type: accountType,
            balance: rec.investment,
            start_date: rec.joinDate
          })
          .select('id')
          .single()
        if (acctErr) {
          return NextResponse.json({ error: `Account insert failed for ${rec.email}: ${acctErr.message}` }, { status: 500 })
        }
        accountId = acctIns!.id
      }

      // 4) Seed initial DEPOSIT transaction at join date if not present
      if (accountId) {
        const { data: txs } = await supabaseAdmin
          .from('transactions')
          .select('id')
          .eq('account_id', accountId)
          .eq('type', 'DEPOSIT')
          .order('created_at', { ascending: true })
          .limit(1)
        if (!txs || txs.length === 0) {
          await supabaseAdmin.from('transactions').insert({
            account_id: accountId,
            type: 'DEPOSIT',
            amount: rec.investment,
            status: 'posted',
            metadata: { seed: 'clubjet', stream: streamLabel },
            created_at: new Date(joinDate).toISOString(),
          })
        }
      }
    }

    // Pass 2: Resolve referrer links
    for (const rec of records) {
      const childId = emailToId.get(rec.email.toLowerCase())
      if (!childId) continue
      if (rec.referrerCode) {
        const parentId = codeToId.get(rec.referrerCode)
        if (parentId) {
          await supabaseAdmin.from('profiles').update({ referrer_id: parentId }).eq('id', childId)
        }
      }
    }

    return NextResponse.json({ ok: true, inserted: records.length })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Seed failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

