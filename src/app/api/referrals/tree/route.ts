import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId') || ''
  const isAdmin = searchParams.get('isAdmin') === '1'
  if (!userId) return NextResponse.json({ level1: [], level2: [] })

  const { data: level1 } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name, created_at')
    .eq('referrer_id', userId)

  const l1Ids = (level1 || []).map(u => u.id)
  const { data: level2 } = l1Ids.length > 0 ? await supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name, created_at, referrer_id')
    .in('referrer_id', l1Ids) : { data: [] as { id: string, first_name: string|null, last_name: string|null, created_at: string|null, referrer_id: string|null }[] }

  if (isAdmin) {
    // For admins, could expand beyond level 2; minimal now per requirement
  }

  return NextResponse.json({ level1: level1 || [], level2: level2 || [] })
}

