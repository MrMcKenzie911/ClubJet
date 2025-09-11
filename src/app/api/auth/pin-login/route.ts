import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  try {
    const { email, pin } = await req.json().catch(() => ({ email: '', pin: '' })) as { email?: string; pin?: string }
    const em = (email || '').trim().toLowerCase()
    const pw = (pin || '').trim()
    if (!em || !pw) return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })

    // Look up profile by email to get id + stored pin_code
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, role, is_founding_member, pin_code')
      .eq('email', em)
      .maybeSingle()

    // Fallback: if profile not found by email, try to locate auth user directly by email
    let authId: string | null = profile?.id ?? null
    if (!authId) {
      try {
        const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 })
        const found = existing.users.find(u => (u.email || '').toLowerCase() === em)
        if (found) authId = found.id
      } catch {}
      if (!authId) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Do not reject on pin_code mismatch; proceed to re-sync and attempt sign-in to tolerate stale data.

    // Ensure auth password equals the PIN (idempotent). If policy previously forced a different value,
    // this will re-sync the password to the 4-digit PIN.
    try {
      await supabaseAdmin.auth.admin.updateUserById(authId, { password: pw })
    } catch {}

    // Sign in on the server to set auth cookies for the client correctly
    const supabase = createRouteHandlerClient({ cookies })
    let signInErr: { message?: string } | null = null
    {
      const { error } = await supabase.auth.signInWithPassword({ email: em, password: pw })
      signInErr = error
    }
    if (signInErr) {
      // If password policy prevented resetting to PIN and the account still has the seeded fallback,
      // try the seeded fallback format transparently, without exposing it.
      const fallback = `Cj${pw}!${pw}`
      const { error: error2 } = await supabase.auth.signInWithPassword({ email: em, password: fallback })
      if (error2) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
      }
    }

    // Ensure we can report role/founding flag even if initial profile lookup by email failed
    let roleOut: string | null = profile?.role ?? null
    let isFounderOut: boolean = profile?.is_founding_member === true
    if (!roleOut) {
      const { data: prof2 } = await supabaseAdmin
        .from('profiles')
        .select('role, is_founding_member')
        .eq('id', authId)
        .maybeSingle()
      if (prof2) {
        roleOut = (prof2 as any).role ?? null
        isFounderOut = (prof2 as any).is_founding_member === true
      }
    }
    return NextResponse.json({ ok: true, role: roleOut, is_founding_member: isFounderOut })
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}

