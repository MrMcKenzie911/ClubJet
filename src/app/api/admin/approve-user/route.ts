import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  console.log('🔐 Admin approve-user API called')

  try {
    // Verify admin access
    const supa = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supa.auth.getUser()
    if (!user) {
      console.log('❌ No authenticated user')
      return NextResponse.redirect(new URL('/login', req.url))
    }

    const { data: me } = await supa.from('profiles').select('role').eq('id', user.id).single()
    if (me?.role !== 'admin') {
      console.log('❌ User is not admin')
      return NextResponse.redirect(new URL('/login', req.url))
    }

    const form = await req.formData()
    const userId = String(form.get('user_id') || '')
    const action = String(form.get('action') || '')

    console.log(`📋 Processing action: ${action} for user: ${userId}`)

    if (!userId) {
      console.log('❌ Missing user_id')
      return NextResponse.redirect(new URL('/admin?toast=error', req.url))
    }

    if (action === 'reject') {
      console.log('🚫 Rejecting user')
      await supabaseAdmin.from('profiles').update({
        role: 'rejected',
        approval_status: 'rejected'
      }).eq('id', userId)
      return NextResponse.redirect(new URL('/admin?toast=user_rejected', req.url))
    }

    // Get profile to get email and PIN for auth user creation
    console.log('📋 Fetching user profile...')
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email, pin_code, investment_amount, account_type')
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('❌ Profile fetch error:', profileError)
      return NextResponse.redirect(new URL('/admin?toast=error', req.url))
    }

    if (!profile?.email) {
      console.log('❌ Missing email in profile')
      return NextResponse.redirect(new URL('/admin?toast=error', req.url))
    }

    if (!profile?.pin_code) {
      console.log('❌ Missing PIN in profile')
      return NextResponse.redirect(new URL('/admin?toast=error', req.url))
    }

    console.log('✅ Profile found:', { email: profile.email, pin_length: profile.pin_code.length, investment: profile.investment_amount })

    // Create auth user with PIN as password if doesn't exist
    console.log('🔐 Setting up Supabase authentication...')
    try {
      const { data: authList, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      if (listError) {
        console.error('❌ Failed to list auth users:', listError)
        throw listError
      }

      const existingAuth = authList?.users?.find((u: { email?: string; id: string }) => u.email === profile.email)

      if (!existingAuth) {
        console.log('🆕 Creating new auth user...')
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: profile.email,
          password: profile.pin_code,
          email_confirm: true
        })

        if (createError) {
          console.error('❌ Auth user creation failed:', createError)
          throw createError
        }

        console.log('✅ Auth user created:', newUser.user?.id)
      } else {
        console.log('🔄 Updating existing auth user password...')
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(existingAuth.id, {
          password: profile.pin_code
        })

        if (updateError) {
          console.error('❌ Auth password update failed:', updateError)
          throw updateError
        }

        console.log('✅ Auth password updated for:', existingAuth.id)
      }
    } catch (authError) {
      console.error('💥 Auth setup failed:', authError)
      return NextResponse.redirect(new URL('/admin?toast=auth_error', req.url))
    }

    // Update profile status
    console.log('📝 Updating profile status to approved...')
    const { error: profileUpdateError } = await supabaseAdmin.from('profiles').update({
      role: 'user',
      approval_status: 'approved'
    }).eq('id', userId)

    if (profileUpdateError) {
      console.error('❌ Profile update failed:', profileUpdateError)
      return NextResponse.redirect(new URL('/admin?toast=error', req.url))
    }

    // Create/update account
    console.log('💰 Setting up user account...')
    const { data: acct, error: acctFindError } = await supabaseAdmin.from('accounts')
      .select('id, balance').eq('user_id', userId).maybeSingle()

    if (acctFindError) {
      console.error('❌ Account lookup failed:', acctFindError)
      return NextResponse.redirect(new URL('/admin?toast=error', req.url))
    }

    if (!acct) {
      const accountType = profile.account_type || 'LENDER'
      const minBalance = accountType === 'NETWORK' ? 500 : 5000

      console.log(`🆕 Creating new ${accountType} account with min balance ${minBalance}...`)

      const { error: acctCreateError } = await supabaseAdmin.from('accounts').insert({
        user_id: userId,
        type: accountType,
        balance: 0,
        minimum_balance: minBalance
      })

      if (acctCreateError) {
        console.error('❌ Account creation failed:', acctCreateError)
        return NextResponse.redirect(new URL('/admin?toast=error', req.url))
      }

      console.log('✅ Account created successfully')
    } else {
      console.log('✅ Account already exists:', acct.id)
    }

    // Create pending deposit if investment amount specified
    if (profile.investment_amount && Number(profile.investment_amount) > 0) {
      console.log(`💵 Creating pending deposit for $${profile.investment_amount}...`)

      const { error: pendingDepositError } = await supabaseAdmin.from('pending_deposits').insert({
        user_id: userId,
        amount: Number(profile.investment_amount),
        account_type: profile.account_type || 'LENDER'
      })

      if (pendingDepositError) {
        console.log('⚠️ Pending deposit creation failed (continuing):', pendingDepositError)
      } else {
        console.log('✅ Pending deposit created')
      }
    }

    // Process deposits if any
    console.log('🔄 Processing initial deposits...')
    try {
      const { processInitialDeposit } = await import('@/lib/initialDeposit')
      await processInitialDeposit(userId)
      console.log('✅ Initial deposit processed')
    } catch (depositError) {
      console.log('⚠️ Initial deposit processing failed (continuing):', depositError)
    }

    console.log('🎉 User approval completed successfully!')
    return NextResponse.redirect(new URL('/admin?toast=user_approved', req.url))
  } catch (e) {
    console.error('💥 approve-user error:', e)
    console.error('Error stack:', e instanceof Error ? e.stack : 'No stack trace')
    return NextResponse.redirect(new URL('/admin?toast=error', req.url))
  }
}
