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
  type HistoryFilterState,
  type HistoryQueryOptions,
  type UseRoleChangesPageDataReturn,
} from '../types/role-changes';
import { createGetAccountUrl, createGetTransactionUrl } from '../utils/explorer-urls';
import {
  applyHistoryFilters,
  extractAvailableRoles,
  transformHistoryEntries,
} from '../utils/history-transformer';
import { useContractCapabilities } from './useContractCapabilities';
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

  // Build query options with server-side role filter
  const queryOptions: HistoryQueryOptions = useMemo(
    () => ({
      limit: DEFAULT_PAGE_SIZE,
      cursor: paginationState.currentCursor,
      roleId: filters.roleFilter !== 'all' ? filters.roleFilter : undefined,
    }),
    [paginationState.currentCursor, filters.roleFilter]
  );

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

  // Apply client-side filters (action type)
  const events = useMemo(
    () => applyHistoryFilters(transformedEvents, filters),
    [transformedEvents, filters]
  );

  // Extract available roles for filter dropdown
  // Note: Using transformed events (before client-side filter) to show all roles
  const availableRoles = useMemo(
    (): RoleBadgeInfo[] => extractAvailableRoles(transformedEvents),
    [transformedEvents]
  );

  // =============================================================================
  // Effects - State Reset
  // =============================================================================

  // Update hasNextPage from API response
  useEffect(() => {
    if (pageInfo) {
      setPaginationState((prev) => ({
        ...prev,
        hasNextPage: pageInfo.hasNextPage,
      }));
    }
  }, [pageInfo]);

  // Track if role filter has changed (skip initial mount)
  const prevRoleFilterRef = useRef(filters.roleFilter);

  // Reset pagination when server-side filters change (roleFilter)
  // Client-side filters (actionFilter) don't need pagination reset
  useEffect(() => {
    // Skip on mount - only reset when filter actually changes
    if (prevRoleFilterRef.current !== filters.roleFilter) {
      prevRoleFilterRef.current = filters.roleFilter;
      setPaginationState(DEFAULT_CURSOR_PAGINATION_STATE);
    }
  }, [filters.roleFilter]);

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
      hasNextPage: paginationState.hasNextPage,
      hasPrevPage: paginationState.cursorHistory.length > 0,
      nextPage: () => {
        if (pageInfo.endCursor) {
          setPaginationState((prev) => ({
            currentCursor: pageInfo.endCursor,
            cursorHistory: prev.currentCursor
              ? [...prev.cursorHistory, prev.currentCursor]
              : prev.cursorHistory,
            hasNextPage: false, // Will be updated when new data loads
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
            hasNextPage: true, // We know there's at least a next page (current one)
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
