import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const supa = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.redirect(new URL('/login', req.url))
    const { data: me } = await supa.from('profiles').select('role').eq('id', user.id).single()
    if (me?.role !== 'admin') return NextResponse.redirect(new URL('/login', req.url))

    const form = await req.formData()
    const accountId = String(form.get('account_id') || '')
    if (!accountId) return NextResponse.redirect(new URL('/admin?toast=error', req.url))

    const { error: vErr } = await supabaseAdmin.from('accounts').update({ verified_at: new Date().toISOString() }).eq('id', accountId)
    if (vErr) throw vErr
    return NextResponse.redirect(new URL('/admin?toast=account_verified', req.url))
  } catch (e) {
    console.error('api verify-account failed', e)
    return NextResponse.redirect(new URL('/admin?toast=error', req.url))
  }
}

