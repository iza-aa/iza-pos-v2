import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '../utils';

/**
 * Hook to validate if staff/manager still exists in database
 * Auto-logout and redirect if user has been deleted or deactivated
 * 
 * @param redirectUrl - URL to redirect to if session invalid (default: login page based on role)
 */
export function useSessionValidation(redirectUrl?: string) {
  const router = useRouter();

  useEffect(() => {
    const validateSession = async () => {
      const user = getCurrentUser();

      // Only validate staff and manager (owner doesn't need validation)
      if (!user || user.role === 'owner') {
        return;
      }

      // Query via server route (service-role key) so RLS on `staff` can't
      // block this check — the app uses a custom PIN session, not Supabase
      // Auth, so there is no auth.uid() for client-side RLS to match against.
      const result = await fetch(`/api/session/validate?id=${encodeURIComponent(user.id)}`)
        .then((response) => response.json())
        .catch(() => null);

      // If user not found or inactive, logout
      if (!result || !result.valid) {
        console.warn(`[Session Validation] User not found or inactive - logging out`);
        localStorage.clear();
        
        // Determine redirect URL
        const defaultRedirect = user.role === 'manager' ? '/manager/login' : '/staff/login';
        router.push(redirectUrl || defaultRedirect);
      }
    };

    validateSession();
  }, [router, redirectUrl]);
}
