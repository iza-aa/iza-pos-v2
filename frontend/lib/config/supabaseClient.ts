import { createClient } from '@supabase/supabase-js'
import { createSupabaseTokenRefreshingFetch } from '@/lib/supabase/customJwtRefresh'

const authorizeWithStaffToken = (options: RequestInit = {}) => {
  const headers = new Headers(options.headers)

  if (typeof document !== 'undefined') {
    const token = document.cookie
      .split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith('sb-access-token='))
      ?.slice('sb-access-token='.length)

    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  return { ...options, headers }
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    global: {
      fetch: createSupabaseTokenRefreshingFetch({
        fetchImpl: fetch,
        refreshPath: '/api/session/refresh-supabase-token',
        authorizeRequest: authorizeWithStaffToken,
      }),
    },
  }
)
