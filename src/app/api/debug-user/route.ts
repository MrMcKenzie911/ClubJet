import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get('email')
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    // Get profile data
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, pin_code, role')
      .eq('email', email)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Profile not found', details: profileError }, { status: 404 })
    }

    // Search for auth user
    let authUser = null
    let page = 1
    const perPage = 1000
    
    while (true) {
      const { data: authData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
      if (listError) {
        return NextResponse.json({ error: 'Auth list error', details: listError }, { status: 500 })
      }
      
      authUser = authData.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
      if (authUser) break
      
      if (authData.users.length < perPage) break
      page += 1
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        email: profile.email,
        pin_code: profile.pin_code,
        role: profile.role
      },
      authUser: authUser ? {
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at,
        email_confirmed_at: authUser.email_confirmed_at
      } : null
    })

  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: 'Server error', details: error }, { status: 500 })
  }
}
