import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
  // Ensure admin guard (direct)
  const supa = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url))
  const { data: me } = await supa.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return NextResponse.redirect(new URL('/login', req.url))

    const form = await req.formData()
    const userId = String(form.get('user_id') || '')
    const decision = String(form.get('decision') || '')
    if (!userId || !decision) {
      return NextResponse.redirect(new URL('/admin?toast=error', req.url))
    }

    if (decision === 'approve') {
      const { error: upErr } = await supabaseAdmin.from('profiles').update({ role: 'user' }).eq('id', userId)
      if (upErr) throw upErr
      const { data: acct } = await supabaseAdmin.from('accounts').select('id').eq('user_id', userId).order('created_at', { ascending: true }).limit(1).maybeSingle()
      if (acct?.id) {
        const { error: vErr } = await supabaseAdmin.from('accounts').update({ verified_at: new Date().toISOString() }).eq('id', acct.id)
        if (vErr) throw vErr
      }
      return NextResponse.redirect(new URL('/admin?toast=user_approved', req.url))
    } else if (decision === 'reject') {
      const { error: delErr } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
      if (delErr) throw delErr
      return NextResponse.redirect(new URL('/admin?toast=user_rejected', req.url))
    }

    return NextResponse.redirect(new URL('/admin?toast=error', req.url))
  } catch (e) {
    console.error('api approve-user failed', e)
    return NextResponse.redirect(new URL('/admin?toast=error', req.url))
  }
}

