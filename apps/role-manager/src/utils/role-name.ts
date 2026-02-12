/**
 * Role Name Utilities
 * Feature: 009-roles-page-data, 017-evm-access-control (T006)
 *
 * Shared utilities for formatting role names for display.
 * Handles RoleIdentifier.label display logic:
 *   1. If the adapter provides a label (not a hash) → capitalize it
 *   2. If the roleId is a readable string (not a hash) → capitalize it
 *   3. Fallback: roleId is a hash → display truncated version
 *
 * Use `isRoleDisplayHash` to determine whether to render
 * AddressDisplay (with copy-to-clipboard) or plain text.
 */

import { truncateMiddle } from '@openzeppelin/ui-utils';

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
 * Check whether a role's display value would be a hash (truncated hex).
 * When true, the caller should render AddressDisplay from @openzeppelin/ui-components
 * (with showCopyButton) for proper truncated display with copy-to-clipboard.
 * When false, the role has a human-readable label that can be shown as plain text.
 *
 * Uses the same resolution logic as getRoleName:
 *   1. If label exists and is not a hash → NOT a hash display
 *   2. If roleId is a readable string → NOT a hash display
 *   3. Otherwise → IS a hash display
 *
 * @param label Optional human-readable label from adapter (RoleIdentifier.label)
 * @param roleId Role identifier (may be hash or constant string)
 * @returns true if the display value is a truncated hash
 *
 * @example
 * isRoleDisplayHash('MINTER_ROLE', '0x9f2d...') // false — label resolves
 * isRoleDisplayHash(undefined, 'admin')          // false — roleId is readable
 * isRoleDisplayHash(undefined, '0x9f2d...')       // true  — hash fallback
 */
export function isRoleDisplayHash(label: string | undefined, roleId: string): boolean {
  // If adapter provides a non-hash label, it will be displayed as readable text
  if (label && !isHash(label)) {
    return false;
  }

  // If roleId is readable (not a hash), it will be capitalized as plain text
  if (!isHash(roleId)) {
    return false;
  }

  // Fallback: display will be a truncated hash
  return true;
}

/**
 * Get human-readable role name from adapter data.
 * Falls back to role ID hash (truncated) when no readable name is available.
 *
 * Per US4.3: "the role ID hash is shown as a fallback"
 *
 * Use `isRoleDisplayHash` to determine whether the returned value is a
 * truncated hash (which should be rendered via AddressDisplay for
 * copy-to-clipboard support) or a human-readable label.
 *
 * @param label Optional human-readable label from adapter (RoleIdentifier.label)
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
