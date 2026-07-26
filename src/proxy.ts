import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Next.js 16 proxy (formerly middleware): refresh the Supabase session and
// gate the app behind auth. Data authorization lives in RLS + server actions.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const pendingCookies: { name: string; value: string; options?: CookieOptions }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          pendingCookies.push(...cookiesToSet)
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isPublicPath =
    pathname.startsWith('/login') ||
    pathname === '/auth/callback' ||
    pathname === '/api/leads' ||
    pathname.startsWith('/lead')

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    if (pathname !== '/') url.searchParams.set('redirectTo', pathname + request.nextUrl.search)
    const redirectResponse = NextResponse.redirect(url)
    pendingCookies.forEach(({ name, value, options }) => redirectResponse.cookies.set(name, value, options))
    return redirectResponse
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    const redirectResponse = NextResponse.redirect(url)
    pendingCookies.forEach(({ name, value, options }) => redirectResponse.cookies.set(name, value, options))
    return redirectResponse
  }

  const response = NextResponse.next({ request: { headers: request.headers } })
  pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
