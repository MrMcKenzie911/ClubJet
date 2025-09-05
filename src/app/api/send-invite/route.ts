import { NextResponse } from 'next/server'
/* eslint-disable @typescript-eslint/no-explicit-any */

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { recipientEmail, inviteUrl, senderName } = await req.json()
    if (!recipientEmail || !inviteUrl) return NextResponse.json({ error: 'missing recipientEmail or inviteUrl' }, { status: 400 })

    // Forward to n8n (can template email there)
    const url = process.env.VAPI_WEBHOOK_URL
    const res = await fetch(url!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'send_invite', recipientEmail, inviteUrl, senderName })
    })
    const text = await res.text().catch(()=>'')
    if (!res.ok) return NextResponse.json({ ok: false, status: res.status, body: text }, { status: 502 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'server error' }, { status: 500 })
  }
}

