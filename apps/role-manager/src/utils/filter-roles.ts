/**
 * Filter Roles Utilities
 * Shared utilities for building role lists for filter dropdowns.
 *
 * Provides a consistent way to create available roles lists that include:
 * - Synthetic Owner role (for ownership transfer filtering)
 * - Synthetic Admin role (for admin transfer filtering) - CONTRACT_ADMIN
 * - Enumerated roles from the contract
 *
 * Note: The synthetic Admin role (CONTRACT_ADMIN) is for two-step admin transfer
 * events. This is different from the enumerated ADMIN_ROLE which is a standard
 * AccessControl role that can have multiple members.
 */

import type { RoleAssignment } from '@openzeppelin/ui-types';

import { ADMIN_ROLE_ID, OWNER_ROLE_ID, OWNER_ROLE_NAME } from '../constants/roles';
import type { RoleBadgeInfo } from '../types/authorized-accounts';
import { getRoleName } from './role-name';

/**
 * Synthetic Owner role for filter dropdowns.
 * Owner is not part of enumerable roles but needed for ownership transfer filtering.
 */
export const SYNTHETIC_OWNER_ROLE: RoleBadgeInfo = {
  id: OWNER_ROLE_ID,
  name: OWNER_ROLE_NAME,
};

/**
 * Synthetic Admin role for filter dropdowns.
 * This represents the Contract Admin (two-step transfer), not the enumerated ADMIN_ROLE.
 * Used for filtering admin transfer events in history.
 */
export const SYNTHETIC_ADMIN_ROLE: RoleBadgeInfo = {
  id: ADMIN_ROLE_ID, // 'CONTRACT_ADMIN'
  name: 'Admin', // Display as "Admin" to match history transformer output
};

/**
 * Options for building filter roles list
 */
export interface BuildFilterRolesOptions {
  /** Include synthetic Owner role (default: true) */
  includeOwner?: boolean;
  /** Include synthetic Admin role for admin transfers (default: true) */
  includeAdmin?: boolean;
  /** Sort the resulting list alphabetically by name (default: true) */
  sort?: boolean;
}

/**
 * Build a complete list of roles for filter dropdowns.
 *
 * Combines synthetic roles (Owner, Admin) with enumerated roles from the contract.
 * - Owner: For ownership transfer events (always first when included)
 * - Admin: For admin transfer events (CONTRACT_ADMIN, two-step transfer)
 *
 * Sorting behavior: Synthetic roles (Owner, Admin) are always at the top in that order,
 * followed by enumerated roles sorted alphabetically.
 *
 * @param contractRoles - Array of role assignments from the contract (may be null/undefined)
 * @param options - Configuration options for which roles to include
 * @returns Array of RoleBadgeInfo objects for use in filter dropdowns
 *
 * @example
 * ```tsx
 * // In a hook - includes Owner, Admin + all enumerated roles
 * const availableRoles = useMemo(
 *   () => buildFilterRoles(contractRoles),
 *   [contractRoles]
 * );
 * ```
 *
 * @example
 * ```tsx
 * // Without synthetic roles (enumerated only)
 * const roles = buildFilterRoles(contractRoles, { includeOwner: false, includeAdmin: false });
 * ```
 */
export function buildFilterRoles(
  contractRoles: RoleAssignment[] | null | undefined,
  options: BuildFilterRolesOptions = {}
): RoleBadgeInfo[] {
  const { includeOwner = true, includeAdmin = true, sort = true } = options;

  // Synthetic roles always come first (Owner, then Admin)
  const syntheticRoles: RoleBadgeInfo[] = [];
  if (includeOwner) {
    syntheticRoles.push(SYNTHETIC_OWNER_ROLE);
  }
  if (includeAdmin) {
    syntheticRoles.push(SYNTHETIC_ADMIN_ROLE);
  }

  // Add enumerated roles from contract
  let enumeratedRoles: RoleBadgeInfo[] = contractRoles
    ? contractRoles.map((assignment) => ({
        id: assignment.role.id,
        name: getRoleName(assignment.role.label, assignment.role.id),
      }))
    : [];

  // Sort only enumerated roles alphabetically if requested
  if (sort) {
    enumeratedRoles = enumeratedRoles.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Synthetic roles always at top, enumerated roles below
  return [...syntheticRoles, ...enumeratedRoles];
}

/**
 * Build filter roles from enumerated roles only (without synthetic Owner).
 *
 * Use this when you only need the roles that actually exist in the contract.
 *
 * @param contractRoles - Array of role assignments from the contract
 * @param sort - Whether to sort alphabetically (default: true)
 * @returns Array of RoleBadgeInfo objects
 */
export function buildEnumeratedFilterRoles(
  contractRoles: RoleAssignment[] | null | undefined,
  sort: boolean = true
): RoleBadgeInfo[] {
  return buildFilterRoles(contractRoles, {
    includeOwner: false,
    sort,
  });
}

/**
 * Build filter roles from an existing array of RoleBadgeInfo.
 *
 * Use this when you already have roles extracted as RoleBadgeInfo[] (e.g., from accounts).
 * This variant:
 * - Filters out any existing synthetic roles to avoid duplicates
 * - Prepends synthetic Owner and Admin roles at the top
 * - Sorts enumerated roles alphabetically
 *
 * @param roles - Array of role badges (may contain synthetic roles that will be deduplicated)
 * @param options - Configuration options for which synthetic roles to include
 * @returns Array of RoleBadgeInfo objects for use in filter dropdowns
 *
 * @example
 * ```tsx
 * // Extract roles from accounts, then normalize with synthetic roles at top
 * const extractedRoles = extractRolesFromAccounts(accounts);
 * const availableRoles = buildFilterRolesFromBadges(extractedRoles);
 * ```
 */
export function buildFilterRolesFromBadges(
  roles: RoleBadgeInfo[],
  options: BuildFilterRolesOptions = {}
): RoleBadgeInfo[] {
  const { includeOwner = true, includeAdmin = true, sort = true } = options;

  // Synthetic roles always come first (Owner, then Admin)
  const syntheticRoles: RoleBadgeInfo[] = [];
  if (includeOwner) {
    syntheticRoles.push(SYNTHETIC_OWNER_ROLE);
  }
  if (includeAdmin) {
    syntheticRoles.push(SYNTHETIC_ADMIN_ROLE);
  }

  // Filter out synthetic roles from input to avoid duplicates
  let enumeratedRoles = roles.filter((role) => !isOwnerRole(role.id) && !isAdminRole(role.id));

  // Sort enumerated roles alphabetically if requested
  if (sort) {
    enumeratedRoles = enumeratedRoles.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Synthetic roles always at top, enumerated roles below
  return [...syntheticRoles, ...enumeratedRoles];
}

// =============================================================================
// Role Type Helpers
// =============================================================================

/**
 * Check if a role ID represents the synthetic Owner role.
 * Used for displaying special icons in filter dropdowns.
 */
export function isOwnerRole(roleId: string): boolean {
  return roleId === OWNER_ROLE_ID;
}

/**
 * Check if a role ID represents the synthetic Admin role (CONTRACT_ADMIN).
 * Used for displaying special icons in filter dropdowns.
 */
export function isAdminRole(roleId: string): boolean {
  return roleId === ADMIN_ROLE_ID;
}

/**
 * Check if a role ID represents a special role (Owner or Admin).
 * Special roles have icons in the UI.
 */
export function isSpecialRole(roleId: string): boolean {
  return isOwnerRole(roleId) || isAdminRole(roleId);
}
