/**
 * Types barrel file - exports all type definitions for the Role Manager app.
 */

// Authorized Accounts types (Feature: 010/011)
export * from './authorized-accounts';

// Contracts types
export * from './contracts';

// Dashboard types
export * from './dashboard';

// Roles types
export * from './roles';

// Schema types
export * from './schema';

// Storage types
export * from './storage';

// Role Dialogs types (Feature: 014-role-grant-revoke)
export type {
  DialogTransactionStep,
  PendingRoleChange,
  RoleCheckboxItem,
  ManageRolesDialogState,
  AssignRoleDialogState,
  RevokeRoleDialogState,
} from './role-dialogs';

// Pending Transfers types (Feature: 015-ownership-transfer Phase 6.5)
export type {
  PendingTransferType,
  PendingTransfer,
  UsePendingTransfersOptions,
  UsePendingTransfersReturn,
} from './pending-transfers';

// Role Changes types (Feature: 012-role-changes-data)
export {
  // Domain types
  type RoleChangeAction,
  type HistoryChangeType,
  CHANGE_TYPE_TO_ACTION,
  // API types
  type PageInfo,
  type HistoryEntry,
  type PaginatedHistoryResult,
  type HistoryQueryOptions,
  // Presentation types
  type RoleChangeEventView,
  // Filter types
  type HistoryFilterState,
  DEFAULT_HISTORY_FILTER_STATE,
  // Display configuration
  type ActionTypeConfig,
  ACTION_TYPE_CONFIG,
  // Pagination types
  type CursorPaginationState,
  DEFAULT_CURSOR_PAGINATION_STATE,
  type CursorPaginationControls,
  // Hook return types
  type UseContractHistoryReturn,
  type UseRoleChangesPageDataReturn,
} from './role-changes';
