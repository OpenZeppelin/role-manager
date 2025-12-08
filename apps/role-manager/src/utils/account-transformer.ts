/**
 * Account Transformer Utilities
 * Feature: 011-accounts-real-data
 *
 * Data transformation utilities that convert role-centric data from the
 * AccessControlService into account-centric views for the Authorized Accounts page.
 *
 * Tasks: T014-T016 (transformRolesToAccounts, sortAccounts, applyAccountsFilters)
 */
import type { OwnershipInfo } from '@openzeppelin/ui-builder-types';

import { OWNER_ROLE_ID, OWNER_ROLE_NAME } from '../constants';
import type {
  AccountsFilterState,
  AuthorizedAccountView,
  EnrichedRoleAssignment,
  RoleBadgeInfo,
} from '../types/authorized-accounts';
import { getRoleName } from './role-name';

// =============================================================================
// T014: transformRolesToAccounts
// =============================================================================

/**
 * Internal type for building account data
 */
interface AccountBuildData {
  roles: RoleBadgeInfo[];
  earliestDate: string | null;
}

/**
 * Transform role-centric data to account-centric view.
 *
 * This function aggregates role assignments from the AccessControlService into
 * an account-centric view where each unique address has all its roles collected.
 *
 * @param enrichedRoles - Role assignments from getCurrentRolesEnriched() or getCurrentRoles()
 * @param ownership - Ownership info from getOwnership(), or null if not available
 * @returns Array of AuthorizedAccountView sorted by dateAdded (newest first)
 *
 * @example
 * ```typescript
 * const accounts = transformRolesToAccounts(enrichedRoles, ownership);
 * // Returns accounts with aggregated roles and earliest grant timestamp
 * ```
 */
export function transformRolesToAccounts(
  enrichedRoles: EnrichedRoleAssignment[],
  ownership: OwnershipInfo | null
): AuthorizedAccountView[] {
  // Map: normalized address -> account build data
  const accountMap = new Map<string, AccountBuildData>();

  // Process each role assignment
  for (const roleAssignment of enrichedRoles) {
    const roleInfo: RoleBadgeInfo = {
      id: roleAssignment.role.id,
      name: getRoleName(roleAssignment.role.label, roleAssignment.role.id),
    };

    for (const member of roleAssignment.members) {
      const normalizedAddress = member.address.toLowerCase();
      const existing = accountMap.get(normalizedAddress);

      if (existing) {
        // Add role to existing account
        existing.roles.push(roleInfo);

        // Update earliest date if this grant is earlier
        if (member.grantedAt) {
          if (
            !existing.earliestDate ||
            new Date(member.grantedAt) < new Date(existing.earliestDate)
          ) {
            existing.earliestDate = member.grantedAt;
          }
        }
      } else {
        // Create new account entry
        accountMap.set(normalizedAddress, {
          roles: [roleInfo],
          earliestDate: member.grantedAt || null,
        });
      }
    }
  }

  // Add owner if present and handle case where owner may already be in map
  if (ownership?.owner) {
    const ownerAddress = ownership.owner.toLowerCase();
    const ownerRole: RoleBadgeInfo = { id: OWNER_ROLE_ID, name: OWNER_ROLE_NAME };
    const existing = accountMap.get(ownerAddress);

    if (existing) {
      // Add Owner role to existing account
      existing.roles.push(ownerRole);
    } else {
      // Create new account for owner (no grant timestamp for ownership)
      accountMap.set(ownerAddress, {
        roles: [ownerRole],
        earliestDate: null,
      });
    }
  }

  // Convert map to array of AuthorizedAccountView
  const accounts: AuthorizedAccountView[] = Array.from(accountMap.entries()).map(
    ([address, data]) => ({
      id: address,
      address,
      status: 'active' as const,
      dateAdded: data.earliestDate,
      roles: data.roles,
    })
  );

  // Sort and return
  return sortAccounts(accounts);
}

// =============================================================================
// T015: sortAccounts
// =============================================================================

/**
 * Sort accounts by dateAdded (newest first), then alphabetically by address.
 *
 * Sorting rules:
 * 1. Accounts with timestamps come before accounts without timestamps
 * 2. Among timestamped accounts: sort by date descending (newest first)
 * 3. Among non-timestamped accounts: sort alphabetically by address
 *
 * @param accounts - Array of accounts to sort
 * @returns New sorted array (does not mutate original)
 *
 * @example
 * ```typescript
 * const sorted = sortAccounts(accounts);
 * // sorted[0] will be the most recently added account with a timestamp
 * ```
 */
export function sortAccounts(accounts: AuthorizedAccountView[]): AuthorizedAccountView[] {
  return [...accounts].sort((a, b) => {
    // Both have timestamps: sort by date descending (newest first)
    if (a.dateAdded && b.dateAdded) {
      return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
    }

    // Only a has timestamp: a comes first
    if (a.dateAdded && !b.dateAdded) {
      return -1;
    }

    // Only b has timestamp: b comes first
    if (!a.dateAdded && b.dateAdded) {
      return 1;
    }

    // Neither has timestamp: sort alphabetically by address
    return a.address.localeCompare(b.address);
  });
}

// =============================================================================
// T016: applyAccountsFilters
// =============================================================================

/**
 * Apply filters to accounts list.
 *
 * Filters are combined with AND logic:
 * - searchQuery: case-insensitive partial match on address
 * - statusFilter: exact match on account status ('all' includes all)
 * - roleFilter: account must have at least one role with matching ID ('all' includes all)
 *
 * @param accounts - Array of accounts to filter
 * @param filters - Current filter state
 * @returns Filtered accounts array (does not mutate original)
 *
 * @example
 * ```typescript
 * const filtered = applyAccountsFilters(accounts, {
 *   searchQuery: '0x12',
 *   statusFilter: 'active',
 *   roleFilter: 'ADMIN_ROLE'
 * });
 * // Returns accounts matching all three criteria
 * ```
 */
export function applyAccountsFilters(
  accounts: AuthorizedAccountView[],
  filters: AccountsFilterState
): AuthorizedAccountView[] {
  return accounts.filter((account) => {
    // Search filter (address) - case-insensitive partial match
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      if (!account.address.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Status filter
    if (filters.statusFilter !== 'all' && account.status !== filters.statusFilter) {
      return false;
    }

    // Role filter
    if (filters.roleFilter !== 'all') {
      if (!account.roles.some((role) => role.id === filters.roleFilter)) {
        return false;
      }
    }

    return true;
  });
}
