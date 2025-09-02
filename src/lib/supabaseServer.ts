import { cookies } from 'next/headers'
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createServerClient, type CookieOptions } from '@supabase/ssr'

export function getSupabaseServer() {
  const cookieStore: any = cookies() as any
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get?.(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try { cookieStore.set?.({ name, value, ...options }) } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try { cookieStore.set?.({ name, value: '', ...options }) } catch {}
        },
      },
    }
  )
  return supabase
}

