import { NextResponse } from 'next/server'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { id, email, first_name, last_name, phone, referral_code } = body || {}
    if (!id || !email) return NextResponse.json({ error: 'Missing id or email' }, { status: 400 })

    const { error } = await supabaseAdmin.from('profiles').upsert({
      id,
      email,
      first_name,
      last_name,
      phone,
      referral_code,
      role: 'pending',
      updated_at: new Date().toISOString(),
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'server error' }, { status: 500 })
  }
}

