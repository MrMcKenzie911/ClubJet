import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { id, email, first_name, last_name, phone, referral_code, account_type, investment_amount } = body || {}
    if (!id || !email) return NextResponse.json({ error: 'Missing id or email' }, { status: 400 })

    // Determine referrer (by code or email passed via referral_code or referrer_email)
    let referrer_id: string | null = null
    const referrer_email = body?.referrer_email as string | undefined
    if (referral_code || referrer_email) {
      const { findReferrerIdByCodeOrEmail } = await import('@/lib/referral')
      referrer_id = await findReferrerIdByCodeOrEmail({ code: referral_code, email: referrer_email })
    }

    const { error } = await supabaseAdmin.from('profiles').upsert({
      id,
      email,
      first_name,
      last_name,
      phone,
      // Do NOT set referral_code here; this value in the payload represents the REFERRER code.
      // We will generate a unique referral_code for the new user below.
      referrer_id: referrer_id ?? null,
      role: 'pending',
      approval_status: 'pending',
      updated_at: new Date().toISOString(),
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Ensure the new user has their OWN unique referral_code (avoid duplicate key violations)
    try {
      const { ensureUserReferralCode, buildReferralChain } = await import('@/lib/referral')
      await ensureUserReferralCode(id)
      // Build referral chain row
      await buildReferralChain(id, referrer_id ?? null)
    } catch {}

    // Ensure an initial account exists so it appears as "Pending" on the admin side
    const acctType = (account_type === 'NETWORK' || account_type === 'LENDER') ? account_type : 'LENDER'
    const { data: acctRows } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('user_id', id)
      .order('created_at', { ascending: true })
      .limit(1);
    let accountId = Array.isArray(acctRows) && acctRows.length > 0 ? acctRows[0].id : null;
    if (!accountId) {
      const minBal = acctType === 'NETWORK' ? 500 : 5000
      // Set lockup: NETWORK 6 months, LENDER 12 months
      const months = acctType === 'NETWORK' ? 6 : 12
      const end = new Date(); end.setMonth(end.getMonth() + months)
      const { data: created } = await supabaseAdmin.from('accounts').insert({ user_id: id, type: acctType, balance: 0, minimum_balance: minBal, lockup_end_date: end.toISOString().slice(0,10) }).select('id').maybeSingle()
      accountId = created?.id ?? null
    }
    // Set initial_balance to investment_amount for KPI baseline (does not credit balance)
    const inv = Number(investment_amount || 0)
    if (accountId && inv > 0) {
      await supabaseAdmin.from('accounts').update({ initial_balance: inv }).eq('id', accountId)
      // Also create a pending deposit so admin can approve and post the funds later
      try {
        await supabaseAdmin.from('pending_deposits').insert({ user_id: id, amount: inv, account_type: acctType })
      } catch {}
    }

    // Notify referrers (level 1 and 2)
    try {
      await fetch(process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/notify-referrers` : '/api/notify-referrers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newUserId: id })
      })
    } catch {}

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

