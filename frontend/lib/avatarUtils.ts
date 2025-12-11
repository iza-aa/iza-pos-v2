/**
 * Avatar Utilities
 * Reusable avatar generation and color utilities
 */

/**
 * Color palette for avatars (grayscale theme)
 */
const AVATAR_COLORS = [
  'bg-gray-800',
  'bg-gray-700',
  'bg-gray-600',
  'bg-gray-500',
  'bg-gray-800',
  'bg-gray-700',
  'bg-gray-600',
  'bg-gray-500',
] as const;

/**
 * Get initials from a name
 * @param name - Full name
 * @returns Initials (e.g., "John Doe" → "JD", "Alice" → "AL")
 */
export function getInitials(name: string): string {
  if (!name) return '??';
  
  const names = name.trim().split(' ');
  
  if (names.length === 1) {
    return names[0].substring(0, 2).toUpperCase();
  }
  
  return (names[0][0] + names[names.length - 1][0]).toUpperCase();
}

/**
 * Get avatar color based on name (consistent color for same name)
 * @param name - Name to generate color from
 * @returns Tailwind CSS class for background color
 */
export function getAvatarColor(name: string): string {
  if (!name) return AVATAR_COLORS[0];
  
  const index = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

/**
 * Generate avatar props (initials + color)
 * @param name - Full name
 * @returns Object with initials and color class
 */
export function generateAvatarProps(name: string): { initials: string; color: string } {
  return {
    initials: getInitials(name),
    color: getAvatarColor(name),
  };
}
