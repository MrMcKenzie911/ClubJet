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

    // SIMPLIFIED: Convert 4-digit PIN to 6-digit for consistency
    let userPin = pw
    if (pw.length === 4) {
      userPin = pw + '00'  // Convert 5629 -> 562900
    }

    // Ensure stored PIN is also 6-digit format
    let storedPin = profile.pin_code || ''
    if (storedPin.length === 4) {
      storedPin = storedPin + '00'
      // Update database to 6-digit format
      await supabaseAdmin.from('profiles').update({ pin_code: storedPin }).eq('id', profile.id)
    }

    if (storedPin !== userPin) {
      console.log(`PIN mismatch for ${em}: entered="${userPin}", stored="${storedPin}"`)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Ensure auth password matches 6-digit PIN (self-healing)
    try {
      await supabaseAdmin.auth.admin.updateUserById(profile.id, { password: userPin })
    } catch (e) {
      console.warn('Failed to update password to PIN', e)
    }

    // Sign in with the 6-digit PIN (server sets cookies)
    const supabase = createRouteHandlerClient({ cookies })
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: em,
      password: userPin
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
