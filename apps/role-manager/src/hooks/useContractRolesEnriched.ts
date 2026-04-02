/**
 * useContractRolesEnriched hook
 * Feature: 011-accounts-real-data
 *
 * Provides enriched role assignments with member timestamps from the
 * AccessControlService. After fetching enriched data, this hook also
 * populates the basic roles cache (useContractRoles query key) so that
 * other components can reuse the data without making additional RPC calls.
 *
 * Tasks: T027, T028
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { RoleAssignment } from '@openzeppelin/ui-types';
import { logger } from '@openzeppelin/ui-utils';

import type { RoleManagerRuntime } from '@/core/runtimeAdapter';

import type { EnrichedRoleAssignment } from '../types/authorized-accounts';
import { DataError, ErrorCategory, wrapError } from '../utils/errors';
import { queryKeys } from './queryKeys';
import { useAccessControlService } from './useAccessControlService';

/**
 * Return type for useContractRolesEnriched hook
 */
export interface UseContractRolesEnrichedReturn {
  /** Enriched role assignments with member timestamps */
  roles: EnrichedRoleAssignment[];
  /** Whether initial fetch is in progress */
  isLoading: boolean;
  /** Whether no cached data exists yet (true even when query is disabled or just enabled) */
  isPending: boolean;
  /** Whether background refresh is in progress */
  isFetching: boolean;
  /** Whether query resolved empty and is still polling for real data (indexer initializing) */
  isSettling: boolean;
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

// Use centralized query keys

/**
 * Hook that fetches enriched role assignments with timestamps.
 *
 * Uses the AccessControlService's getCurrentRolesEnriched() API when available,
 * falling back to getCurrentRoles() and converting to enriched format.
 *
 * Performance optimization: After fetching enriched roles, this hook also populates
 * the basic roles cache (used by useContractRoles). This enables cache sharing across
 * pages - when Dashboard or Authorized Accounts loads first, the Roles page benefits
 * from the already-cached basic roles data.
 *
 * @param runtime - Ecosystem runtime instance
 * @param contractAddress - Contract address to fetch roles for
 * @param isContractRegistered - Whether contract is registered (default: true)
 * @returns Enriched roles data and controls
 *
 * @example
 * ```tsx
 * const { roles, isLoading, hasError } = useContractRolesEnriched(runtime, address);
 *
 * if (isLoading) return <Spinner />;
 * if (hasError) return <ErrorMessage />;
 *
 * return <AccountsList roles={roles} />;
 * ```
 */
export function useContractRolesEnriched(
  runtime: RoleManagerRuntime | null,
  contractAddress: string,
  isContractRegistered: boolean = true
): UseContractRolesEnrichedReturn {
  const { service, isReady } = useAccessControlService(runtime);
  const queryClient = useQueryClient();

  const {
    data: roles,
    isLoading,
    isPending,
    isFetching,
    error: rawError,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: queryKeys.contractRolesEnriched(contractAddress),
    queryFn: async (): Promise<EnrichedRoleAssignment[]> => {
      if (!service) {
        throw new DataError(
          'Access control service not available',
          ErrorCategory.SERVICE_UNAVAILABLE,
          { canRetry: false }
        );
      }

      try {
        const enrichedRoles = await service.getCurrentRolesEnriched(contractAddress);

        // Also populate the basic roles cache to prevent redundant fetches
        // when other components (like ManageRolesDialog via useRolesPageData) need role data.
        // This converts enriched roles back to basic RoleAssignment format.
        const basicRoles: RoleAssignment[] = enrichedRoles.map((er) => ({
          role: er.role,
          members: er.members.map((m) => m.address),
        }));
        queryClient.setQueryData(queryKeys.contractRoles(contractAddress), basicRoles);

        return enrichedRoles;
      } catch (enrichedErr) {
        // T022: Fallback to getCurrentRoles() when enriched data is unavailable
        // (e.g., indexer not deployed for this network). Convert basic roles
        // to enriched format without timestamp metadata.
        logger.warn(
          `[useContractRolesEnriched] Enriched roles unavailable for ${contractAddress}, falling back to basic roles:`,
          enrichedErr instanceof Error ? enrichedErr.message : String(enrichedErr)
        );
        try {
          const basicRoles = await service.getCurrentRoles(contractAddress);

          // Populate the basic roles cache
          queryClient.setQueryData(queryKeys.contractRoles(contractAddress), basicRoles);

          // Convert to enriched format (no grant metadata available)
          const enrichedFromBasic: EnrichedRoleAssignment[] = basicRoles.map((role) => ({
            role: role.role,
            members: role.members.map((address) => ({ address })),
          }));

          return enrichedFromBasic;
        } catch (fallbackErr) {
          throw wrapError(fallbackErr, 'enriched-roles');
        }
      }
    },
    enabled: isReady && !!contractAddress && isContractRegistered,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: false,
    // Poll every 2s while the service returns empty data (max 5 cycles).
    // The indexer/service may not have role IDs available on the first call
    // (e.g. role discovery via indexer is still initializing). Polling ensures
    // the UI auto-recovers without requiring a manual refresh.
    refetchInterval: (query) => {
      if (query.state.status === 'error') return false;
      const data = query.state.data;
      if ((!data || data.length === 0) && query.state.dataUpdateCount < 5) {
        return 2_000;
      }
      return false;
    },
  });

  const error = useMemo(() => {
    if (!rawError) return null;
    return rawError instanceof DataError ? rawError : wrapError(rawError, 'enriched-roles');
  }, [rawError]);

  const isEmpty = useMemo(() => !roles || roles.length === 0, [roles]);

  // Derive settling state from the query cache's dataUpdateCount — the same counter
  // that refetchInterval uses to stop polling. This keeps both in sync and avoids
  // stale isSettling after remounts when the cached empty array persists.
  const MAX_SETTLE_CYCLES = 5;
  const dataUpdateCount =
    queryClient.getQueryState(queryKeys.contractRolesEnriched(contractAddress))?.dataUpdateCount ??
    0;

  const isSettling =
    !isPending &&
    (roles === undefined || roles.length === 0) &&
    !rawError &&
    dataUpdateCount < MAX_SETTLE_CYCLES;

  const refetch = async (): Promise<void> => {
    await queryRefetch();
  };

  const hasError = error !== null;
  const canRetry = error?.canRetry ?? false;
  const errorMessage = error?.getUserMessage() ?? null;

  return {
    roles: roles ?? [],
    isLoading,
    isPending,
    isFetching,
    isSettling,
    error,
    errorMessage,
    canRetry,
    hasError,
    isEmpty,
    refetch,
  };
}
