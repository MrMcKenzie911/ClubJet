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
      if (ref1?.email) {
        await fetch(process.env.VAPI_WEBHOOK_URL!, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'referral_level1', to: ref1.email, subject: 'New referral joined', userName: `${profile.first_name} ${profile.last_name}` })
        })
      }
      // level 2
      if (ref1?.referrer_id) {
        const { data: ref2 } = await supabaseAdmin.from('profiles').select('email, first_name').eq('id', ref1.referrer_id).maybeSingle()
        if (ref2?.email) {
          await fetch(process.env.VAPI_WEBHOOK_URL!, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'referral_level2', to: ref2.email, subject: 'Second-level referral joined', userName: `${profile.first_name} ${profile.last_name}` })
          })
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

