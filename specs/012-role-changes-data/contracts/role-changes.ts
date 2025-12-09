/**
 * Type Contracts for Role Changes Page
 * Feature: 012-role-changes-data
 *
 * These interfaces define the contracts between:
 * - Adapter API and data hooks
 * - Data hooks and UI components
 * - UI components and user interactions
 *
 * Updated: 2025-12-08 - Cursor-based pagination support
 */

// =============================================================================
// Domain Types
// =============================================================================

/**
 * Action types for role change events (UI representation).
 */
export type RoleChangeAction = 'grant' | 'revoke' | 'ownership-transfer';

/**
 * Change types from the adapter API.
 */
export type HistoryChangeType = 'GRANTED' | 'REVOKED' | 'TRANSFERRED';

/**
 * Mapping from API changeType to UI action.
 */
export const CHANGE_TYPE_TO_ACTION: Record<HistoryChangeType, RoleChangeAction> = {
  GRANTED: 'grant',
  REVOKED: 'revoke',
  TRANSFERRED: 'ownership-transfer',
};

// =============================================================================
// API Types (from Adapter - @openzeppelin/ui-builder-types)
// =============================================================================

/**
 * Pagination metadata returned with each query.
 */
export interface PageInfo {
  /** Whether more items exist after current page */
  hasNextPage: boolean;
  /** Cursor to use for fetching next page */
  endCursor?: string;
}

/**
 * Raw history entry from adapter's getHistory() API.
 */
export interface HistoryEntry {
  /** Role identifier */
  role: { id: string };
  /** Affected account address */
  account: string;
  /** Type of change */
  changeType: HistoryChangeType;
  /** Transaction hash (64-char hex) */
  txId: string;
  /** ISO8601 timestamp */
  timestamp: string;
  /** Block/ledger number */
  ledger: number;
}

/**
 * Paginated response from getHistory() API.
 */
export interface PaginatedHistoryResult {
  /** Array of history entries for current page */
  items: HistoryEntry[];
  /** Pagination metadata */
  pageInfo: PageInfo;
}

/**
 * Options for getHistory() API call.
 */
export interface HistoryQueryOptions {
  /** Filter by role (server-side) */
  roleId?: string;
  /** Filter by account (server-side) */
  account?: string;
  /** Page size (max items per request) */
  limit?: number;
  /** Cursor for fetching next page */
  cursor?: string;
}

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
  /** Transaction hash (null if unavailable) */
  transactionHash: string | null;
  /** Full block explorer URL (null if unavailable) */
  transactionUrl: string | null;
  /** Block/ledger number */
  ledger: number | null;
}

/**
 * Minimal role info for filter dropdown.
 */
export interface RoleBadgeInfo {
  /** Role identifier */
  id: string;
  /** Human-readable name */
  name: string;
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
}

/**
 * Default filter state.
 */
export const DEFAULT_HISTORY_FILTER_STATE: HistoryFilterState = {
  actionFilter: 'all',
  roleFilter: 'all',
};

// =============================================================================
// Display Configuration
// =============================================================================

/**
 * Display configuration for action types.
 */
export interface ActionTypeConfig {
  label: string;
  variant: 'success' | 'destructive' | 'info';
}

export const ACTION_TYPE_CONFIG: Record<RoleChangeAction, ActionTypeConfig> = {
  grant: { label: 'Grant', variant: 'success' },
  revoke: { label: 'Revoke', variant: 'destructive' },
  'ownership-transfer': { label: 'Ownership Transfer', variant: 'info' },
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
  /** Stack of previous cursors for back navigation */
  cursorHistory: string[];
  /** From API pageInfo.hasNextPage */
  hasNextPage: boolean;
}

/**
 * Default pagination state.
 */
export const DEFAULT_CURSOR_PAGINATION_STATE: CursorPaginationState = {
  currentCursor: undefined,
  cursorHistory: [],
  hasNextPage: false,
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
// Component Props Types
// =============================================================================

/**
 * Props for ChangesTable component.
 */
export interface ChangesTableProps {
  /** Events to display */
  events: RoleChangeEventView[];
  /** Optional empty state content */
  emptyState?: React.ReactNode;
}

/**
 * Props for ChangeRow component.
 */
export interface ChangeRowProps {
  /** Event data to display */
  event: RoleChangeEventView;
}

/**
 * Props for ChangesFilterBar component.
 */
export interface ChangesFilterBarProps {
  /** Current filter state */
  filters: HistoryFilterState;
  /** Available roles for dropdown */
  availableRoles: RoleBadgeInfo[];
  /** Callback when filters change */
  onFiltersChange: (filters: HistoryFilterState) => void;
}

/**
 * Props for ChangesEmptyState component.
 */
export interface ChangesEmptyStateProps {
  /** Whether history is not supported (vs just empty) */
  historyNotSupported?: boolean;
  /** Contract name for display */
  contractName?: string;
}

/**
 * Props for ChangesErrorState component.
 */
export interface ChangesErrorStateProps {
  /** Error message to display */
  message: string;
  /** Whether retry is available */
  canRetry: boolean;
  /** Retry callback */
  onRetry: () => void;
}

/**
 * Props for ChangesLoadingSkeleton component.
 */
export interface ChangesLoadingSkeletonProps {
  /** Number of skeleton rows to display */
  rowCount?: number;
}

/**
 * Props for ChangesPagination component.
 */
export interface ChangesPaginationProps {
  /** Cursor-based pagination controls */
  pagination: CursorPaginationControls;
}
