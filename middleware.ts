import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const url = req.nextUrl

  // On /login, clear sb-* cookies and return early (avoid any auto re-hydration)
  if (url.pathname === '/login') {
    const cookiesIn = req.cookies.getAll()
    for (const c of cookiesIn) {
      if (c.name.startsWith('sb-')) {
        res.cookies.set({ name: c.name, value: '', path: '/', expires: new Date(0) })
      }
    }
    return res
  }

  const supabase = createMiddlewareClient({ req, res })
  const { data: { user } } = await supabase.auth.getUser()

  const protectedPaths = ['/dashboard', '/admin']
  const isProtected = protectedPaths.some((p) => url.pathname.startsWith(p))

  if (isProtected && !user) {
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ]
}

