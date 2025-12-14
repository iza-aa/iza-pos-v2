/**
 * Auth Utilities
 * Authentication and authorization related utilities
 */

/**
 * User roles available in the system
 */
export type UserRole = 'owner' | 'manager' | 'staff';

/**
 * Staff types available in the system
 */
export type StaffType = 'cashier' | 'waiter' | 'barista' | 'kitchen' | null;

/**
 * Current user information from localStorage
 */
export interface CurrentUser {
  id: string;
  role: UserRole;
  name: string;
  staffType: StaffType;
  staffCode: string;
}

/**
 * Extended staff information including role abbreviation
 */
export interface StaffInfo extends CurrentUser {
  roleAbbr: 'OWN' | 'MAN' | 'STA';
}

/**
 * Get current user information from localStorage
 * @returns Current user data or null if not logged in
 */
export function getCurrentUser(): CurrentUser | null {
  if (typeof window === 'undefined') return null;
  
  const id = localStorage.getItem('user_id');
  if (!id) return null;
  
  return {
    id,
    role: (localStorage.getItem('user_role') || 'staff') as UserRole,
    name: localStorage.getItem('user_name') || 'Unknown User',
    staffType: localStorage.getItem('staff_type') as StaffType,
    staffCode: localStorage.getItem('staff_code') || 'UNKNOWN',
  };
}

/**
 * Get current staff information with role abbreviation
 * Useful for activity logs and tracking
 * @returns Extended staff info or null if not logged in
 */
export function getCurrentStaffInfo(): StaffInfo | null {
  const user = getCurrentUser();
  if (!user) return null;
  
  const roleAbbr = user.role === 'owner' 
    ? 'OWN' 
    : user.role === 'manager' 
    ? 'MAN' 
    : 'STA';
  
  return {
    ...user,
    roleAbbr,
  };
}

/**
 * Check if user is authenticated
 * @returns true if user is logged in
 */
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

/**
 * Clear all authentication data from localStorage
 */
export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.clear();
}

/**
 * Character set for generating random codes (alphanumeric uppercase)
 */
const UPPERCASE_ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Character set for generating random codes (alphanumeric mixed case)
 */
const MIXED_ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Generate random alphanumeric code
 * @param length - Length of the code to generate
 * @param uppercase - If true, generates uppercase only (default: true)
 * @returns Random alphanumeric string
 */
export function generateRandomCode(length: number = 6, uppercase: boolean = true): string {
  const chars = uppercase ? UPPERCASE_ALPHANUMERIC : MIXED_ALPHANUMERIC;
  let result = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  
  return result;
}

/**
 * Generate staff login code (6 characters, uppercase)
 * @returns Staff login code
 */
export function generateStaffLoginCode(): string {
  return generateRandomCode(6, true);
}

/**
 * Check if a login code is valid (not expired)
 * @param expiresAt - ISO date string of expiration
 * @returns true if code is still valid
 */
export function isLoginCodeExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

/**
 * Validate login code format (6 alphanumeric uppercase)
 * @param code - Code to validate
 * @returns true if valid format
 */
export function validateLoginCodeFormat(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code);
}
