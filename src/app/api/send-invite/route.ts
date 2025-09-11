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


    // Forward to n8n (compose full payload the workflow can use)
    const fallback = 'https://fmecorp.app.n8n.cloud/webhook-test/cffb265d-9fc0-44f1-8c2d-28cda8b2b290'
    const url = process.env.VAPI_WEBHOOK_URL || fallback

    const payload = {
      event: 'send_invite',
      recipientEmail,
      inviteUrl,
      senderName: senderNameResolved,
      senderEmail,
      senderReferralCode,
      senderUserId,
      _ts: new Date().toISOString(),
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const text = await res.text().catch(()=>'')
    if (!res.ok) return NextResponse.json({ ok: false, status: res.status, body: text }, { status: 502 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'server error' }, { status: 500 })
  }
}

