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
    const txId = String(form.get('tx_id') || '')
    const decision = String(form.get('decision') || '')
    if (!txId || !decision) return NextResponse.redirect(new URL('/admin?toast=error', req.url))

    if (decision === 'approve') {
      const { data: tx, error: txErr } = await supabaseAdmin.from('transactions').select('*').eq('id', txId).maybeSingle()
      if (txErr) throw txErr
      if (tx) {
        await supabaseAdmin.from('transactions').update({ status: 'posted' }).eq('id', txId)
        const { data: acct, error: acctErr } = await supabaseAdmin.from('accounts').select('*').eq('id', tx.account_id).maybeSingle()
        if (acctErr) throw acctErr
        if (acct) {
          const newBal = Number(acct.balance) + Number(tx.amount)
          await supabaseAdmin.from('accounts').update({ balance: newBal }).eq('id', acct.id)
        }
      }
      return NextResponse.redirect(new URL('/admin?toast=deposit_approved', req.url))
    } else if (decision === 'deny') {
      await supabaseAdmin.from('transactions').update({ status: 'denied' }).eq('id', txId)
      return NextResponse.redirect(new URL('/admin?toast=deposit_denied', req.url))
    }

    return NextResponse.redirect(new URL('/admin?toast=error', req.url))
  } catch (e) {
    console.error('api approve-deposit failed', e)
    return NextResponse.redirect(new URL('/admin?toast=error', req.url))
  }
}

