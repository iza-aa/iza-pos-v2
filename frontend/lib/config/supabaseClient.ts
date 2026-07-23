import { createClient } from '@supabase/supabase-js'

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
      fetch: (url, options) => {
        if (typeof document !== 'undefined') {
          const cookies = document.cookie.split(';');
          for (const cookie of cookies) {
            const [name, value] = cookie.split('=').map((c) => c.trim());
            if (name === 'sb-access-token') {
              options = options || {};
              options.headers = {
                ...options.headers,
                Authorization: `Bearer ${value}`,
              };
              break;
            }
          }
        }
        return fetch(url, options);
      },
    },
  }
)