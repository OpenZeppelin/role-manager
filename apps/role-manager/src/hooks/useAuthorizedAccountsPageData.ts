/**
 * useAuthorizedAccountsPageData hook
 * Feature: 011-accounts-real-data
 *
 * Main orchestration hook for the Authorized Accounts page.
 * Combines data fetching, transformation, filtering, and pagination.
 *
 * Tasks: T029, T030
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { AccessControlCapabilities } from '@openzeppelin/ui-builder-types';

import {
  DEFAULT_FILTER_STATE,
  type AccountsFilterState,
  type AuthorizedAccountView,
  type RoleBadgeInfo,
} from '../types/authorized-accounts';
import { applyAccountsFilters, transformRolesToAccounts } from '../utils/account-transformer';
import { useContractCapabilities } from './useContractCapabilities';
import { useContractOwnership } from './useContractData';
import { useContractRolesEnriched } from './useContractRolesEnriched';
import { useSelectedContract } from './useSelectedContract';

/**
 * Pagination controls returned by the hook
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

/**
 * Return type for useAuthorizedAccountsPageData hook
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

  // === Contract State ===
  /** Whether a contract is currently selected */
  hasContractSelected: boolean;
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

const DEFAULT_PAGE_SIZE = 10;

/**
 * Hook that orchestrates all data fetching for the Authorized Accounts page.
 *
 * Combines multiple data sources:
 * - Contract capabilities (AccessControl, Ownable detection)
 * - Enriched role assignments with timestamps
 * - Ownership information for Owner role integration
 *
 * Implements:
 * - Role-to-account transformation
 * - Client-side filtering, sorting, pagination
 * - Contract change detection and state reset (T030)
 *
 * @returns Object containing accounts, loading/error states, filters, pagination, and actions
 *
 * @example
 * ```tsx
 * function AuthorizedAccountsPage() {
 *   const {
 *     paginatedAccounts,
 *     isLoading,
 *     hasError,
 *     errorMessage,
 *     isSupported,
 *     refetch,
 *   } = useAuthorizedAccountsPageData();
 *
 *   if (isLoading) return <AccountsLoadingSkeleton />;
 *   if (hasError) return <AccountsErrorState message={errorMessage} onRetry={refetch} />;
 *   if (!isSupported) return <AccountsEmptyState />;
 *
 *   return <AccountsTable accounts={paginatedAccounts} />;
 * }
 * ```
 */
export function useAuthorizedAccountsPageData(): UseAuthorizedAccountsPageDataReturn {
  // =============================================================================
  // Context & State
  // =============================================================================

  const { selectedContract, adapter, isContractRegistered } = useSelectedContract();
  const contractAddress = selectedContract?.address ?? '';
  const contractId = selectedContract?.id;

  // Filter state
  const [filters, setFilters] = useState<AccountsFilterState>(DEFAULT_FILTER_STATE);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // =============================================================================
  // Data Fetching Hooks
  // =============================================================================

  // Capability detection
  const {
    capabilities,
    isLoading: isCapabilitiesLoading,
    error: capabilitiesError,
    isSupported,
  } = useContractCapabilities(adapter, contractAddress, isContractRegistered);

  // Enriched roles fetching
  const {
    roles: enrichedRoles,
    isLoading: isRolesLoading,
    isFetching: isRolesFetching,
    refetch: refetchRoles,
    hasError: hasRolesError,
    canRetry: canRetryRoles,
    errorMessage: rolesErrorMessage,
  } = useContractRolesEnriched(adapter, contractAddress, isContractRegistered);

  // Ownership fetching
  const {
    ownership,
    isLoading: isOwnershipLoading,
    isFetching: isOwnershipFetching,
    refetch: refetchOwnership,
  } = useContractOwnership(adapter, contractAddress, isContractRegistered);

  // =============================================================================
  // Computed Values
  // =============================================================================

  // Transform to account-centric view
  const allAccountsUnfiltered = useMemo(
    () => transformRolesToAccounts(enrichedRoles, ownership),
    [enrichedRoles, ownership]
  );

  // Extract available roles for filter dropdown
  const availableRoles = useMemo((): RoleBadgeInfo[] => {
    const rolesMap = new Map<string, RoleBadgeInfo>();
    for (const account of allAccountsUnfiltered) {
      for (const role of account.roles) {
        if (!rolesMap.has(role.id)) {
          rolesMap.set(role.id, role);
        }
      }
    }
    return Array.from(rolesMap.values());
  }, [allAccountsUnfiltered]);

  // Apply filters
  const allAccounts = useMemo(
    () => applyAccountsFilters(allAccountsUnfiltered, filters),
    [allAccountsUnfiltered, filters]
  );

  // Pagination calculations
  const totalItems = allAccounts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / DEFAULT_PAGE_SIZE));

  // Paginated accounts
  const paginatedAccounts = useMemo(() => {
    const startIndex = (currentPage - 1) * DEFAULT_PAGE_SIZE;
    return allAccounts.slice(startIndex, startIndex + DEFAULT_PAGE_SIZE);
  }, [allAccounts, currentPage]);

  // =============================================================================
  // Effects - State Reset
  // =============================================================================

  // Reset page when filters change (T030 - FR-023)
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // T030: Reset state when contract changes (FR-009, FR-019)
  useEffect(() => {
    setFilters(DEFAULT_FILTER_STATE);
    setCurrentPage(1);
  }, [contractId]);

  // =============================================================================
  // Loading & Error States
  // =============================================================================

  const isLoading = isCapabilitiesLoading || isRolesLoading || isOwnershipLoading;
  const isRefreshing = !isLoading && (isRolesFetching || isOwnershipFetching);
  const hasError = !!capabilitiesError || hasRolesError;
  const errorMessage = rolesErrorMessage ?? capabilitiesError?.message ?? null;
  const canRetry = canRetryRoles || !!capabilitiesError;

  // =============================================================================
  // Actions
  // =============================================================================

  // Combined refetch function
  const refetch = useCallback(async (): Promise<void> => {
    await Promise.all([refetchRoles(), refetchOwnership()]);
  }, [refetchRoles, refetchOwnership]);

  // Reset filters to default
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTER_STATE);
  }, []);

  // =============================================================================
  // Pagination Controls
  // =============================================================================

  const pagination: PaginationControls = useMemo(
    () => ({
      currentPage,
      totalPages,
      totalItems,
      pageSize: DEFAULT_PAGE_SIZE,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      nextPage: () => setCurrentPage((p) => Math.min(p + 1, totalPages)),
      previousPage: () => setCurrentPage((p) => Math.max(p - 1, 1)),
      goToPage: (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages))),
    }),
    [currentPage, totalPages, totalItems]
  );

  // Stubbed connected wallet (future: wallet integration)
  const connectedAddress = null;

  // =============================================================================
  // Return
  // =============================================================================

  // Handle no contract selected
  if (!selectedContract) {
    return {
      allAccounts: [],
      paginatedAccounts: [],
      availableRoles: [],
      filters: DEFAULT_FILTER_STATE,
      setFilters: () => {},
      resetFilters: () => {},
      pagination: {
        currentPage: 1,
        totalPages: 1, // Consistent with Math.max(1, ...) in normal path
        totalItems: 0,
        pageSize: DEFAULT_PAGE_SIZE,
        hasNextPage: false,
        hasPreviousPage: false,
        nextPage: () => {},
        previousPage: () => {},
        goToPage: () => {},
      },
      hasContractSelected: false,
      capabilities: null,
      isSupported: false,
      isLoading: false,
      isRefreshing: false,
      hasError: false,
      errorMessage: null,
      canRetry: false,
      refetch: async () => {},
      connectedAddress: null,
    };
  }

  return {
    allAccounts,
    paginatedAccounts,
    availableRoles,
    filters,
    setFilters,
    resetFilters,
    pagination,
    hasContractSelected: true,
    capabilities,
    isSupported,
    isLoading,
    isRefreshing,
    hasError,
    errorMessage,
    canRetry,
    refetch,
    connectedAddress,
  };
}
