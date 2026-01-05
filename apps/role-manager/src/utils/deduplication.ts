/**
 * Deduplication utilities for member addresses
 * Feature: 007-dashboard-real-data
 *
 * Provides functions for computing unique account counts
 * across role assignments using Set-based deduplication.
 */

import type { RoleAssignment } from '@openzeppelin/ui-types';

/**
 * Computes the count of unique member addresses across all roles.
 *
 * Uses a Set-based algorithm for O(n) deduplication where n is the
 * total number of role members. JavaScript Set is case-sensitive,
 * so addresses with different casing are treated as distinct.
 *
 * @param roles - Array of role assignments to count unique members from
 * @returns The number of unique member addresses
 *
 * @example
 * ```ts
 * const roles = [
 *   { roleId: '0x1', roleName: 'ADMIN', members: ['0xabc', '0xdef'] },
 *   { roleId: '0x2', roleName: 'MINTER', members: ['0xdef', '0x123'] },
 * ];
 * getUniqueAccountsCount(roles); // Returns 3 (0xabc, 0xdef, 0x123)
 * ```
 */
export function getUniqueAccountsCount(roles: RoleAssignment[]): number {
  // Handle null/undefined input gracefully
  if (!roles || roles.length === 0) {
    return 0;
  }

  const uniqueAddresses = new Set<string>();

  for (const role of roles) {
    // Skip roles with undefined/null members
    if (!role.members) {
      continue;
    }
    for (const member of role.members) {
      uniqueAddresses.add(member);
    }
  }

  return uniqueAddresses.size;
}
