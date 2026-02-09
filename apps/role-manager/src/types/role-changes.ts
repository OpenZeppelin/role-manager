/**
 * Type definitions for the Role Changes page
 * Feature: 012-role-changes-data
 *
 * These interfaces define the contracts between:
 * - Data hooks and UI components
 * - UI components and user interactions
 *
 * Note: API types (HistoryEntry, PageInfo, etc.) are imported from @openzeppelin/ui-types
 */

import type {
  HistoryChangeType,
  HistoryEntry,
  HistoryQueryOptions,
  PageInfo,
  PaginatedHistoryResult,
} from '@openzeppelin/ui-types';

// Re-export RoleBadgeInfo from authorized-accounts (same interface used in both features)
import type { RoleBadgeInfo } from './authorized-accounts';

// Re-export API types for convenience
export type {
  HistoryChangeType,
  HistoryEntry,
  HistoryQueryOptions,
  PageInfo,
  PaginatedHistoryResult,
};

export type { RoleBadgeInfo };

// =============================================================================
// Domain Types
// =============================================================================

/**
 * Action types for role change events (UI representation).
 * Feature 016: Added 'admin-transfer' for admin role transfers.
 */
export type RoleChangeAction =
  | 'grant'
  | 'revoke'
  | 'ownership-transfer'
  | 'admin-transfer'
  | 'unknown';

/**
 * Mapping from API changeType to UI action.
 */
export const CHANGE_TYPE_TO_ACTION: Record<HistoryChangeType, RoleChangeAction> = {
  GRANTED: 'grant',
  REVOKED: 'revoke',
  OWNERSHIP_TRANSFER_COMPLETED: 'ownership-transfer',
  OWNERSHIP_TRANSFER_STARTED: 'ownership-transfer',
  ADMIN_TRANSFER_INITIATED: 'admin-transfer',
  ADMIN_TRANSFER_COMPLETED: 'admin-transfer',
  UNKNOWN: 'unknown', // Fallback for unknown change types
  ROLE_ADMIN_CHANGED: 'grant',
  OWNERSHIP_RENOUNCED: 'ownership-transfer',
  ADMIN_RENOUNCED: 'admin-transfer',
  ADMIN_TRANSFER_CANCELED: 'admin-transfer',
  ADMIN_DELAY_CHANGE_SCHEDULED: 'admin-transfer',
  ADMIN_DELAY_CHANGE_CANCELED: 'admin-transfer',
};

// =============================================================================
// Presentation Types (for UI)
// =============================================================================

/**
 * Presentation model for a role change event in the UI.
 * Transformed from HistoryEntry with display-ready values.
 */
export interface RoleChangeEventView {
  /** Unique identifier for React key */
  id: string;
  /** ISO8601 timestamp */
  timestamp: string;
  /** Event type (UI representation) */
  action: RoleChangeAction;
  /** Role identifier */
  roleId: string;
  /** Display-ready role name */
  roleName: string;
  /** Affected account address */
  account: string;
  /** Block explorer URL for the account (null if unavailable) */
  accountUrl: string | null;
  /** Transaction hash (null if unavailable) */
  transactionHash: string | null;
  /** Full block explorer URL for the transaction (null if unavailable) */
  transactionUrl: string | null;
  /** Block/ledger number */
  ledger: number | null;
}

// =============================================================================
// Filter Types
// =============================================================================

/**
 * Filter state for the role changes table.
 */
export interface HistoryFilterState {
  /** Filter by action type ('all' shows all) - server-side filter via changeType param */
  actionFilter: RoleChangeAction | 'all';
  /** Filter by role ID ('all' shows all) - server-side filter via roleId param */
  roleFilter: string;
  /** Search query for account address or transaction ID - server-side filter */
  searchQuery: string;
  /** Filter events on or after this time (ISO8601 without timezone) */
  timestampFrom?: string;
  /** Filter events on or before this time (ISO8601 without timezone) */
  timestampTo?: string;
}

/**
 * Default filter state.
 */
export const DEFAULT_HISTORY_FILTER_STATE: HistoryFilterState = {
  actionFilter: 'all',
  roleFilter: 'all',
  searchQuery: '',
  timestampFrom: undefined,
  timestampTo: undefined,
};

// =============================================================================
// Display Configuration
// =============================================================================

/**
 * Display configuration for action types.
 * Note: Variants align with StatusBadge component variants
 */
export interface ActionTypeConfig {
  label: string;
  variant: 'success' | 'error' | 'warning' | 'info';
}

export const ACTION_TYPE_CONFIG: Record<RoleChangeAction, ActionTypeConfig> = {
  grant: { label: 'Grant', variant: 'success' },
  revoke: { label: 'Revoke', variant: 'error' },
  'ownership-transfer': { label: 'Ownership Transfer', variant: 'info' },
  'admin-transfer': { label: 'Admin Transfer', variant: 'info' },
  unknown: { label: 'Unknown', variant: 'warning' },
};

// =============================================================================
// Cursor-Based Pagination Types
// =============================================================================

/**
 * Internal state for cursor-based pagination with back navigation.
 */
export interface CursorPaginationState {
  /** Current cursor (undefined = first page) */
  currentCursor: string | undefined;
  /** Stack of previous cursors for back navigation (undefined = first page) */
  cursorHistory: (string | undefined)[];
}

/**
 * Default pagination state.
 */
export const DEFAULT_CURSOR_PAGINATION_STATE: CursorPaginationState = {
  currentCursor: undefined,
  cursorHistory: [],
};

/**
 * Pagination controls for cursor-based navigation.
 */
export interface CursorPaginationControls {
  /** Whether there is a next page */
  hasNextPage: boolean;
  /** Whether there is a previous page */
  hasPrevPage: boolean;
  /** Navigate to next page */
  nextPage: () => void;
  /** Navigate to previous page */
  prevPage: () => void;
  /** Reset to first page */
  resetToFirst: () => void;
  /** Whether pagination is in loading state */
  isLoading: boolean;
}

// =============================================================================
// Hook Return Types
// =============================================================================

/**
 * Return type for useContractHistory hook.
 */
export interface UseContractHistoryReturn {
  /** Current page items from API */
  items: HistoryEntry[];
  /** Page info from API */
  pageInfo: PageInfo;
  /** Loading state */
  isLoading: boolean;
  /** Background fetch in progress */
  isFetching: boolean;
  /** Error state */
  hasError: boolean;
  /** User-friendly error message */
  errorMessage: string | null;
  /** Whether retry is possible */
  canRetry: boolean;
  /** Refetch function */
  refetch: () => Promise<void>;
}

/**
 * Return type for useRoleChangesPageData hook.
 */
export interface UseRoleChangesPageDataReturn {
  // === Event Data ===
  /** Current page events (transformed) */
  events: RoleChangeEventView[];
  /** Available roles for filter dropdown */
  availableRoles: RoleBadgeInfo[];
  /** Whether roles are still loading (used for filter dropdown state) */
  availableRolesLoading: boolean;

  // === Filter State ===
  /** Current filter state */
  filters: HistoryFilterState;
  /** Update filter state (resets pagination) */
  setFilters: (filters: HistoryFilterState) => void;
  /** Reset filters to default */
  resetFilters: () => void;

  // === Pagination ===
  /** Cursor-based pagination controls */
  pagination: CursorPaginationControls;

  // === Contract State ===
  /** Whether a contract is currently selected */
  hasContractSelected: boolean;
  /** Whether contract supports history */
  supportsHistory: boolean;
  /** Whether contract supports AC/Ownable */
  isSupported: boolean;

  // === Loading States ===
  /** Whether initial data fetch is in progress */
  isLoading: boolean;
  /** Whether background refresh is in progress */
  isRefreshing: boolean;

  // === Error States ===
  /** Whether in error state */
  hasError: boolean;
  /** User-friendly error message */
  errorMessage: string | null;
  /** Whether error can be recovered by retrying */
  canRetry: boolean;

  // === Actions ===
  /** Manually refresh data */
  refetch: () => Promise<void>;
}

// =============================================================================
// Note: Component Props Types are defined in their respective component files
// =============================================================================
