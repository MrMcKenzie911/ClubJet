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

    // Fetch account to get owner
    const { data: acct, error: findErr } = await supabaseAdmin.from('accounts').select('id, user_id').eq('id', accountId).maybeSingle()
    if (findErr) throw findErr

    // Try to set verified_at; if column missing or other non-critical error, continue
    const { error: vErr } = await supabaseAdmin.from('accounts').update({ verified_at: new Date().toISOString() }).eq('id', accountId)
    if (vErr && String(vErr.message || '').includes('column') && String(vErr.message || '').includes('verified_at')) {
      console.warn('accounts.verified_at column missing; skipping set verified_at')
    } else if (vErr) {
      throw vErr
    }

    // Also mark the owner as verified user to remove them from pending lists
    if (acct?.user_id) {
      const { error: roleErr } = await supabaseAdmin.from('profiles').update({ role: 'user' }).eq('id', acct.user_id)
      if (roleErr) throw roleErr
    }

    return NextResponse.redirect(new URL('/admin?toast=account_verified', req.url))
  } catch (e) {
    console.error('api verify-account failed', e)
    return NextResponse.redirect(new URL('/admin?toast=error', req.url))
  }
}

