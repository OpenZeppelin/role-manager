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

import { useDerivedAccountStatus } from '@openzeppelin/ui-react';
import type { AccessControlCapabilities } from '@openzeppelin/ui-types';

import {
  AM_ADMIN_ROLE_ID,
  AM_ADMIN_ROLE_NAME,
  AM_PUBLIC_ROLE_ID,
  AM_PUBLIC_ROLE_NAME,
} from '../constants';
import {
  DEFAULT_FILTER_STATE,
  type AccountsFilterState,
  type AuthorizedAccountView,
  type RoleBadgeInfo,
} from '../types/authorized-accounts';
import { applyAccountsFilters, transformRolesToAccounts } from '../utils/account-transformer';
import { buildFilterRolesFromBadges } from '../utils/filter-roles';
import { useAccessManagerRoles } from './useAccessManagerRoles';
import { useContractCapabilities, type ExtendedCapabilities } from './useContractCapabilities';
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

  const { selectedContract, runtime, isContractRegistered } = useSelectedContract();
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
  } = useContractCapabilities(
    runtime,
    contractAddress,
    isContractRegistered,
    selectedContract?.capabilities
  );

  const hasAccessManager = (capabilities as ExtendedCapabilities)?.hasAccessManager ?? false;

  // Enriched roles fetching (disabled for AccessManager contracts)
  const {
    roles: enrichedRoles,
    isLoading: isRolesLoading,
    isFetching: isRolesFetching,
    refetch: refetchRoles,
    hasError: hasRolesError,
    canRetry: canRetryRoles,
    errorMessage: rolesErrorMessage,
  } = useContractRolesEnriched(runtime, contractAddress, isContractRegistered && !hasAccessManager);

  // AccessManager roles (Feature 018)
  const {
    roles: amRoles,
    isLoading: isAmRolesLoading,
    error: amRolesError,
    refetch: refetchAmRoles,
  } = useAccessManagerRoles(
    runtime,
    contractAddress,
    hasAccessManager,
    selectedContract?.networkId ?? ''
  );

  // Ownership fetching
  // Only fetch when contract has Ownable capability (prevents errors on AccessControl-only contracts)
  const hasOwnableCapability = capabilities?.hasOwnable ?? false;
  const {
    ownership,
    isLoading: isOwnershipLoading,
    isFetching: isOwnershipFetching,
    refetch: refetchOwnership,
  } = useContractOwnership(runtime, contractAddress, isContractRegistered, hasOwnableCapability);

  // =============================================================================
  // Computed Values
  // =============================================================================

  // Transform to account-centric view
  // For AccessManager: build accounts from AM roles directly
  const allAccountsUnfiltered = useMemo(() => {
    if (hasAccessManager) {
      const accountMap = new Map<string, AuthorizedAccountView>();
      for (const role of amRoles) {
        let roleName: string;
        if (role.label) roleName = role.label;
        else if (role.roleId === AM_ADMIN_ROLE_ID) roleName = AM_ADMIN_ROLE_NAME;
        else if (role.roleId === AM_PUBLIC_ROLE_ID) roleName = AM_PUBLIC_ROLE_NAME;
        else roleName = `Role #${role.roleId}`;

        for (const member of role.members) {
          const addr = member.address.toLowerCase();
          if (!accountMap.has(addr)) {
            accountMap.set(addr, {
              id: member.address,
              address: member.address,
              status: 'active',
              dateAdded: member.since > 0 ? new Date(member.since * 1000).toISOString() : null,
              roles: [],
            });
          }
          const account = accountMap.get(addr)!;
          account.roles.push({
            id: role.roleId,
            name: roleName,
          });
        }
      }
      return Array.from(accountMap.values());
    }
    return transformRolesToAccounts(enrichedRoles, ownership);
  }, [hasAccessManager, amRoles, enrichedRoles, ownership]);

  // Extract available roles for filter dropdown
  // Uses consistent sorting: Owner, Admin at top, then enumerated roles alphabetically
  const availableRoles = useMemo((): RoleBadgeInfo[] => {
    // Extract unique roles from accounts
    const rolesMap = new Map<string, RoleBadgeInfo>();
    for (const account of allAccountsUnfiltered) {
      for (const role of account.roles) {
        if (!rolesMap.has(role.id)) {
          rolesMap.set(role.id, role);
        }
      }
    }

    // Use shared utility to add synthetic roles at top and sort
    return buildFilterRolesFromBadges(Array.from(rolesMap.values()));
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

  // Include contract registration waiting period in loading state
  // When contract is selected but not yet registered, queries are disabled
  // and their isLoading is false, but we're still "loading" from user perspective
  const isWaitingForRegistration = !!selectedContract && !isContractRegistered;
  const isLoading = hasAccessManager
    ? isWaitingForRegistration || isCapabilitiesLoading || isAmRolesLoading
    : isWaitingForRegistration || isCapabilitiesLoading || isRolesLoading || isOwnershipLoading;
  const isRefreshing = hasAccessManager
    ? false
    : !isLoading && (isRolesFetching || isOwnershipFetching);
  const hasError = hasAccessManager
    ? !!capabilitiesError || !!amRolesError
    : !!capabilitiesError || hasRolesError;
  const errorMessage = hasAccessManager
    ? (amRolesError?.message ?? capabilitiesError?.message ?? null)
    : (rolesErrorMessage ?? capabilitiesError?.message ?? null);
  const canRetry = hasAccessManager
    ? !!amRolesError || !!capabilitiesError
    : canRetryRoles || !!capabilitiesError;

  // =============================================================================
  // Actions
  // =============================================================================

  // Combined refetch function
  const refetch = useCallback(async (): Promise<void> => {
    if (hasAccessManager) {
      await refetchAmRoles();
      return;
    }
    await Promise.all([refetchRoles(), refetchOwnership()]);
  }, [hasAccessManager, refetchAmRoles, refetchRoles, refetchOwnership]);

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

  // Get connected wallet address from wallet state (spec 013)
  const { address: connectedAddress } = useDerivedAccountStatus();

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
    connectedAddress: connectedAddress ?? null,
  };
}
