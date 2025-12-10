/**
 * useRoleChangesPageData hook
 * Feature: 012-role-changes-data
 *
 * Main orchestration hook for the Role Changes page.
 * Combines data fetching, transformation, filtering, and cursor-based pagination.
 *
 * Tasks: T005
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { RoleBadgeInfo } from '../types/authorized-accounts';
import {
  DEFAULT_CURSOR_PAGINATION_STATE,
  DEFAULT_HISTORY_FILTER_STATE,
  type CursorPaginationControls,
  type CursorPaginationState,
  type HistoryChangeType,
  type HistoryFilterState,
  type HistoryQueryOptions,
  type UseRoleChangesPageDataReturn,
} from '../types/role-changes';
import { createGetAccountUrl, createGetTransactionUrl } from '../utils/explorer-urls';
import { transformHistoryEntries } from '../utils/history-transformer';
import { getRoleName } from '../utils/role-name';
import { useContractCapabilities } from './useContractCapabilities';
import { useContractRoles } from './useContractData';
import { DEFAULT_PAGE_SIZE, useContractHistory } from './useContractHistory';
import { useSelectedContract } from './useSelectedContract';

/**
 * Hook that orchestrates all data fetching for the Role Changes page.
 *
 * Combines multiple data sources:
 * - Contract capabilities (supportsHistory detection)
 * - History data with cursor-based pagination
 * - Client-side filtering for action type
 * - Server-side filtering for role (via API parameters)
 *
 * Implements:
 * - Cursor-based pagination with back navigation
 * - Contract change detection and state reset
 * - Combined loading/error states
 *
 * @returns Object containing events, loading/error states, filters, pagination, and actions
 *
 * @example
 * ```tsx
 * function RoleChangesPage() {
 *   const {
 *     events,
 *     isLoading,
 *     hasError,
 *     errorMessage,
 *     supportsHistory,
 *     isSupported,
 *     refetch,
 *   } = useRoleChangesPageData();
 *
 *   if (isLoading) return <ChangesLoadingSkeleton />;
 *   if (hasError) return <ChangesErrorState message={errorMessage} onRetry={refetch} />;
 *   if (!isSupported) return <ChangesEmptyState />;
 *   if (!supportsHistory) return <ChangesEmptyState historyNotSupported />;
 *
 *   return <ChangesTable events={events} />;
 * }
 * ```
 */
export function useRoleChangesPageData(): UseRoleChangesPageDataReturn {
  // =============================================================================
  // Context & State
  // =============================================================================

  const { selectedContract, adapter, isContractRegistered } = useSelectedContract();
  const contractAddress = selectedContract?.address ?? '';
  const contractId = selectedContract?.id;

  // Filter state
  const [filters, setFilters] = useState<HistoryFilterState>(DEFAULT_HISTORY_FILTER_STATE);

  // Debounced search query to avoid triggering API on every keystroke
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(filters.searchQuery);

  // Debounce search query changes (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(filters.searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [filters.searchQuery]);

  // Cursor-based pagination state
  const [paginationState, setPaginationState] = useState<CursorPaginationState>(
    DEFAULT_CURSOR_PAGINATION_STATE
  );

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

  // Check if history is supported
  const supportsHistory = capabilities?.supportsHistory ?? false;

  // Build query options with server-side filters (role, changeType, search, timestamps)
  // Map UI action filter to API changeType for server-side filtering
  const queryOptions: HistoryQueryOptions = useMemo(() => {
    // Map UI action filter to API changeType
    let changeType: HistoryChangeType | undefined = undefined;
    if (filters.actionFilter !== 'all') {
      const actionToChangeTypeMap: Record<
        Exclude<HistoryFilterState['actionFilter'], 'all'>,
        HistoryChangeType
      > = {
        grant: 'GRANTED',
        revoke: 'REVOKED',
        'ownership-transfer': 'TRANSFERRED',
      };
      changeType = actionToChangeTypeMap[filters.actionFilter];
    }

    // Determine if searchQuery is a valid address or should be treated as transaction ID
    // Use adapter's isValidAddress for chain-agnostic address validation
    // Note: Uses debounced search query to avoid API calls on every keystroke
    const searchQuery = debouncedSearchQuery.trim();
    const hasSearch = searchQuery.length > 0;

    // Use adapter to validate if it's a valid address (chain-agnostic)
    const isValidAddress = hasSearch && adapter?.isValidAddress(searchQuery);

    return {
      limit: DEFAULT_PAGE_SIZE,
      cursor: paginationState.currentCursor,
      roleId: filters.roleFilter !== 'all' ? filters.roleFilter : undefined,
      changeType,
      // If it's a valid address, pass to account param
      account: isValidAddress ? searchQuery : undefined,
      // If it's not a valid address but has search input, try as txId
      txId: hasSearch && !isValidAddress ? searchQuery : undefined,
      timestampFrom: filters.timestampFrom,
      timestampTo: filters.timestampTo,
    };
  }, [
    adapter,
    paginationState.currentCursor,
    filters.roleFilter,
    filters.actionFilter,
    debouncedSearchQuery,
    filters.timestampFrom,
    filters.timestampTo,
  ]);

  // Determine if history fetch should be enabled
  const shouldFetchHistory = isContractRegistered && isSupported && supportsHistory;

  // History data fetching
  const {
    items: historyItems,
    pageInfo,
    isLoading: isHistoryLoading,
    isFetching: isHistoryFetching,
    hasError: hasHistoryError,
    errorMessage: historyErrorMessage,
    canRetry: canRetryHistory,
    refetch: refetchHistory,
  } = useContractHistory(adapter, contractAddress, shouldFetchHistory, queryOptions);

  // Contract roles (cached via react-query)
  const {
    roles: contractRoles,
    isLoading: areRolesLoading,
    isFetching: areRolesFetching,
  } = useContractRoles(adapter, contractAddress, isContractRegistered);

  // =============================================================================
  // Explorer URL Helpers (chain-agnostic via adapter)
  // =============================================================================

  // Create URL generator functions using shared utilities
  // These handle different URL patterns across chains (EVM, Stellar, etc.)
  const getTransactionUrl = useMemo(() => createGetTransactionUrl(adapter), [adapter]);
  const getAccountUrl = useMemo(() => createGetAccountUrl(adapter), [adapter]);

  // =============================================================================
  // Computed Values
  // =============================================================================

  // Transform history entries to view models
  const transformedEvents = useMemo(
    () => transformHistoryEntries(historyItems, { getTransactionUrl, getAccountUrl }),
    [historyItems, getTransactionUrl, getAccountUrl]
  );

  const events = transformedEvents;

  // Available roles for filter dropdown (reuses cached roles query)
  const availableRoles = useMemo((): RoleBadgeInfo[] => {
    if (!contractRoles) return [];
    const badges = contractRoles.map((assignment) => ({
      id: assignment.role.id,
      name: getRoleName(assignment.role.label, assignment.role.id),
    }));
    return badges.sort((a, b) => a.name.localeCompare(b.name));
  }, [contractRoles]);
  const availableRolesLoading = areRolesLoading || areRolesFetching;

  // =============================================================================
  // Effects - State Reset
  // =============================================================================

  // Track previous filter values for pagination reset (skip initial mount)
  const prevFiltersRef = useRef({
    actionFilter: filters.actionFilter,
    roleFilter: filters.roleFilter,
    searchQuery: debouncedSearchQuery,
    timestampFrom: filters.timestampFrom,
    timestampTo: filters.timestampTo,
  });

  // Reset pagination when filters change (FR-026)
  // Note: Uses debounced search query so pagination doesn't reset on every keystroke
  useEffect(() => {
    // Skip on mount - only reset when filters actually change
    const filtersChanged =
      prevFiltersRef.current.actionFilter !== filters.actionFilter ||
      prevFiltersRef.current.roleFilter !== filters.roleFilter ||
      prevFiltersRef.current.searchQuery !== debouncedSearchQuery ||
      prevFiltersRef.current.timestampFrom !== filters.timestampFrom ||
      prevFiltersRef.current.timestampTo !== filters.timestampTo;

    if (filtersChanged) {
      prevFiltersRef.current = {
        actionFilter: filters.actionFilter,
        roleFilter: filters.roleFilter,
        searchQuery: debouncedSearchQuery,
        timestampFrom: filters.timestampFrom,
        timestampTo: filters.timestampTo,
      };
      setPaginationState(DEFAULT_CURSOR_PAGINATION_STATE);
    }
  }, [
    filters.actionFilter,
    filters.roleFilter,
    debouncedSearchQuery,
    filters.timestampFrom,
    filters.timestampTo,
  ]);

  // Reset state when contract changes (FR-008, FR-021)
  useEffect(() => {
    setFilters(DEFAULT_HISTORY_FILTER_STATE);
    setPaginationState(DEFAULT_CURSOR_PAGINATION_STATE);
  }, [contractId]);

  // =============================================================================
  // Loading & Error States
  // =============================================================================

  const isLoading = isCapabilitiesLoading || (shouldFetchHistory && isHistoryLoading);
  const isRefreshing = !isLoading && isHistoryFetching;
  const hasError = !!capabilitiesError || hasHistoryError;
  const errorMessage = historyErrorMessage ?? capabilitiesError?.message ?? null;
  const canRetry = canRetryHistory || !!capabilitiesError;

  // =============================================================================
  // Actions
  // =============================================================================

  // Refetch history
  const refetch = useCallback(async (): Promise<void> => {
    await refetchHistory();
  }, [refetchHistory]);

  // Reset filters to default
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_HISTORY_FILTER_STATE);
  }, []);

  // =============================================================================
  // Pagination Controls
  // =============================================================================

  const pagination: CursorPaginationControls = useMemo(
    () => ({
      hasNextPage: pageInfo?.hasNextPage ?? false,
      hasPrevPage: paginationState.cursorHistory.length > 0,
      nextPage: () => {
        if (pageInfo.endCursor) {
          setPaginationState((prev) => ({
            currentCursor: pageInfo.endCursor,
            cursorHistory: prev.currentCursor
              ? [...prev.cursorHistory, prev.currentCursor]
              : prev.cursorHistory,
          }));
        }
      },
      prevPage: () => {
        setPaginationState((prev) => {
          const newHistory = [...prev.cursorHistory];
          const prevCursor = newHistory.pop();
          return {
            currentCursor: prevCursor,
            cursorHistory: newHistory,
          };
        });
      },
      resetToFirst: () => {
        setPaginationState(DEFAULT_CURSOR_PAGINATION_STATE);
      },
      isLoading: isHistoryLoading || isHistoryFetching,
    }),
    [paginationState, pageInfo, isHistoryLoading, isHistoryFetching]
  );

  // =============================================================================
  // Return
  // =============================================================================

  // Handle no contract selected
  if (!selectedContract) {
    return {
      events: [],
      availableRoles: [],
      availableRolesLoading: false,
      filters: DEFAULT_HISTORY_FILTER_STATE,
      setFilters: () => {},
      resetFilters: () => {},
      pagination: {
        hasNextPage: false,
        hasPrevPage: false,
        nextPage: () => {},
        prevPage: () => {},
        resetToFirst: () => {},
        isLoading: false,
      },
      hasContractSelected: false,
      supportsHistory: false,
      isSupported: false,
      isLoading: false,
      isRefreshing: false,
      hasError: false,
      errorMessage: null,
      canRetry: false,
      refetch: async () => {},
    };
  }

  return {
    events,
    availableRoles,
    availableRolesLoading,
    filters,
    setFilters,
    resetFilters,
    pagination,
    hasContractSelected: true,
    supportsHistory,
    isSupported,
    isLoading,
    isRefreshing,
    hasError,
    errorMessage,
    canRetry,
    refetch,
  };
}
