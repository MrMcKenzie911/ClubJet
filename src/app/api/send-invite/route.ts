import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
/* eslint-disable @typescript-eslint/no-explicit-any */

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { recipientEmail, inviteUrl, senderName } = await req.json()
    if (!recipientEmail || !inviteUrl) return NextResponse.json({ error: 'missing recipientEmail or inviteUrl' }, { status: 400 })

    // Resolve sender context (name/email/referral_code) from session profile if available
    let senderNameResolved: string = senderName || ''
    let senderEmail = ''
    let senderReferralCode = ''
    let senderUserId = ''
    try {
      const supa = createRouteHandlerClient({ cookies })
      const { data: { user } } = await supa.auth.getUser()
      if (user?.id) {
        senderUserId = user.id
        const { data: prof } = await supabaseAdmin
          .from('profiles')
          .select('first_name, last_name, email, referral_code')
          .eq('id', user.id)
          .maybeSingle()
        if (prof) {
          const fn = (prof as any).first_name || ''
          const ln = (prof as any).last_name || ''
          senderNameResolved = senderNameResolved || `${fn} ${ln}`.trim()
          senderEmail = (prof as any).email || ''
          senderReferralCode = (prof as any).referral_code || ''
        }
      }
    } catch {}


    // Forward to n8n via GET with query params (per user instruction)
    const base = 'https://fmecorp.app.n8n.cloud/webhook-test/58f93449-12a4-43d7-b684-741bc5e6273c'
    const u = new URL(base)
    u.searchParams.set('event', 'send_invite')
    u.searchParams.set('recipientEmail', recipientEmail)
    u.searchParams.set('inviteUrl', inviteUrl)
    if (senderNameResolved) u.searchParams.set('senderName', senderNameResolved)
    if (senderEmail) u.searchParams.set('senderEmail', senderEmail)
    if (senderReferralCode) u.searchParams.set('senderReferralCode', senderReferralCode)
    if (senderUserId) u.searchParams.set('senderUserId', senderUserId)
    u.searchParams.set('_ts', new Date().toISOString())

    const res = await fetch(u.toString(), { method: 'GET' })
    const text = await res.text().catch(()=>'' )
    if (!res.ok) return NextResponse.json({ ok: false, status: res.status, body: text, url: u.toString() }, { status: 502 })
    return NextResponse.json({ ok: true, url: u.toString() })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'server error' }, { status: 500 })
  }
}

