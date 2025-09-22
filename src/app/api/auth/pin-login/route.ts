import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  console.log('🔐 PIN Login API called')

  try {
    // Test environment variables first
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    if (!process.env.SUPABASE_SERVICE_KEY) {
      console.error('❌ Missing SUPABASE_SERVICE_KEY')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    console.log('✅ Environment variables present')

    const { email, pin } = await req.json()
    const em = (email || '').trim().toLowerCase()
    const pw = (pin || '').trim()

    console.log(`📧 Login attempt for: ${em}`)
    console.log(`🔢 PIN length: ${pw.length}`)

    if (!em || !pw) {
      console.log('❌ Missing credentials')
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
    }

    // Test Supabase connection
    console.log('🔍 Querying profiles table...')

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, pin_code, role, approval_status')
      .eq('email', em)
      .single()

    if (profileError) {
      console.error('❌ Profile query error:', profileError)
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }

    if (!profile) {
      console.log('❌ No profile found for email')
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    console.log('✅ Profile found:', { id: profile.id, role: profile.role, approval_status: profile.approval_status })

    // Check if user is approved (allow admin and user roles)
    if (profile.approval_status !== 'approved' && profile.role !== 'user' && profile.role !== 'admin') {
      console.log('❌ Account not approved')
      return NextResponse.json({ error: 'Account pending approval' }, { status: 403 })
    }

    // SIMPLE PIN MATCHING - Support both 4-digit and 6-digit
    const storedPin = profile.pin_code || ''
    let pinMatches = false

    console.log(`🔢 Comparing PINs: entered="${pw}", stored="${storedPin}"`)

    // Direct match
    if (storedPin === pw) {
      pinMatches = true
      console.log('✅ Direct PIN match')
    }
    // 4-digit to 6-digit conversion (5629 -> 562900)
    else if (pw.length === 4 && storedPin === pw + '00') {
      pinMatches = true
      console.log('✅ 4-digit to 6-digit PIN match')
    }
    // 6-digit to 4-digit conversion (562900 -> 5629)
    else if (pw.length === 6 && pw.endsWith('00') && storedPin === pw.slice(0, 4)) {
      pinMatches = true
      console.log('✅ 6-digit to 4-digit PIN match')
    }

    if (!pinMatches) {
      console.log('❌ PIN mismatch')
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Use the PIN that was entered for authentication
    const authPassword = pw.length === 4 ? pw + '00' : pw

    console.log('🔐 Attempting Supabase auth...')

    // Ensure auth password matches PIN (self-healing)
    try {
      await supabaseAdmin.auth.admin.updateUserById(profile.id, { password: authPassword })
      console.log('✅ Auth password updated')
    } catch (e) {
      console.warn('⚠️ Failed to update password to PIN', e)
    }

    // Sign in with the PIN (server sets cookies)
    const supabase = createRouteHandlerClient({ cookies })
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: em,
      password: authPassword
    })

    if (signInError) {
      console.error('❌ Supabase sign-in error:', signInError)
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    console.log('✅ Supabase authentication successful')

    // Get user role for redirect
    const { data: userData } = await supabase.auth.getUser()
    const uid = userData?.user?.id || profile.id

    let roleOut = profile.role
    let isFounderOut = false
    
    if (uid) {
      const { data: prof } = await supabaseAdmin
        .from('profiles')
        .select('role, is_founding_member')
        .eq('id', uid)
        .single()
      
      if (prof) {
        roleOut = prof.role
        isFounderOut = prof.is_founding_member === true
      }
    }

    console.log('🎉 Login successful!', { role: roleOut, is_founding_member: isFounderOut })

    return NextResponse.json({
      ok: true,
      role: roleOut,
      is_founding_member: isFounderOut
    })

  } catch (error) {
    console.error('💥 PIN login error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ error: 'Login failed - check server logs' }, { status: 500 })
  }
}
