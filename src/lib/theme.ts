import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'

export type ThemeMode = 'light' | 'dark' | 'system'

const VALID: ThemeMode[] = ['light', 'dark', 'system']
const COOKIE = 'aurora-theme'

export function isValidTheme(v: unknown): v is ThemeMode {
  return typeof v === 'string' && (VALID as string[]).includes(v)
}

export async function getTheme(): Promise<ThemeMode> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(COOKIE)?.value
  if (isValidTheme(fromCookie)) return fromCookie

  try {
    const supabase = await createServerClient()
    const { data } = await supabase.rpc('get_settings', { p_key: 'theme' })
    if (typeof data === 'string' && isValidTheme(data)) return data
    if (data && typeof data === 'object' && 'theme' in data) {
      const inner = (data as Record<string, unknown>).theme
      if (isValidTheme(inner)) return inner
    }
  } catch {
    // graceful fallback — settings table missing or RPC not yet wired
  }

  return 'light'
}

export async function setThemeCookie(theme: ThemeMode) {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE, theme, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
}

export function htmlClassFor(theme: ThemeMode): string {
  return theme === 'dark' ? 'dark' : ''
}

export const THEME_COOKIE_NAME = COOKIE
export const VALID_THEMES = VALID
