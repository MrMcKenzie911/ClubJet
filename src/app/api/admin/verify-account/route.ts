import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const guard = await fetch(new URL('/api/admin/guard', req.url), { cache: 'no-store' })
    if (!guard.ok) return NextResponse.redirect(new URL('/login', req.url))

    const form = await req.formData()
    const accountId = String(form.get('account_id') || '')
    if (!accountId) return NextResponse.redirect(new URL('/admin?toast=error', req.url))

    await supabaseAdmin.from('accounts').update({ verified_at: new Date().toISOString() }).eq('id', accountId)
    return NextResponse.redirect(new URL('/admin?toast=account_verified', req.url))
  } catch (e) {
    console.error('api verify-account failed', e)
    return NextResponse.redirect(new URL('/admin?toast=error', req.url))
  }
}

