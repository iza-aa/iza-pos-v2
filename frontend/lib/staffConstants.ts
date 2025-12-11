/**
 * Staff Constants
 * Centralized staff-related constants for roles, status, etc.
 */

// ============================================
// STAFF ROLES
// ============================================

export const STAFF_ROLES = {
  OWNER: 'Owner' as const,
  MANAGER: 'Manager' as const,
  KASIR: 'Kasir' as const,
  BARISTA: 'Barista' as const,
  CHEF: 'Chef' as const,
  WAITER: 'Waiter' as const,
} as const;

export type StaffRole = typeof STAFF_ROLES[keyof typeof STAFF_ROLES];

/**
 * Role options for dropdowns and forms
 */
export const roleOptions: string[] = [
  'Kasir',
  'Barista',
  'Manager',
];

// ============================================
// STAFF STATUS
// ============================================

export const STAFF_STATUS = {
  ACTIVE: 'active' as const,
  INACTIVE: 'inactive' as const,
  SUSPENDED: 'suspended' as const,
  ON_LEAVE: 'on leave' as const,
} as const;

export type StaffStatus = typeof STAFF_STATUS[keyof typeof STAFF_STATUS];

/**
 * Status options for dropdowns and forms
 */
export const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'on leave', label: 'On Leave' },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if login code is valid (not expired)
 * @param loginCode - The login code
 * @param expiresAt - The expiration date string
 * @returns true if code is valid
 */
export function isLoginCodeValid(loginCode?: string, expiresAt?: string): boolean {
  if (!loginCode || !expiresAt) return false;
  return new Date(expiresAt) > new Date();
}
