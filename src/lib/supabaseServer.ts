import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

export function getSupabaseServer() {
  const supabase = createServerComponentClient({ cookies })
  return supabase
}

