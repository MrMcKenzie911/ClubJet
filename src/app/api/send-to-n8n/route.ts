import { NextResponse } from 'next/server'
/* eslint-disable @typescript-eslint/no-explicit-any */

// Forward signup payloads to n8n/Vapi webhook
export async function POST(req: Request) {
  try {
    const body = await req.json()
    // Use env var when set; otherwise fall back to the provided URL
    const fallback = 'https://fmecorp.app.n8n.cloud/webhook-test/cffb265d-9fc0-44f1-8c2d-28cda8b2b290'
    const url = process.env.VAPI_WEBHOOK_URL || fallback

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const text = await res.text().catch(() => '')
    if (!res.ok) {
      return NextResponse.json({ ok: false, status: res.status, body: text || 'Webhook error' }, { status: 502 })
    }
    return NextResponse.json({ ok: true, status: res.status, body: text })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'server error' }, { status: 500 })
  }
}

