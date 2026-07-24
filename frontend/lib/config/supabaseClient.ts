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
          let token: string | undefined;
          for (const cookie of cookies) {
            const [name, value] = cookie.split('=').map((c) => c.trim());
            if (name === 'sb-access-token') {
              token = value;
              break;
            }
          }
          if (token) {
            options = options || {};
            const headers = new Headers(options.headers);
            headers.set('Authorization', `Bearer ${token}`);
            options.headers = headers;
          }
        }
        return fetch(url, options);
      },
    },
  }
)