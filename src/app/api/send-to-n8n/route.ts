import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
/* eslint-disable @typescript-eslint/no-explicit-any */

export const runtime = 'nodejs'

// Forward payloads (signup, forms, etc.) to n8n/Vapi webhook. Accepts JSON or form posts.
export async function POST(req: Request) {
  try {
    const ct = req.headers.get('content-type') || ''
    let payload: Record<string, any> = {}

    if (ct.includes('application/json')) {
      payload = await req.json().catch(() => ({}))
    } else {
      const form = await req.formData().catch(() => null)
      if (form) {
        for (const [k, v] of form.entries()) {
          payload[k] = typeof v === 'string' ? v : (v as File).name
        }
      }
    }

    // Attach context: user id (if logged in), timestamp, origin
    try {
      const supa = createRouteHandlerClient({ cookies })
      const { data: { user } } = await supa.auth.getUser()
      if (user?.id) payload._user_id = user.id
    } catch {}
    payload._ts = new Date().toISOString()

    // Use the new webhook as the primary target (ignore env to avoid stale values)
    const url = 'https://fmecorp.app.n8n.cloud/webhook-test/58f93449-12a4-43d7-b684-741bc5e6273c'

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const text = await res.text().catch(() => '')
    if (!res.ok) {
      return NextResponse.json({ ok: false, status: res.status, body: text || 'Webhook error', url }, { status: 502 })
    }
    return NextResponse.json({ ok: true, status: res.status, body: text, url })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'server error' }, { status: 500 })
  }
}

