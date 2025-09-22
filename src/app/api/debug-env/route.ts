import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Only show this in development or for debugging
    const isDev = process.env.NODE_ENV === 'development'
    
    if (!isDev) {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }
    
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'SET' : 'MISSING',
      ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
      SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ? 'SET' : 'MISSING',
      // Show last 10 characters of keys for verification (safe)
      ANON_KEY_SUFFIX: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(-10) || 'MISSING',
      SERVICE_KEY_SUFFIX: process.env.SUPABASE_SERVICE_KEY?.slice(-10) || 'MISSING',
    }
    
    return NextResponse.json(envCheck)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check environment' }, { status: 500 })
  }
}
