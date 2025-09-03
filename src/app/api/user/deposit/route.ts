import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getSupabaseServer } from '@/lib/supabaseServer'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseServer()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(new URL('/login', req.url))

    const form = await req.formData()
    const account_id = String(form.get('account_id') || '')
    const amount = parseFloat(String(form.get('amount') || '0'))
    const reference = String(form.get('reference') || '')
    if (!account_id || !amount || amount <= 0) return NextResponse.redirect(new URL('/dashboard?toast=error', req.url))

    await supabaseAdmin.from('transactions').insert({ account_id, type: 'DEPOSIT', amount, status: 'pending', metadata: { reference } })
    return NextResponse.redirect(new URL('/dashboard?toast=deposit_submitted', req.url))
  } catch (e) {
    console.error('api user/deposit failed', e)
    return NextResponse.redirect(new URL('/dashboard?toast=error', req.url))
  }
}

