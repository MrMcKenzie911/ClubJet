import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { 
      email, 
      password, 
      first_name, 
      last_name, 
      phone, 
      referral_code, 
      referrer_email, 
      account_type, 
      investment_amount 
    } = body || {}

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
    }

    console.log('🚀 BULLETPROOF SIGNUP for:', { email, account_type })

    // 🛡️ STEP 1: Get or create CONFIRMED auth user
    let userId: string

    // First, check if auth user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (existingUser) {
      console.log('✅ Auth user already exists:', { userId: existingUser.id, email })
      userId = existingUser.id

      // Check if they already have a profile
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, role, approval_status')
        .eq('id', existingUser.id)
        .single()

      if (existingProfile) {
        console.log('❌ User already has profile:', existingProfile)
        return NextResponse.json({
          error: 'Email already registered. Please contact support if you need assistance.'
        }, { status: 400 })
      }
    } else {
      // Create new auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // ✅ CONFIRMED immediately - no email verification needed
      })

      if (authError || !authData.user) {
        console.error('❌ Auth user creation failed:', authError)
        return NextResponse.json({
          error: authError?.message || 'Failed to create auth user'
        }, { status: 500 })
      }

      userId = authData.user.id
      console.log('✅ New auth user created:', { userId, email })
    }

    // 🛡️ STEP 2: Determine referrer (by code or email)
    let referrer_id: string | null = null
    if (referral_code || referrer_email) {
      const { findReferrerIdByCodeOrEmail } = await import('@/lib/referral')
      referrer_id = await findReferrerIdByCodeOrEmail({ 
        code: referral_code, 
        email: referrer_email 
      })
    }

    // 🛡️ STEP 3: Create profile immediately (auth user guaranteed to exist)
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email,
      first_name,
      last_name,
      phone,
      pin_code: password, // Store password as PIN for login
      referrer_id: referrer_id ?? null,
      account_type: account_type || 'LENDER', // Store the account type
      investment_amount: Number(investment_amount || 0), // Store the investment amount
      role: 'pending',
      approval_status: 'pending',
      updated_at: new Date().toISOString(),
    })

    if (profileError) {
      console.error('❌ Profile creation failed:', profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    console.log('✅ Profile created successfully')

    // 🛡️ STEP 4: Generate referral code and build referral chain
    try {
      const { ensureUserReferralCode, buildReferralChain } = await import('@/lib/referral')
      await ensureUserReferralCode(userId)
      await buildReferralChain(userId, referrer_id ?? null)
      console.log('✅ Referral chain built')
    } catch (referralError) {
      console.warn('⚠️ Referral setup failed:', referralError)
      // Don't fail signup for referral issues
    }

    // 🛡️ STEP 5: Create initial account
    const acctType = (account_type === 'NETWORK' || account_type === 'LENDER') ? account_type : 'LENDER'
    const { data: acctRows } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    let accountId = Array.isArray(acctRows) && acctRows.length > 0 ? acctRows[0].id : null

    if (!accountId) {
      const minBal = acctType === 'NETWORK' ? 500 : 5000
      const months = acctType === 'NETWORK' ? 6 : 12
      const end = new Date()
      end.setMonth(end.getMonth() + months)

      const { data: created } = await supabaseAdmin.from('accounts').insert({
        user_id: userId,
        type: acctType,
        balance: 0,
        minimum_balance: minBal,
        lockup_end_date: end.toISOString().slice(0, 10)
      }).select('id').maybeSingle()

      accountId = created?.id ?? null
      console.log('✅ Account created:', { accountId, type: acctType })
    }

    // 🛡️ STEP 6: Set initial balance and create pending deposit
    const inv = Number(investment_amount || 0)
    if (accountId && inv > 0) {
      await supabaseAdmin.from('accounts').update({ 
        initial_balance: inv 
      }).eq('id', accountId)

      try {
        await supabaseAdmin.from('pending_deposits').insert({
          user_id: userId,
          amount: inv,
          account_type: acctType
        })
        console.log('✅ Pending deposit created:', { amount: inv })
      } catch (depositError) {
        console.warn('⚠️ Pending deposit failed:', depositError)
      }
    }

    // 🛡️ STEP 7: Notify referrers
    try {
      await fetch(process.env.NEXT_PUBLIC_SITE_URL ? 
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/notify-referrers` : 
        '/api/notify-referrers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newUserId: userId })
      })
      console.log('✅ Referrer notifications sent')
    } catch (notifyError) {
      console.warn('⚠️ Referrer notification failed:', notifyError)
    }

    // 🛡️ STEP 8: Send to n8n webhook - DIRECT & BULLETPROOF
    try {
      console.log('📤 Sending signup data to n8n webhook...')

      const n8nWebhookUrl = 'https://fmecorp.app.n8n.cloud/webhook-test/58f93449-12a4-43d7-b684-741bc5e6273c'

      // Build query parameters with all signup data
      const params = new URLSearchParams({
        event: 'signup',
        email: email || '',
        first_name: first_name || '',
        last_name: last_name || '',
        phone: phone || '',
        referral_code: referral_code || '',
        referrer_email: referrer_email || '',
        account_type: account_type || '',
        investment_amount: String(investment_amount || 0),
        user_id: userId,
        timestamp: new Date().toISOString()
      })

      console.log('📋 Sending to n8n:', `${n8nWebhookUrl}?${params.toString()}`)

      const response = await fetch(`${n8nWebhookUrl}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'ClubAureus-Signup/1.0'
        }
      })

      if (response.ok) {
        const responseText = await response.text().catch(() => 'No response body')
        console.log('✅ n8n webhook sent successfully:', response.status, responseText)
      } else {
        console.error('❌ n8n webhook failed:', response.status, await response.text().catch(() => 'No error body'))
      }
    } catch (webhookError) {
      console.error('💥 n8n webhook error:', webhookError)
      // Don't fail signup for webhook issues, but log prominently
    }

    console.log('🎉 SIGNUP COMPLETED SUCCESSFULLY:', { userId, email })

    return NextResponse.json({ 
      success: true, 
      message: 'Signup completed successfully',
      userId 
    })

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Server error'
    console.error('💥 SIGNUP FAILED:', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
