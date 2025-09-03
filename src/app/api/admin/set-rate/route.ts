import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const guard = await fetch(new URL('/api/admin/guard', req.url), { cache: 'no-store' })
    if (!guard.ok) return NextResponse.redirect(new URL('/login', req.url))

    const form = await req.formData()
    const account_type = String(form.get('account_type') || '')
    const fixed_rate_monthly = Number(form.get('fixed_rate_monthly') || 0) || null

    await supabaseAdmin.from('earnings_rates').insert({ account_type, fixed_rate_monthly, effective_from: new Date().toISOString().slice(0, 10) })
    return NextResponse.redirect(new URL('/admin?toast=rate_set', req.url))
  } catch (e) {
    console.error('api set-rate failed', e)
    return NextResponse.redirect(new URL('/admin?toast=error', req.url))
  }
}

