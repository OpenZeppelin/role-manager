/**
 * Hook Contracts: Authorized Accounts Real Data Integration
 * Feature: 011-accounts-real-data
 *
 * TypeScript interfaces defining the contracts for hooks and utilities.
 * These are design-time contracts; actual implementation may vary slightly.
 */

import type {
  AccessControlCapabilities,
  ContractAdapter,
  OwnershipInfo,
  RoleIdentifier,
} from '@openzeppelin/ui-builder-types';

import type { DataError } from '../../../apps/role-manager/src/utils/errors';

// =============================================================================
// Enriched API Types (from adapter)
// =============================================================================

/**
 * Member data with optional grant metadata from indexer.
 * Timestamps are only available when indexer is operational.
 */
export interface EnrichedRoleMember {
  /** Member's blockchain address */
  address: string;
  /** ISO8601 timestamp of grant (e.g., "2024-01-15T10:00:00Z") */
  grantedAt?: string;
  /** Transaction hash of the grant operation */
  grantedTxId?: string;
  /** Block/ledger number when grant was confirmed */
  grantedLedger?: number;
}

/**
 * Role assignment with enriched member data.
 * Returned by getCurrentRolesEnriched() API.
 */
export interface EnrichedRoleAssignment {
  /** Role identifier with optional human-readable label */
  role: RoleIdentifier;
  /** Members with optional grant metadata */
  members: EnrichedRoleMember[];
}

// =============================================================================
// Presentation Types
// =============================================================================

/**
 * Transaction-state based account status.
 * - 'active': Role confirmed on-chain (all accounts in this spec)
 * - 'pending': Transaction in progress (future)
 * - 'awaiting-signature': Multisig pending (future)
 */
export type AccountStatus = 'active' | 'pending' | 'awaiting-signature';

/**
 * Minimal role information for display as badge.
 */
export interface RoleBadgeInfo {
  /** Role identifier (hash or name constant) */
  id: string;
  /** Human-readable role name */
  name: string;
}

/**
 * Presentation model for an authorized account.
 * Aggregates data from multiple roles into account-centric view.
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
// Filter & Pagination Types
// =============================================================================

/**
 * Filter state for the accounts table.
 */
export interface AccountsFilterState {
  /** Address search query (case-insensitive partial match) */
  searchQuery: string;
  /** Status filter ('all' or specific status) */
  statusFilter: AccountStatus | 'all';
  /** Role filter ('all' or specific role ID) */
  roleFilter: string;
}

/**
 * Default filter state.
 */
export const DEFAULT_FILTER_STATE: AccountsFilterState = {
  searchQuery: '',
  statusFilter: 'all',
  roleFilter: 'all',
};

/**
 * Pagination controls returned by hooks.
 */
export interface PaginationControls {
  /** Current page (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Total items (post-filter) */
  totalItems: number;
  /** Items per page */
  pageSize: number;
  /** Whether there is a next page */
  hasNextPage: boolean;
  /** Whether there is a previous page */
  hasPreviousPage: boolean;
  /** Navigate to next page */
  nextPage: () => void;
  /** Navigate to previous page */
  previousPage: () => void;
  /** Navigate to specific page */
  goToPage: (page: number) => void;
}

// =============================================================================
// Hook Return Types
// =============================================================================

/**
 * Return type for useContractRolesEnriched hook.
 */
export interface UseContractRolesEnrichedReturn {
  /** Enriched role assignments with member timestamps */
  roles: EnrichedRoleAssignment[];
  /** Whether initial fetch is in progress */
  isLoading: boolean;
  /** Whether background refresh is in progress */
  isFetching: boolean;
  /** Error if fetch failed */
  error: DataError | null;
  /** User-friendly error message */
  errorMessage: string | null;
  /** Whether error can be recovered by retrying */
  canRetry: boolean;
  /** Whether in error state */
  hasError: boolean;
  /** Whether roles list is empty */
  isEmpty: boolean;
  /** Manually trigger refetch */
  refetch: () => Promise<void>;
}

/**
 * Return type for useAuthorizedAccountsPageData hook.
 * Main orchestration hook for the Authorized Accounts page.
 */
export interface UseAuthorizedAccountsPageDataReturn {
  // === Account Data ===
  /** All authorized accounts (post-filter, pre-pagination) */
  allAccounts: AuthorizedAccountView[];
  /** Paginated accounts for current page */
  paginatedAccounts: AuthorizedAccountView[];
  /** Available roles for filter dropdown */
  availableRoles: RoleBadgeInfo[];

  // === Filter State ===
  /** Current filter state */
  filters: AccountsFilterState;
  /** Update filter state */
  setFilters: (filters: AccountsFilterState) => void;
  /** Reset filters to default */
  resetFilters: () => void;

  // === Pagination ===
  /** Pagination controls and state */
  pagination: PaginationControls;

  // === Capabilities ===
  /** Contract capabilities (hasAccessControl, hasOwnable) */
  capabilities: AccessControlCapabilities | null;
  /** Whether contract supports access control features */
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

  // === Connected Wallet (stubbed) ===
  /** Connected wallet address (null = stubbed) */
  connectedAddress: string | null;
}

// =============================================================================
// Utility Function Signatures
// =============================================================================

/**
 * Transform role-centric data to account-centric view.
 *
 * @param enrichedRoles - Role assignments from getCurrentRolesEnriched()
 * @param ownership - Ownership info from getOwnership()
 * @returns Array of AuthorizedAccountView sorted by dateAdded (newest first)
 */
export type TransformRolesToAccountsFn = (
  enrichedRoles: EnrichedRoleAssignment[],
  ownership: OwnershipInfo | null
) => AuthorizedAccountView[];

/**
 * Apply filters to accounts list.
 *
 * @param accounts - All accounts
 * @param filters - Current filter state
 * @returns Filtered accounts
 */
export type ApplyAccountsFiltersFn = (
  accounts: AuthorizedAccountView[],
  filters: AccountsFilterState
) => AuthorizedAccountView[];

/**
 * Sort accounts by dateAdded (newest first), then alphabetical.
 *
 * @param accounts - Accounts to sort
 * @returns Sorted accounts (new array)
 */
export type SortAccountsFn = (accounts: AuthorizedAccountView[]) => AuthorizedAccountView[];

// =============================================================================
// Hook Signatures
// =============================================================================

/**
 * Hook that fetches enriched role assignments with timestamps.
 *
 * @param adapter - Contract adapter instance
 * @param contractAddress - Contract address to fetch roles for
 * @param isContractRegistered - Whether contract is registered (default: true)
 * @returns Enriched roles data and controls
 */
export type UseContractRolesEnrichedHook = (
  adapter: ContractAdapter | null,
  contractAddress: string,
  isContractRegistered?: boolean
) => UseContractRolesEnrichedReturn;

/**
 * Main orchestration hook for Authorized Accounts page.
 * Combines data fetching, transformation, filtering, and pagination.
 *
 * @returns Page data and controls
 */
export type UseAuthorizedAccountsPageDataHook = () => UseAuthorizedAccountsPageDataReturn;
