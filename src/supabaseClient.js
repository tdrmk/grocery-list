import { createClient } from '@supabase/supabase-js'

// iOS gives Safari and PWA standalone mode separate localStorage, so sessions
// don't carry over when opening from the home screen. Cookies are shared across
// both contexts, so we use them as the auth storage backend.
const cookieStorage = {
  getItem(key) {
    const match = document.cookie.split('; ').find(c => c.startsWith(key + '='))
    if (match) return decodeURIComponent(match.slice(key.length + 1))
    // Fall back to localStorage so existing logged-in users aren't signed out.
    // The session migrates to a cookie on the next token refresh.
    try { return localStorage.getItem(key) } catch { return null }
  },
  setItem(key, value) {
    const maxAge = 180 * 24 * 60 * 60 // 180 days — matches configured session duration
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`
  },
  removeItem(key) {
    document.cookie = `${key}=; path=/; max-age=0`
  },
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { storage: cookieStorage } }
)
