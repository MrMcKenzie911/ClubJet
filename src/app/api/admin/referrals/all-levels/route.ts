import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId') || ''
  const maxDepth = Number(searchParams.get('maxDepth') || '10')
  if (!userId) return NextResponse.json({ levels: [] })

  const levels: { level: number, users: { id: string, first_name: string|null, last_name: string|null, email: string|null, created_at: string|null }[] }[] = []
  let currentIds: string[] = [userId]
  for (let depth = 1; depth <= maxDepth && currentIds.length > 0; depth++) {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, email, created_at')
      .in('referrer_id', currentIds)
    if (data && data.length > 0) {
      levels.push({ level: depth, users: data })
      currentIds = data.map(u => u.id)
    } else {
      break
    }
  }

  return NextResponse.json({ levels })
}

