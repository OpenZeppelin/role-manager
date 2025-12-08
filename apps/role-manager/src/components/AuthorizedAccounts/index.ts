/**
 * Authorized Accounts Components - Barrel Export
 * Feature: 010-authorized-accounts-page
 * Updated by: 011-accounts-real-data
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
// Components (Feature 011 - Empty/Error States)
// =============================================================================

export { AccountsEmptyState } from './AccountsEmptyState';
export { AccountsErrorState } from './AccountsErrorState';

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
// Component Props Types (colocated with components)
// =============================================================================

// Props exported from their respective component files
export type { AccountActionsMenuProps } from './AccountActionsMenu';
export type { AccountRowProps } from './AccountRow';
export type { AccountsFilterBarProps } from './AccountsFilterBar';
export type { AccountsLoadingSkeletonProps } from './AccountsLoadingSkeleton';
export type { AccountsTableProps } from './AccountsTable';
export type { AccountsEmptyStateProps } from './AccountsEmptyState';
export type { AccountsErrorStateProps } from './AccountsErrorState';

// Domain types from types file
export type {
  AccountAction,
  AccountsFilterState,
  AccountStatus,
  AuthorizedAccount,
  AuthorizedAccountView,
  MasterCheckboxState,
  RoleBadgeInfo,
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
