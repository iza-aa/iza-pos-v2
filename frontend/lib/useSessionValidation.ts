import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from './supabaseClient';
import { getCurrentUser } from './authUtils';

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

      // Query database to check if user still exists and is active
      const { data, error } = await supabase
        .from('staff')
        .select('id, status, role')
        .eq('id', user.id)
        .maybeSingle();

      // If user not found or inactive, logout
      if (error || !data || data.status !== 'active') {
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
