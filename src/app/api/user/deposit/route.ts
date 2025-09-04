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

    const form = await req.formData()
    let account_id = String(form.get('account_id') || '')
    const amount = parseFloat(String(form.get('amount') || '0'))
    const reference = String(form.get('reference') || '')

    // Fallback to user's first account if not provided
    if (!account_id) {
      const { data: acct } = await supabaseAdmin
        .from('accounts')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (acct?.id) account_id = acct.id
    }

    if (!account_id || !amount || amount <= 0) {
      return NextResponse.redirect(new URL('/dashboard?toast=error', req.url))
    }

    const { error: insErr } = await supabaseAdmin
      .from('transactions')
      .insert({ account_id, type: 'DEPOSIT', amount, status: 'pending', metadata: reference ? { reference } : null })
    if (insErr) throw insErr

    return NextResponse.redirect(new URL('/dashboard?toast=deposit_submitted', req.url))
  } catch (e) {
    console.error('api user/deposit failed', e)
    return NextResponse.redirect(new URL('/dashboard?toast=error', req.url))
  }
}

