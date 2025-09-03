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

    const type = String(form.get('type')||'')
    const minimum_balance = Number(form.get('minimum_balance')||0)
    const balance = Number(form.get('balance')||0)
    const start_date_raw = String(form.get('start_date')||'')
    const lockup_end_raw = String(form.get('lockup_end_date')||'')
    const patch: any = { type, minimum_balance, balance }
    if (start_date_raw) patch.start_date = start_date_raw
    if (lockup_end_raw) patch.lockup_end_date = lockup_end_raw

    await supabaseAdmin.from('accounts').update(patch).eq('id', accountId)
    return NextResponse.redirect(new URL('/admin?toast=account_updated', req.url))
  } catch (e) {
    console.error('api update-account failed', e)
    return NextResponse.redirect(new URL('/admin?toast=error', req.url))
  }
}

