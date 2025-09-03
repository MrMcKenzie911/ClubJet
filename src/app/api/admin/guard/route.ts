import { NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const supabase = getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', req.url))
  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') return NextResponse.redirect(new URL('/login', req.url))
  return NextResponse.json({ ok: true })
}

