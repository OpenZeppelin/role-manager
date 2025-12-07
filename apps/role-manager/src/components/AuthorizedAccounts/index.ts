/**
 * Authorized Accounts Components - Barrel Export
 * Feature: 010-authorized-accounts-page
 *
 * Central export point for all Authorized Accounts page components.
 * Re-exports types for convenience.
 */

// =============================================================================
// Components (Phase 3 - User Story 1)
// =============================================================================

export { AccountsFilterBar } from './AccountsFilterBar';
export { AccountsLoadingSkeleton } from './AccountsLoadingSkeleton';

// =============================================================================
// Mock Data (for development/demo)
// =============================================================================

export { MOCK_ACCOUNTS, MOCK_AVAILABLE_ROLES } from './mockData';

// =============================================================================
// Component Props Types (re-exported from types/authorized-accounts.ts)
// =============================================================================

export type {
  AccountAction,
  AccountActionsMenuProps,
  AccountRowProps,
  AccountsFilterBarProps,
  AccountsFilterState,
  AccountsLoadingSkeletonProps,
  AccountsTableProps,
  AccountStatus,
  AuthorizedAccount,
  MasterCheckboxState,
  RoleBadgeProps,
  SelectionState,
  StatusBadgeProps,
} from '../../types/authorized-accounts';

export {
  ACCOUNT_ACTIONS,
  ACCOUNT_STATUS_CONFIG,
  DEFAULT_FILTER_STATE,
  getMasterCheckboxState,
} from '../../types/authorized-accounts';
