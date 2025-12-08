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
// Components (Phase 4 - User Story 2)
// =============================================================================

export { AccountActionsMenu } from './AccountActionsMenu';
export { AccountRow } from './AccountRow';
export { AccountsTable } from './AccountsTable';

// Re-export badge components from Shared for convenience
export { OutlineBadge } from '../Shared/OutlineBadge';
export { StatusBadge } from '../Shared/StatusBadge';

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
  SelectionState,
} from '../../types/authorized-accounts';

// Re-export badge types from Shared
export type { OutlineBadgeProps } from '../Shared/OutlineBadge';
export type { StatusBadgeProps, StatusBadgeVariant } from '../Shared/StatusBadge';

export {
  ACCOUNT_ACTIONS,
  ACCOUNT_STATUS_CONFIG,
  DEFAULT_FILTER_STATE,
  getMasterCheckboxState,
} from '../../types/authorized-accounts';
