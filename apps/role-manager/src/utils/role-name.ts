/**
 * Role Name Utilities
 * Shared utilities for formatting role names for display.
 */

import { truncateMiddle } from '@openzeppelin/ui-builder-utils';

import { isHash } from './hash';

/**
 * Capitalize each word in a role name for display.
 * Handles snake_case, camelCase, and space-separated names.
 * Strips common suffixes like '_ROLE' for cleaner display.
 *
 * @example
 * capitalizeRoleName('admin') // 'Admin'
 * capitalizeRoleName('ADMIN_ROLE') // 'Admin'
 * capitalizeRoleName('minterRole') // 'Minter'
 * capitalizeRoleName('MINTER_ROLE') // 'Minter'
 */
export function capitalizeRoleName(name: string): string {
  return (
    name
      // Strip common _ROLE suffix (case-insensitive)
      .replace(/_?[Rr][Oo][Ll][Ee]$/i, '')
      // Insert space before uppercase letters (camelCase)
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      // Replace underscores with spaces
      .replace(/_/g, ' ')
      // Capitalize first letter of each word, lowercase the rest
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      // Trim any trailing whitespace
      .trim()
  );
}

/**
 * Get human-readable role name from adapter data.
 * Falls back to role ID hash (truncated) when no readable name is available.
 *
 * Per US4.3: "the role ID hash is shown as a fallback"
 *
 * @param label Optional human-readable label from adapter
 * @param roleId Role identifier (may be hash or constant string)
 * @returns Human-readable name or truncated hash fallback
 */
export function getRoleName(label: string | undefined, roleId: string): string {
  // If adapter provides a label, use it (capitalized)
  if (label && !isHash(label)) {
    return capitalizeRoleName(label);
  }

  // If roleId is a readable identifier (not a hash), capitalize it
  if (!isHash(roleId)) {
    return capitalizeRoleName(roleId);
  }

  // Fallback: roleId is a hash, display truncated version using shared utility
  return truncateMiddle(roleId, 6, 4);
}
