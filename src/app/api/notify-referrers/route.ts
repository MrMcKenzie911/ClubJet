import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { newUserId } = await req.json()
    if (!newUserId) return NextResponse.json({ error: 'missing newUserId' }, { status: 400 })

    const { data: profile } = await supabaseAdmin.from('profiles').select('id, first_name, last_name, referrer_id').eq('id', newUserId).maybeSingle()
    if (!profile) return NextResponse.json({ ok: true })

    // level 1
    if (profile.referrer_id) {
      const { data: ref1 } = await supabaseAdmin.from('profiles').select('email, first_name, referrer_id').eq('id', profile.referrer_id).maybeSingle()

      const url = 'https://fmecorp.app.n8n.cloud/webhook-test/58f93449-12a4-43d7-b684-741bc5e6273c'

      if (ref1?.email) {
        const u1 = new URL(url)
        u1.searchParams.set('event', 'referral_level1')
        u1.searchParams.set('to', ref1.email)
        u1.searchParams.set('subject', 'New referral joined')
        u1.searchParams.set('userName', `${profile.first_name} ${profile.last_name}`)
        u1.searchParams.set('_ts', new Date().toISOString())
        await fetch(u1.toString(), { method: 'GET' })
      }
      // level 2
      if (ref1?.referrer_id) {
        const { data: ref2 } = await supabaseAdmin.from('profiles').select('email, first_name').eq('id', ref1.referrer_id).maybeSingle()
        if (ref2?.email) {
          const u2 = new URL(url)
          u2.searchParams.set('event', 'referral_level2')
          u2.searchParams.set('to', ref2.email)
          u2.searchParams.set('subject', 'Second-level referral joined')
          u2.searchParams.set('userName', `${profile.first_name} ${profile.last_name}`)
          u2.searchParams.set('_ts', new Date().toISOString())
          await fetch(u2.toString(), { method: 'GET' })
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

