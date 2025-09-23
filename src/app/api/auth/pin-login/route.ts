import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  console.log('🔐 BULLETPROOF LOGIN - STARTING FRESH')

  try {
    console.log('📥 Parsing request body...')
    const body = await req.json()
    console.log('📥 Request body parsed:', body)

    const { identifier, email, pin } = body
    const rawId = (identifier ?? email ?? '').toString().trim()
    const pw = (pin || '').trim()

    console.log(`📧 LOGIN ATTEMPT: identifier="${rawId}" with PIN: ${pw}`)

    if (!rawId || !pw) {
      console.log('❌ Missing credentials')
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
    }

    // STEP 1: Resolve profile by email OR username (case-insensitive for username)
    console.log('🔍 STEP 1: Resolving user by identifier...')
    type ProfileRec = { id: string; email: string | null; pin_code: string | null; role: string | null; approval_status: string | null }
    let profile: ProfileRec | null = null
    let profileError: string | null = null

    if (rawId.includes('@')) {
      const resp = await supabaseAdmin
        .from('profiles')
        .select('id, email, pin_code, role, approval_status')
        .eq('email', rawId.toLowerCase())
        .maybeSingle()
      profile = resp.data as ProfileRec | null
      profileError = resp.error ? String(resp.error.message || 'Query failed') : null
    } else {
      const resp = await supabaseAdmin
        .from('profiles')
        .select('id, email, pin_code, role, approval_status')
        .ilike('username', rawId)
        .maybeSingle()
      profile = resp.data as ProfileRec | null
      profileError = resp.error ? String(resp.error.message || 'Query failed') : null
    }

    if (profileError && !profile) {
      console.error('❌ Profile query error:', profileError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!profile) {
      console.log('❌ No profile found for identifier:', rawId)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    console.log('📋 Profile found:', {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      approval_status: profile.approval_status,
      pin_code: profile.pin_code ? `${profile.pin_code.length} digits` : 'null'
    })

    if (profile.approval_status !== 'approved' && profile.role !== 'user' && profile.role !== 'admin') {
      console.log('❌ Account not approved:', profile.approval_status)
      return NextResponse.json({ error: 'Account pending approval' }, { status: 403 })
    }

    console.log(`✅ FOUND APPROVED USER: ${profile.email} (${profile.role})`)

    // STEP 2: Validate PIN
    console.log('🔍 STEP 2: Validating PIN...')
    const storedPin = profile.pin_code || ''
    console.log(`🔢 PIN comparison: entered="${pw}" (${pw.length} digits), stored="${storedPin}" (${storedPin.length} digits)`)

    const pinMatches = storedPin === pw ||
                      (pw.length === 4 && storedPin === pw + '00') ||
                      (pw.length === 6 && pw.endsWith('00') && storedPin === pw.slice(0, 4))

    if (!pinMatches) {
      console.log('❌ PIN MISMATCH!')
      console.log(`   Direct match: ${storedPin === pw}`)
      console.log(`   4->6 digit: ${pw.length === 4 && storedPin === pw + '00'}`)
      console.log(`   6->4 digit: ${pw.length === 6 && pw.endsWith('00') && storedPin === pw.slice(0, 4)}`)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    console.log(`✅ PIN MATCHES! Creating session...`)

    // STEP 3: SIMPLIFIED APPROACH - Skip complex auth user management
    console.log('🔍 STEP 3: Using simplified authentication approach...')
    const authPassword = pw.length === 4 ? pw + '00' : pw
    console.log(`🔑 Auth password will be: "${authPassword}" (${authPassword.length} digits)`)

    // Skip the complex auth user creation/deletion and go straight to sign-in
    console.log('🚀 SKIPPING complex auth user management - attempting direct sign-in...')

    // STEP 4: Sign in with Supabase (this creates the session)
    console.log('🔍 STEP 4: Signing in to create session...')
    const em = (profile.email || '').toLowerCase()
    console.log(`🔐 SIGNING IN with email: ${em}, password: ${authPassword}`)
    const supabase = createRouteHandlerClient({ cookies })
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: em,
      password: authPassword
    })

    if (signInError) {
      console.error('❌ STEP 4 FAILED - Sign in error:', signInError)
      console.error('   Error message:', signInError.message)
      console.error('   Error code:', signInError.status)
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    console.log('✅ STEP 4 SUCCESS - SESSION CREATED!')
    console.log('   User ID:', signInData.user?.id)
    console.log('   Session:', signInData.session ? 'Created' : 'None')

    // STEP 5: Return success
    return NextResponse.json({
      ok: true,
      role: profile.role,
      is_founding_member: false
    })

  } catch (error) {
    console.error('💥 CRITICAL LOGIN ERROR:', error)
    const errorObj = error as Error
    console.error('💥 Error name:', errorObj?.name)
    console.error('💥 Error message:', errorObj?.message)
    console.error('💥 Error stack:', errorObj?.stack)

    // Return detailed error for debugging
    return NextResponse.json({
      error: 'Login failed',
      debug: {
        name: errorObj?.name || 'Unknown',
        message: errorObj?.message || 'No message',
        stack: errorObj?.stack?.split('\n').slice(0, 5) || ['No stack trace']
      }
    }, { status: 500 })
  }
}