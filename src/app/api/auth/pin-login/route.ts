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

    // Attempt direct sign-in with provided credentials first
    const supabase = createRouteHandlerClient({ cookies })
    const fallback = `Cj${pw}!${pw}`
    let signedIn = false

    // First try with raw PIN
    {
      const { error } = await supabase.auth.signInWithPassword({ email: em, password: pw })
      if (!error) signedIn = true
    }
    // Then try with seeded fallback format
    if (!signedIn) {
      const { error } = await supabase.auth.signInWithPassword({ email: em, password: fallback })
      if (!error) signedIn = true
    }

    // If not yet signed in, repair password via Admin API and retry
    let authId: string | null = null
    if (!signedIn) {
      // Try to locate profile by email to get id
      const { data: profByEmail } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', em)
        .maybeSingle()
      authId = profByEmail?.id ?? null

      // If still no id, try to find the profile by PIN (unique per user). If exactly one match, trust it.
      if (!authId) {
        const { data: pinMatch } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('pin_code', pw)
          .limit(2)
        if (Array.isArray(pinMatch) && pinMatch.length === 1) {
          authId = pinMatch[0].id as string
        }
      }

      // If still no id, list auth users to find by email
      if (!authId) {
        try {
          const { data: existing } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 })
          const found = existing.users.find(u => (u.email || '').toLowerCase() === em)
          if (found) authId = found.id
        } catch {}
      }

      if (!authId) {
        // Attempt to provision an auth user if profile exists and is approved
        const { data: profFull } = await supabaseAdmin
          .from('profiles')
          .select('id, email, pin_code, role, approval_status')
          .eq('email', em)
          .maybeSingle<{ id: string; email: string | null; pin_code: string | null; role: string | null; approval_status: string | null }>()
        if (!profFull) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
        const approved = (profFull.approval_status === 'approved') || (profFull.role === 'user')
        if (!approved) return NextResponse.json({ error: 'Pending approval' }, { status: 403 })

        // Create auth user for this email
        let createdId: string | null = null
        try {
          const created = await supabaseAdmin.auth.admin.createUser({ email: em, password: pw, email_confirm: true })
          createdId = created?.data?.user?.id ?? null
        } catch {}
        if (!createdId) {
          try {
            const created2 = await supabaseAdmin.auth.admin.createUser({ email: em, password: fallback, email_confirm: true })
            createdId = created2?.data?.user?.id ?? null
          } catch {}
        }
        if (!createdId) return NextResponse.json({ error: 'Provisioning failed' }, { status: 500 })

        // Migrate related rows from old profile id to new auth id
        const oldId = String(profFull.id)
        const newId = createdId
        try {
          await supabaseAdmin.from('accounts').update({ user_id: newId }).eq('user_id', oldId)
          await supabaseAdmin.from('signup_fees').update({ user_id: newId }).eq('user_id', oldId)
          await supabaseAdmin.from('profiles').update({ referrer_id: newId }).eq('referrer_id', oldId)
          await supabaseAdmin.from('profiles').update({ id: newId }).eq('id', oldId)
        } catch (e) {
          console.error('migration failed', e)
          // Continue; the login should still work even if some relations need manual fix
        }
        authId = newId
      }

      // Determine canonical login email for this auth user id
      let loginEmail = em
      try {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(authId)
        const authEmail = (u?.user?.email || '').trim().toLowerCase()
        if (authEmail) loginEmail = authEmail
      } catch {}

      // Try force-setting password to the PIN, then sign in
      try { await supabaseAdmin.auth.admin.updateUserById(authId, { password: pw }) } catch {}
      {
        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: pw })
        if (!error) signedIn = true
      }
      // If still failing, set to fallback and try fallback
      if (!signedIn) {
        try { await supabaseAdmin.auth.admin.updateUserById(authId, { password: fallback }) } catch {}
        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: fallback })
        if (!error) signedIn = true
      }
      if (!signedIn) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Derive user id from current session and fetch role/founding flag
    const { data: userData } = await supabase.auth.getUser()
    const uid = userData?.user?.id || authId

    let roleOut: string | null = null
    let isFounderOut = false
    if (uid) {
      const { data: prof2 } = await supabaseAdmin
        .from('profiles')
        .select('role, is_founding_member')
        .eq('id', uid)
        .maybeSingle()
      if (prof2) {
        const p = prof2 as { role: string | null; is_founding_member: boolean | null }
        roleOut = p.role ?? null
        isFounderOut = p.is_founding_member === true
      }
    }

    return NextResponse.json({ ok: true, role: roleOut, is_founding_member: isFounderOut })
  } catch {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}

