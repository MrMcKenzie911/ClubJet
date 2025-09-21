import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  try {
    const { email, pin } = await req.json()
    const em = (email || '').trim().toLowerCase()
    const pw = (pin || '').trim()
    
    if (!em || !pw) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
    }

    // Get profile by email to verify PIN and approval status
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, pin_code, role, approval_status')
      .eq('email', em)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Check if user is approved
    if (profile.approval_status !== 'approved' && profile.role !== 'user' && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Account pending approval' }, { status: 403 })
    }

    // Verify PIN matches - handle both 4-digit and 6-digit PINs
    const storedPin = profile.pin_code || ''
    let pinMatches = false

    if (storedPin === pw) {
      pinMatches = true
    } else if (pw.length === 4 && storedPin === pw + '00') {
      // Handle case where user enters 4-digit PIN but stored PIN is 6-digit (e.g., 5629 vs 562900)
      pinMatches = true
    } else if (pw.length === 6 && storedPin.length === 4 && pw === storedPin + '00') {
      // Handle case where user enters 6-digit PIN but stored PIN is 4-digit
      pinMatches = true
    }

    if (!pinMatches) {
      console.log(`PIN mismatch for ${em}: entered="${pw}", stored="${storedPin}"`)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Ensure auth password matches PIN (self-healing) - use 6-digit version for Supabase
    const authPassword = pw.length === 4 ? pw + '00' : pw
    try {
      await supabaseAdmin.auth.admin.updateUserById(profile.id, { password: authPassword })
    } catch (e) {
      console.warn('Failed to update password to PIN', e)
    }

    // Sign in with the PIN directly (server sets cookies) - use 6-digit version
    const supabase = createRouteHandlerClient({ cookies })
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: em,
      password: authPassword
    })

    if (signInError) {
      console.error('Sign-in error:', signInError)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

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

    return NextResponse.json({ 
      ok: true, 
      role: roleOut, 
      is_founding_member: isFounderOut 
    })
    
  } catch (error) {
    console.error('PIN login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
