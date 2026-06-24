/**
 * Auth Utilities
 * Authentication and authorization related utilities
 */

/**
 * User roles available in the system
 */
export type UserRole = 'owner' | 'manager' | 'staff';

import {
  getPrimaryStaffPosition,
  normalizeStaffPositions,
  type StaffPosition,
} from "@/lib/staff/positions";

export type StaffType = StaffPosition | null;

/**
 * Current user information from localStorage
 */
export interface CurrentUser {
  id: string;
  role: UserRole;
  name: string;
  staffType: StaffType;
  positions: StaffPosition[];
  staffCode: string;
  profilePicture: string;
}

/**
 * Extended staff information including role abbreviation
 */
export interface StaffInfo extends CurrentUser {
  roleAbbr: 'OWN' | 'MAN' | 'STA';
}

const INTERNAL_AUTH_STORAGE_KEYS = [
  'user_id',
  'user_name',
  'user_role',
  'staff_type',
  'staff_positions',
  'staff_code',
  'profile_picture',
  'session_id',
] as const;

const DEPRECATED_STORAGE_KEYS = [
  'last_archive_check',
  'last_month_archived',
  'inventory_show_stats',
  'theme',
] as const;

export function storeInternalIdentity(user: {
  id: string;
  name: string;
  role: UserRole;
  staffCode?: string | null;
  staffType?: StaffType | string;
  staffPositions?: StaffPosition[] | string[];
  primaryPosition?: StaffType | string;
  profilePicture?: string | null;
}): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('user_id', user.id);
  localStorage.setItem('user_name', user.name);
  localStorage.setItem('user_role', user.role);
  localStorage.setItem('staff_code', user.staffCode ?? '');
  const positions = normalizeStaffPositions(user.staffPositions);
  const primaryPosition =
    getPrimaryStaffPosition({
      positions,
      primary_position: user.primaryPosition as StaffPosition | null,
      staff_type: user.staffType ?? null,
    }) ?? null;
  const storedPositions =
    positions.length > 0
      ? positions
      : primaryPosition
        ? [primaryPosition]
        : [];

  localStorage.setItem('staff_type', primaryPosition ?? '');
  localStorage.setItem('staff_positions', JSON.stringify(storedPositions));
  if (user.profilePicture !== undefined) {
    localStorage.setItem('profile_picture', user.profilePicture ?? '');
  }
}

export function cleanupDeprecatedStorage(): void {
  if (typeof window === 'undefined') return;
  DEPRECATED_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}

/**
 * Get current user information from localStorage
 * @returns Current user data or null if not logged in
 */
export function getCurrentUser(): CurrentUser | null {
  if (typeof window === 'undefined') return null;
  
  const id = localStorage.getItem('user_id');
  if (!id) return null;
  
  const storedPositions = localStorage.getItem('staff_positions');
  let positions: StaffPosition[] = [];

  try {
    positions = normalizeStaffPositions(
      storedPositions ? JSON.parse(storedPositions) : [],
    );
  } catch {
    positions = [];
  }

  const legacyStaffType = localStorage.getItem('staff_type');
  const staffType =
    getPrimaryStaffPosition({
      positions,
      staff_type: legacyStaffType,
    }) ?? null;

  if (positions.length === 0 && staffType) {
    positions = [staffType];
  }

  return {
    id,
    role: (localStorage.getItem('user_role') || 'staff') as UserRole,
    name: localStorage.getItem('user_name') || 'Unknown User',
    staffType,
    positions,
    staffCode: localStorage.getItem('staff_code') || 'UNKNOWN',
    profilePicture: localStorage.getItem('profile_picture') || '',
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
  INTERNAL_AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
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
