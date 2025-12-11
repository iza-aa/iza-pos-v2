/**
 * Staff Utilities
 * Centralized utilities for staff status, roles, and related functions
 */

// ============================================
// STAFF STATUS UTILITIES
// ============================================

/**
 * Get staff status color class for Tailwind
 * @param status - The staff status
 * @returns Tailwind color class
 */
export function getStaffStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'inactive':
      return 'bg-gray-100 text-gray-800';
    case 'suspended':
      return 'bg-red-100 text-red-800';
    case 'on leave':
    case 'cuti':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

/**
 * Get staff status inline style for custom colors
 * @param status - The staff status
 * @returns React CSSProperties object
 */
export function getStaffStatusStyle(status: string): React.CSSProperties {
  switch (status.toLowerCase()) {
    case 'active':
      return { backgroundColor: '#D1FAE5', color: '#065F46' };
    case 'inactive':
      return { backgroundColor: '#F3F4F6', color: '#1F2937' };
    case 'suspended':
      return { backgroundColor: '#FEE2E2', color: '#991B1B' };
    case 'on leave':
    case 'cuti':
      return { backgroundColor: '#FEF3C7', color: '#92400E' };
    default:
      return { backgroundColor: '#F3F4F6', color: '#6B7280' };
  }
}

// ============================================
// STAFF ROLE UTILITIES
// ============================================

/**
 * Get staff role color class for Tailwind
 * @param role - The staff role
 * @returns Tailwind color class
 */
export function getStaffRoleColor(role: string): string {
  switch (role.toLowerCase()) {
    case 'manager':
      return 'bg-purple-100 text-purple-800';
    case 'kasir':
    case 'cashier':
      return 'bg-blue-100 text-blue-800';
    case 'barista':
      return 'bg-orange-100 text-orange-800';
    case 'chef':
    case 'cook':
      return 'bg-red-100 text-red-800';
    case 'waiter':
    case 'waitress':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

/**
 * Get staff role inline style for custom colors
 * @param role - The staff role
 * @returns React CSSProperties object
 */
export function getStaffRoleStyle(role: string): React.CSSProperties {
  switch (role.toLowerCase()) {
    case 'manager':
      return { backgroundColor: '#E9D5FF', color: '#6B21A8' };
    case 'kasir':
    case 'cashier':
      return { backgroundColor: '#DBEAFE', color: '#1E40AF' };
    case 'barista':
      return { backgroundColor: '#FED7AA', color: '#C2410C' };
    case 'chef':
    case 'cook':
      return { backgroundColor: '#FECACA', color: '#991B1B' };
    case 'waiter':
    case 'waitress':
      return { backgroundColor: '#D1FAE5', color: '#065F46' };
    default:
      return { backgroundColor: '#F3F4F6', color: '#6B7280' };
  }
}

// ============================================
// INVENTORY STATUS UTILITIES (Similar pattern)
// ============================================

/**
 * Get inventory status color class for Tailwind
 * @param status - The inventory status
 * @returns Tailwind color class
 */
export function getInventoryStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'in stock':
    case 'available':
      return 'bg-green-100 text-green-800';
    case 'low stock':
      return 'bg-yellow-100 text-yellow-800';
    case 'out of stock':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

/**
 * Get inventory status inline style for custom colors
 * @param status - The inventory status
 * @returns React CSSProperties object
 */
export function getInventoryStatusStyle(status: string): React.CSSProperties {
  switch (status.toLowerCase()) {
    case 'in stock':
    case 'available':
      return { backgroundColor: '#D1FAE5', color: '#065F46' };
    case 'low stock':
      return { backgroundColor: '#FEF3C7', color: '#92400E' };
    case 'out of stock':
      return { backgroundColor: '#FEE2E2', color: '#991B1B' };
    default:
      return { backgroundColor: '#F3F4F6', color: '#6B7280' };
  }
}

/**
 * Get inventory status text label
 * @param status - The inventory status
 * @returns Display text
 */
export function getInventoryStatusText(status: string): string {
  switch (status.toLowerCase()) {
    case 'in stock':
    case 'available':
      return 'In Stock';
    case 'low stock':
      return 'Low Stock';
    case 'out of stock':
      return 'Out of Stock';
    default:
      return status;
  }
}
