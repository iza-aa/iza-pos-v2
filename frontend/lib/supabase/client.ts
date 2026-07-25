/**
 * Supabase Client (Browser)
 * Client-side Supabase instance for browser use
 */

import { createBrowserClient } from '@supabase/ssr';
import { getStoredCustomerAccount } from '@/lib/customer/customerAccount';
import { createSupabaseTokenRefreshingFetch } from '@/lib/supabase/customJwtRefresh';

const getBrowserSupabaseToken = () => {
  if (typeof document === 'undefined') return undefined;

  const staffToken = document.cookie
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith('sb-access-token='))
    ?.slice('sb-access-token='.length);
  if (staffToken) return staffToken;

  return getStoredCustomerAccount()?.supabase_token;
};

const authorizeWithCurrentToken = (options: RequestInit = {}) => {
  const token = getBrowserSupabaseToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return { ...options, headers };
};

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: createSupabaseTokenRefreshingFetch({
          fetchImpl: fetch,
          refreshPath: '/api/session/refresh-supabase-token',
          authorizeRequest: authorizeWithCurrentToken,
        }),
      },
    }
  );
}
