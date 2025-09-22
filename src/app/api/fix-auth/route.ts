import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { guaranteeAuthUser } from '@/lib/guaranteedAuthUser'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    console.log(`🔧 MANUAL AUTH FIX for ${email}`)

    // Get profile data
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, pin_code, role')
      .eq('email', email)
      .single()

    if (profileError) {
      return NextResponse.json({ error: 'Profile not found', details: profileError }, { status: 404 })
    }

    if (!profile.pin_code) {
      return NextResponse.json({ error: 'No PIN code found for user' }, { status: 400 })
    }

    // Use bulletproof auth user creation
    const authResult = await guaranteeAuthUser(profile.email, profile.pin_code, profile.id)
    
    if (!authResult.success) {
      return NextResponse.json({ 
        error: 'Auth setup failed', 
        details: authResult.error,
        debugInfo: authResult.details 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Auth user successfully set up for ${email}`,
      authUserId: authResult.authUserId,
      details: authResult.details
    })

  } catch (error) {
    console.error('Manual auth fix error:', error)
    return NextResponse.json({ error: 'Server error', details: error }, { status: 500 })
  }
}
