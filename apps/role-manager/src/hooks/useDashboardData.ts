/**
 * useDashboardData hook
 * Feature: 007-dashboard-real-data
 *
 * Aggregates data from useContractRoles and useContractOwnership
 * for Dashboard display. Computes derived values like unique account
 * counts and combines loading/error states.
 */

import { useCallback, useMemo, useState } from 'react';

import type { ContractAdapter } from '@openzeppelin/ui-builder-types';

import type { UseDashboardDataReturn } from '../types/dashboard';
import { getUniqueAccountsCount } from '../utils/deduplication';
import { useContractOwnership, useContractRoles } from './useContractData';

/**
 * Hook that aggregates all data needed for the Dashboard page.
 *
 * Combines roles and ownership data from the underlying hooks,
 * computes statistics like unique account counts, and provides
 * unified loading/error states.
 *
 * @param adapter - The contract adapter instance, or null if not loaded
 * @param contractAddress - The contract address to fetch data for
 * @param isContractRegistered - Whether the contract has been registered with the service (required for Stellar)
 * @returns Object containing all Dashboard data and actions
 *
 * @example
 * ```tsx
 * const {
 *   rolesCount,
 *   uniqueAccountsCount,
 *   isLoading,
 *   hasError,
 *   refetch,
 * } = useDashboardData(adapter, contractAddress, isContractRegistered);
 *
 * if (isLoading) return <Spinner />;
 * if (hasError) return <ErrorState onRetry={refetch} />;
 *
 * return (
 *   <StatsCard title="Roles" count={rolesCount} />
 * );
 * ```
 */
export function useDashboardData(
  adapter: ContractAdapter | null,
  contractAddress: string,
  isContractRegistered: boolean = true
): UseDashboardDataReturn {
  // Track refreshing state separately from initial load
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Only pass the contract address to underlying hooks if the contract is registered
  // This prevents the hooks from fetching before registration is complete
  const effectiveAddress = isContractRegistered ? contractAddress : '';

  // Fetch roles data
  const {
    roles,
    isLoading: rolesLoading,
    hasError: rolesHasError,
    errorMessage: rolesErrorMessage,
    canRetry: rolesCanRetry,
    refetch: rolesRefetch,
  } = useContractRoles(adapter, effectiveAddress);

  // Fetch ownership data
  const {
    // ownership data is available but not used directly in this hook
    // It's accessed via hasOwner for capability detection
    isLoading: ownershipLoading,
    hasError: ownershipHasError,
    errorMessage: ownershipErrorMessage,
    canRetry: ownershipCanRetry,
    refetch: ownershipRefetch,
    hasOwner,
  } = useContractOwnership(adapter, effectiveAddress);

  // Compute roles count
  const rolesCount = useMemo(() => {
    if (!adapter || !contractAddress) return null;
    if (rolesLoading) return null;
    return roles.length;
  }, [adapter, contractAddress, rolesLoading, roles.length]);

  // Compute unique accounts count using Set-based deduplication
  const uniqueAccountsCount = useMemo(() => {
    if (!adapter || !contractAddress) return null;
    if (rolesLoading) return null;
    return getUniqueAccountsCount(roles);
  }, [adapter, contractAddress, rolesLoading, roles]);

  // Determine capability flags
  // hasAccessControl: true if we have roles data (even if empty, if no error)
  // hasOwnable: true if ownership data shows an owner
  const hasAccessControl = useMemo(() => {
    // If there's an error fetching roles, we can't determine
    // If roles loaded successfully (even empty), contract supports AccessControl
    if (rolesLoading || rolesHasError) return false;
    return roles.length > 0 || !rolesHasError;
  }, [rolesLoading, rolesHasError, roles.length]);

  const hasOwnable = useMemo(() => {
    return hasOwner;
  }, [hasOwner]);

  // Combined loading state
  const isLoading = rolesLoading || ownershipLoading;

  // Combined error state
  const hasError = rolesHasError || ownershipHasError;

  // Combined error message (prioritize roles error, then ownership)
  const errorMessage = useMemo(() => {
    if (rolesErrorMessage) return rolesErrorMessage;
    if (ownershipErrorMessage) return ownershipErrorMessage;
    return null;
  }, [rolesErrorMessage, ownershipErrorMessage]);

  // Can retry if either can be retried
  const canRetry = rolesCanRetry || ownershipCanRetry;

  // Combined refetch function - refetches both in parallel
  const refetch = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    try {
      await Promise.all([rolesRefetch(), ownershipRefetch()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [rolesRefetch, ownershipRefetch]);

  // Export functionality - placeholder for now, will be implemented in Phase 6

  const exportSnapshot = useCallback((): void => {}, []);

  return {
    // Contract info (null handled at Dashboard level via useSelectedContract)
    contractInfo: null,

    // Statistics
    rolesCount,
    uniqueAccountsCount,
    hasAccessControl,
    hasOwnable,

    // State flags
    isLoading,
    isRefreshing,
    hasError,
    errorMessage,
    canRetry,

    // Actions
    refetch,

    // Export (Phase 6)
    exportSnapshot,
    isExporting: false,
    exportError: null,
  };
}
