/**
 * useDashboardData hook
 * Feature: 007-dashboard-real-data
 *
 * Aggregates data from useContractRolesEnriched and useContractOwnership
 * for Dashboard display. Computes derived values like unique account
 * counts and combines loading/error states.
 *
 * Performance optimization: Uses useContractRolesEnriched which, after fetching,
 * also populates the basic roles cache via setQueryData. This enables cross-page
 * cache sharing - when user navigates to Roles page, data is already cached.
 */

import { useCallback, useMemo, useState } from 'react';

import type { ContractAdapter } from '@openzeppelin/ui-types';

import type { UseDashboardDataReturn } from '../types/dashboard';
import { getUniqueAccountsCount } from '../utils/deduplication';
import { generateSnapshotFilename } from '../utils/snapshot';
import { useExportSnapshot } from './useAccessControlMutations';
import { useContractCapabilities } from './useContractCapabilities';
import { useContractOwnership } from './useContractData';
import { useContractRolesEnriched } from './useContractRolesEnriched';

/**
 * Options for useDashboardData hook
 */
export interface UseDashboardDataOptions {
  /** Network identifier for export metadata */
  networkId: string;
  /** Human-readable network name for export metadata */
  networkName: string;
  /** User-defined contract label for export metadata (optional) */
  label?: string | null;
  /** Whether the contract has been registered with the service (required for Stellar) */
  isContractRegistered?: boolean;
}

/**
 * Hook that aggregates all data needed for the Dashboard page.
 *
 * Combines roles and ownership data from the underlying hooks,
 * computes statistics like unique account counts, and provides
 * unified loading/error states.
 *
 * @param adapter - The contract adapter instance, or null if not loaded
 * @param contractAddress - The contract address to fetch data for
 * @param options - Configuration options including network info and contract label
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
 *   exportSnapshot,
 *   isExporting,
 * } = useDashboardData(adapter, contractAddress, {
 *   networkId: 'stellar-testnet',
 *   networkName: 'Stellar Testnet',
 *   label: 'My Token Contract',
 *   isContractRegistered: true,
 * });
 *
 * if (isLoading) return <Spinner />;
 * if (hasError) return <ErrorState onRetry={refetch} />;
 *
 * return (
 *   <>
 *     <StatsCard title="Roles" count={rolesCount} />
 *     <Button onClick={exportSnapshot} disabled={isExporting}>
 *       {isExporting ? 'Exporting...' : 'Download Snapshot'}
 *     </Button>
 *   </>
 * );
 * ```
 */
export function useDashboardData(
  adapter: ContractAdapter | null,
  contractAddress: string,
  options: UseDashboardDataOptions
): UseDashboardDataReturn {
  const { networkId, networkName, label, isContractRegistered = true } = options;
  // Track refreshing state separately from initial load
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Detect capabilities to gate ownership query (prevents errors on AccessControl-only contracts)
  const { capabilities, isLoading: capabilitiesLoading } = useContractCapabilities(
    adapter,
    contractAddress,
    isContractRegistered
  );
  const hasOwnableCapability = capabilities?.hasOwnable ?? false;

  // Fetch enriched roles data for cross-page cache sharing.
  // After fetching, useContractRolesEnriched populates the basic roles cache via setQueryData,
  // so when navigating to Roles page it doesn't need to make another RPC call.
  const {
    roles: enrichedRoles,
    isLoading: rolesLoading,
    hasError: rolesHasError,
    errorMessage: rolesErrorMessage,
    canRetry: rolesCanRetry,
    refetch: rolesRefetch,
  } = useContractRolesEnriched(adapter, contractAddress, isContractRegistered);

  // Convert enriched roles to basic format for counting
  // (enriched roles have { role, members: { address, grantedAt }[] })
  const roles = useMemo(
    () =>
      enrichedRoles.map((er) => ({
        role: er.role,
        members: er.members.map((m) => m.address),
      })),
    [enrichedRoles]
  );

  // Fetch ownership data
  // Only fetch when contract has Ownable capability (prevents errors on AccessControl-only contracts)
  const {
    isLoading: ownershipLoading,
    hasError: ownershipHasError,
    errorMessage: ownershipErrorMessage,
    canRetry: ownershipCanRetry,
    refetch: ownershipRefetch,
  } = useContractOwnership(adapter, contractAddress, isContractRegistered, hasOwnableCapability);

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

  // Determine capability flags from detected capabilities (more reliable than inference)
  const hasAccessControl = useMemo(() => {
    return capabilities?.hasAccessControl ?? false;
  }, [capabilities]);

  const hasOwnable = useMemo(() => {
    return hasOwnableCapability;
  }, [hasOwnableCapability]);

  // Combined loading state (include capabilities loading for initial state)
  const isLoading = capabilitiesLoading || rolesLoading || ownershipLoading;

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

  // Combined refetch function - refetches applicable queries in parallel
  // Throws on error to allow caller to handle (e.g., show toast notification)
  const refetch = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    try {
      const refetchPromises = [rolesRefetch()];
      // Only refetch ownership if the contract has Ownable capability
      if (hasOwnableCapability) {
        refetchPromises.push(ownershipRefetch());
      }
      const results = await Promise.allSettled(refetchPromises);
      // Check if any refetch failed and throw an aggregated error
      const failures = results.filter(
        (result): result is PromiseRejectedResult => result.status === 'rejected'
      );
      if (failures.length > 0) {
        // Throw the first error message to signal refresh failed
        const errorMessage =
          failures[0].reason instanceof Error
            ? failures[0].reason.message
            : 'Failed to refresh data';
        throw new Error(errorMessage);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [rolesRefetch, ownershipRefetch, hasOwnableCapability]);

  // Generate custom filename for snapshot export using truncated address and timestamp
  const snapshotFilename = useMemo(() => {
    if (!contractAddress) return undefined;
    // Remove the .json extension since useExportSnapshot adds it
    return generateSnapshotFilename(contractAddress).replace('.json', '');
  }, [contractAddress]);

  // Export functionality using useExportSnapshot hook
  const {
    exportSnapshot: doExportSnapshot,
    isExporting,
    error: exportSnapshotError,
  } = useExportSnapshot(adapter, contractAddress, {
    networkId,
    networkName,
    label,
    filename: snapshotFilename,
  });

  // Wrap exportSnapshot to handle void return type expected by UseDashboardDataReturn
  const exportSnapshot = useCallback((): void => {
    void doExportSnapshot();
  }, [doExportSnapshot]);

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

    // Export
    exportSnapshot,
    isExporting,
    exportError: exportSnapshotError?.message ?? null,
  };
}
