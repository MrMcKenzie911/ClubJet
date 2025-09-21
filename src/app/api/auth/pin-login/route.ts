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

    // Verify PIN matches
    if (profile.pin_code !== pw) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Ensure auth password matches PIN (self-healing)
    try {
      await supabaseAdmin.auth.admin.updateUserById(profile.id, { password: pw })
    } catch (e) {
      console.warn('Failed to update password to PIN', e)
    }

    // Sign in with the PIN directly (server sets cookies)
    const supabase = createRouteHandlerClient({ cookies })
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: em,
      password: pw
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
