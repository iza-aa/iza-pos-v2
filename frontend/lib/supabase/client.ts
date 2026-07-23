/**
 * Supabase Client (Browser)
 * Client-side Supabase instance for browser use
 */

import { createBrowserClient } from '@supabase/ssr';
import { getStoredCustomerAccount } from '@/lib/customer/customerAccount';

export function createClient() {
  let token: string | undefined;

  // 1. Check for staff/manager/owner token in cookies
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.split('=').map((c) => c.trim());
      if (name === 'sb-access-token') {
        token = value;
        break;
      }
    }
    
    // 2. Check for customer token in localStorage
    if (!token) {
      const customerSession = getStoredCustomerAccount();
      if (customerSession?.supabase_token) {
        token = customerSession.supabase_token;
      }
    }
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    }
  );
}
