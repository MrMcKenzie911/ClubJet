import { NextResponse } from 'next/server'
/* eslint-disable @typescript-eslint/no-explicit-any */


export async function POST(req: Request) {
  try {
    const body = await req.json()
    const url = process.env.VAPI_WEBHOOK_URL
    if (!url) return NextResponse.json({ error: 'Missing VAPI_WEBHOOK_URL' }, { status: 500 })
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const text = await res.text()
    return NextResponse.json({ ok: true, status: res.status, body: text })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'server error' }, { status: 500 })
  }
}

