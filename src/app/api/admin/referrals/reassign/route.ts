import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { buildReferralChain, findReferrerIdByCodeOrEmail } from '@/lib/referral'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as { userId?: string, referrerCode?: string|null, referrerEmail?: string|null }
    const userId = String(body.userId || '')
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    // find direct referrer id
    const directReferrerId = await findReferrerIdByCodeOrEmail({ code: body.referrerCode ?? null, email: body.referrerEmail ?? null })

    // update user's direct referrer
    const { error: upErr } = await supabaseAdmin.from('profiles').update({ referrer_id: directReferrerId }).eq('id', userId)
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    // reset and rebuild referral chain row for user
    await supabaseAdmin.from('referral_relationships').delete().eq('user_id', userId)
    await buildReferralChain(userId, directReferrerId)

    try { revalidatePath('/admin'); revalidatePath('/dashboard') } catch {}
    return NextResponse.json({ ok: true, referrerId: directReferrerId })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

