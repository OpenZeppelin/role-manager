/**
 * Type definitions for the Authorized Accounts page
 * Feature: 010-authorized-accounts-page (initial skeleton)
 * Updated by: 011-accounts-real-data (real data integration)
 *
 * Presentation-focused types for the Authorized Accounts UI.
 * Supports real blockchain data from AccessControlService.
 */

import type { EnrichedRoleAssignment, EnrichedRoleMember } from '@openzeppelin/ui-builder-types';

// Re-export adapter types for convenience
// Note: RoleIdentifier is not re-exported here as it's defined in ./roles.ts
export type { EnrichedRoleAssignment, EnrichedRoleMember };

// =============================================================================
// Domain Types
// =============================================================================

/**
 * Transaction-state based account status.
 * - 'active': Role confirmed on-chain (all accounts from adapter)
 * - 'pending': Transaction in progress (future: during transaction execution)
 * - 'awaiting-signature': Multisig pending signatures (future: multisig support)
 *
 * Note: 'expired' removed - OZ AccessControl has no timelock roles
 */
export type AccountStatus = 'active' | 'pending' | 'awaiting-signature';

/**
 * Display configuration for each status
 */
export const ACCOUNT_STATUS_CONFIG: Record<
  AccountStatus,
  {
    label: string;
    variant: 'success' | 'warning' | 'info';
  }
> = {
  active: { label: 'Active', variant: 'success' },
  pending: { label: 'Pending', variant: 'warning' },
  'awaiting-signature': { label: 'Awaiting Signature', variant: 'info' },
};

// =============================================================================
// Role Badge Types
// =============================================================================

/**
 * Minimal role information for display as badge.
 */
export interface RoleBadgeInfo {
  /** Role identifier (hash or name constant) */
  id: string;
  /** Human-readable role name */
  name: string;
}

// =============================================================================
// Presentation Types
// =============================================================================

/**
 * Presentation model for an authorized account.
 * Aggregates data from multiple roles into account-centric view.
 *
 * This replaces the old AuthorizedAccount interface with:
 * - dateAdded as nullable string (ISO8601) instead of Date
 * - roles as RoleBadgeInfo[] instead of string[]
 * - expiresAt removed (no timelock support)
 */
export interface AuthorizedAccountView {
  /** Unique identifier (same as address) */
  id: string;
  /** Blockchain address (0x-prefixed) */
  address: string;
  /** Transaction-state based status */
  status: AccountStatus;
  /** ISO8601 timestamp of earliest role grant, or null if unavailable */
  dateAdded: string | null;
  /** Array of assigned roles */
  roles: RoleBadgeInfo[];
}

// =============================================================================
// Filter State Types
// =============================================================================

/**
 * Filter state for the accounts table.
 *
 * Note: 'expired' status option removed since OZ AccessControl has no timelock roles.
 * Filter dropdown should only show: All, Active, Pending, Awaiting Signature
 */
export interface AccountsFilterState {
  /** Search query for address filtering (case-insensitive partial match) */
  searchQuery: string;

  /** Selected status filter ('all' or specific status) */
  statusFilter: AccountStatus | 'all';

  /** Selected role filter ('all' or specific role ID) */
  roleFilter: string;
}

/**
 * Default/initial filter state
 */
export const DEFAULT_FILTER_STATE: AccountsFilterState = {
  searchQuery: '',
  statusFilter: 'all',
  roleFilter: 'all',
};

// =============================================================================
// Selection State Types
// =============================================================================

/**
 * Selection state for table rows
 * Using Set<string> for O(1) lookup and efficient add/remove
 */
export type SelectionState = Set<string>;

/**
 * Derive master checkbox state from selection
 */
export type MasterCheckboxState = 'unchecked' | 'checked' | 'indeterminate';

/**
 * Helper to derive master checkbox state from selection
 */
export function getMasterCheckboxState(
  selectedCount: number,
  totalCount: number
): MasterCheckboxState {
  if (selectedCount === 0) return 'unchecked';
  if (selectedCount === totalCount) return 'checked';
  return 'indeterminate';
}

// =============================================================================
// Action Types
// =============================================================================

/**
 * Available actions for an account row
 */
export type AccountAction = 'edit-roles';

/**
 * Display configuration for actions
 */
export const ACCOUNT_ACTIONS: Array<{
  id: AccountAction;
  label: string;
}> = [{ id: 'edit-roles', label: 'Edit Roles' }];
