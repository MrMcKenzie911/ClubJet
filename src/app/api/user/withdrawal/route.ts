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
    const method = String(form.get('method') || 'WIRE')
    if (!account_id || !amount || amount <= 0) return NextResponse.redirect(new URL('/dashboard?toast=error', req.url))

    await supabaseAdmin.from('withdrawal_requests').insert({ account_id, amount, method, status: 'pending' })
    return NextResponse.redirect(new URL('/dashboard?toast=withdraw_submitted', req.url))
  } catch (e) {
    console.error('api user/withdrawal failed', e)
    return NextResponse.redirect(new URL('/dashboard?toast=error', req.url))
  }
}

