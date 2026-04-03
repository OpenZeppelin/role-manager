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

import type { RoleManagerRuntime } from '@/core/runtimeAdapter';

import type { UseDashboardDataReturn } from '../types/dashboard';
import { getUniqueAccountsCount } from '../utils/deduplication';
import { generateSnapshotFilename } from '../utils/snapshot';
import type { SnapshotAlias } from './useAccessControlMutations';
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
  /** Alias-resolved display label for export metadata */
  label?: string | null;
  /** Aliases to embed in the exported snapshot for round-trip import/export */
  aliases?: SnapshotAlias[];
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
 *   label: 'My Token Contract', // resolved from alias system
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
  runtime: RoleManagerRuntime | null,
  contractAddress: string,
  options: UseDashboardDataOptions
): UseDashboardDataReturn {
  const { networkId, networkName, label, aliases, isContractRegistered = true } = options;
  // Track refreshing state separately from initial load
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Detect capabilities to gate ownership query (prevents errors on AccessControl-only contracts)
  const { capabilities, isPending: capabilitiesPending } = useContractCapabilities(
    runtime,
    contractAddress,
    isContractRegistered
  );
  const hasOwnableCapability = capabilities?.hasOwnable ?? false;

  // Fetch enriched roles data for cross-page cache sharing.
  // After fetching, useContractRolesEnriched populates the basic roles cache via setQueryData,
  // so when navigating to Roles page it doesn't need to make another RPC call.
  const {
    roles: enrichedRoles,
    isPending: rolesPending,
    isSettling: rolesSettling,
    hasError: rolesHasError,
    errorMessage: rolesErrorMessage,
    canRetry: rolesCanRetry,
    refetch: rolesRefetch,
  } = useContractRolesEnriched(runtime, contractAddress, isContractRegistered);

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
    isPending: ownershipPending,
    hasError: ownershipHasError,
    errorMessage: ownershipErrorMessage,
    canRetry: ownershipCanRetry,
    refetch: ownershipRefetch,
  } = useContractOwnership(runtime, contractAddress, isContractRegistered, hasOwnableCapability);

  // Use isPending (not isLoading) from TanStack Query v5 for count guards.
  // isPending is true whenever no cached data exists — this covers all gaps:
  //   - query disabled (enabled: false, e.g. waiting for contract registration)
  //   - query just enabled but fetch not yet scheduled
  //   - query actively fetching for the first time
  // isSettling extends this: the query resolved with empty data but the indexer
  // may still be initializing. Return null (loading skeleton) instead of showing 0.
  const rolesCount = useMemo(() => {
    if (!runtime || !contractAddress) return null;
    if (rolesPending || rolesSettling) return null;
    return roles.length;
  }, [runtime, contractAddress, rolesPending, rolesSettling, roles.length]);

  // Compute unique accounts count using Set-based deduplication
  const uniqueAccountsCount = useMemo(() => {
    if (!runtime || !contractAddress) return null;
    if (rolesPending || rolesSettling) return null;
    return getUniqueAccountsCount(roles);
  }, [runtime, contractAddress, rolesPending, rolesSettling, roles]);

  // Determine capability flags from detected capabilities (more reliable than inference)
  const hasAccessControl = useMemo(() => {
    return capabilities?.hasAccessControl ?? false;
  }, [capabilities]);

  const hasOwnable = useMemo(() => {
    return hasOwnableCapability;
  }, [hasOwnableCapability]);

  // Combined loading state using isPending from TanStack Query v5.
  // isPending is true whenever no cached data exists, covering all timing gaps:
  //   - query disabled (waiting for contract registration or adapter)
  //   - query just enabled but fetch not yet scheduled
  //   - query actively fetching for the first time
  // rolesSettling covers the gap where the query resolved with empty data but
  // the indexer is still initializing — keeps the loading skeleton visible.
  // Ownership is only expected to have data when the contract supports Ownable.
  const isLoading =
    capabilitiesPending ||
    rolesPending ||
    rolesSettling ||
    (hasOwnableCapability && ownershipPending);

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
    return generateSnapshotFilename(contractAddress, { withExtension: false });
  }, [contractAddress]);

  // Export functionality using useExportSnapshot hook
  const {
    exportSnapshot: doExportSnapshot,
    isExporting,
    error: exportSnapshotError,
  } = useExportSnapshot(runtime, contractAddress, {
    networkId,
    networkName,
    label,
    aliases,
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
