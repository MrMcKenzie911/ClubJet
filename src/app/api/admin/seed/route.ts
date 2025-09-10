import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(req: NextRequest) {
  // Optional seed token path: allows headless import without interactive admin auth
  const token = req.headers.get('x-seed-token') || new URL(req.url).searchParams.get('token')
  if (token && process.env.ADMIN_SEED_TOKEN && token === process.env.ADMIN_SEED_TOKEN) {
    try {
      const body = await req.json().catch(() => null) as any
      if (!body || !Array.isArray(body.records)) {
        return NextResponse.json({ error: 'Invalid payload: expected { records: [...] }' }, { status: 400 })
      }
      type InRec = { name: string; phone: string; email: string; pin: string; investment: number; stream: 'Lender'|'Network'|'Pilot'; referrerCode?: string|null; ownCode: string; joinDate: string; status?: string; level?: number }
      const records: InRec[] = body.records

      const codeToId = new Map<string, string>()
      const emailToId = new Map<string, string>()

      for (const rec of records) {
        const [first_name, ...rest] = rec.name.trim().split(' ')
        const last_name = rest.join(' ') || null
        // Founding status not persisted directly (column may not exist in live schema)
        const joinDate = rec.joinDate
        const accountType = rec.stream.toUpperCase() === 'LENDER' ? 'LENDER' : 'NETWORK'
        // const streamLabel = rec.stream

        // find or create auth
        let authId: string | null = null
        try {
          const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
          const found = existing.users.find(u => (u.email || '').toLowerCase() === rec.email.toLowerCase())
          if (found) authId = found.id
        } catch {}
        if (!authId) {
          try {
            let created = await supabaseAdmin.auth.admin.createUser({ email: rec.email, password: rec.pin, email_confirm: true, user_metadata: { phone: rec.phone, pin_code: rec.pin, referral_code: rec.ownCode } })
            if (!created.data.user) {
              created = await supabaseAdmin.auth.admin.createUser({ email: rec.email, password: `Cj${rec.pin}!${rec.pin}` as string, email_confirm: true, user_metadata: { phone: rec.phone, pin_code: rec.pin, referral_code: rec.ownCode } })
            }
            authId = created.data.user?.id ?? null
          } catch {}
        }
        if (!authId) return NextResponse.json({ error: `Failed to create or find auth user for ${rec.email}` }, { status: 500 })

        // Force-sync auth password to the provided PIN (idempotent)
        try { await supabaseAdmin.auth.admin.updateUserById(authId, { password: rec.pin }) } catch {}

        emailToId.set(rec.email.toLowerCase(), authId)

        await supabaseAdmin.from('profiles').upsert({
          id: authId,
          email: rec.email,
          first_name,
          last_name,
          phone: rec.phone,
          role: 'user',
          referral_code: rec.ownCode,
          pin_code: rec.pin,
          created_at: new Date(joinDate).toISOString(),
          updated_at: new Date(joinDate).toISOString(),
        }, { onConflict: 'email' })
        codeToId.set(rec.ownCode, authId)

        // account ensure
        const { data: existingAccts } = await supabaseAdmin.from('accounts').select('id').eq('user_id', authId).limit(1)
        let accountId = existingAccts && existingAccts.length > 0 ? existingAccts[0].id : null
        if (!accountId) {
          const { data: acctIns, error: acctErr } = await supabaseAdmin.from('accounts').insert({
            user_id: authId,
            type: accountType,
            balance: rec.investment,
            start_date: rec.joinDate
          }).select('id').single()
          if (acctErr) return NextResponse.json({ error: `Account insert failed for ${rec.email}: ${acctErr.message}` }, { status: 500 })
          accountId = acctIns!.id
        }

        if (accountId) {
          const { data: txs } = await supabaseAdmin.from('transactions').select('id').eq('account_id', accountId).eq('type', 'DEPOSIT').limit(1)
          if (!txs || txs.length === 0) {
            await supabaseAdmin.from('transactions').insert({
              account_id: accountId,
              type: 'DEPOSIT',
              amount: rec.investment,
              created_at: new Date(joinDate).toISOString(),
            })
          }
        }
      }

      for (const rec of records) {
        const childId = emailToId.get(rec.email.toLowerCase())
        if (!childId) continue
        if (rec.referrerCode) {
          const parentId = codeToId.get(rec.referrerCode)
          if (parentId) await supabaseAdmin.from('profiles').update({ referrer_id: parentId }).eq('id', childId)
        }
      }

      return NextResponse.json({ ok: true, inserted: records.length })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Seed failed'
      return NextResponse.json({ error: msg }, { status: 500 })
    }
  }

  // Fallback: original protected demo seed for admins
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (me?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const verifiedAuth = await supabaseAdmin.auth.admin.createUser({
    email: 'verified@clubjet.com',
    password: 'Test1234!',
    email_confirm: true,
    user_metadata: { seed: true }
  });
  const pendingAuth = await supabaseAdmin.auth.admin.createUser({
    email: 'pending@clubjet.com',
    password: 'Test1234!',
    email_confirm: true,
    user_metadata: { seed: true }
  });
  const verifiedId = verifiedAuth.data.user?.id;
  const pendingId = pendingAuth.data.user?.id;
  if (!verifiedId || !pendingId) return NextResponse.json({ error: 'Failed to create auth users' }, { status: 500 });

  const { error: ep } = await supabase.from('profiles').upsert([
    { id: verifiedId, email: 'verified@clubjet.com', first_name: 'Veri', last_name: 'Fied', role: 'user', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: pendingId, email: 'pending@clubjet.com', first_name: 'Pen', last_name: 'Ding', role: 'pending', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ]);
  if (ep) return NextResponse.json({ error: ep.message }, { status: 500 });

  const { error: ea } = await supabase.from('accounts').insert([
    { id: crypto.randomUUID(), user_id: verifiedId, type: 'LENDER', balance: 25000, created_at: new Date().toISOString() },
    { id: crypto.randomUUID(), user_id: verifiedId, type: 'NETWORK', balance: 5400, created_at: new Date().toISOString() },
  ]);
  if (ea) return NextResponse.json({ error: ea.message }, { status: 500 });

  return NextResponse.json({ ok: true, verifiedId, pendingId });
}

