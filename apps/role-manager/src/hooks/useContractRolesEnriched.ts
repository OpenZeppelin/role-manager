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

import type { ContractAdapter, RoleAssignment } from '@openzeppelin/ui-types';
import { logger } from '@openzeppelin/ui-utils';

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
 * @param adapter - Contract adapter instance
 * @param contractAddress - Contract address to fetch roles for
 * @param isContractRegistered - Whether contract is registered (default: true)
 * @returns Enriched roles data and controls
 *
 * @example
 * ```tsx
 * const { roles, isLoading, hasError } = useContractRolesEnriched(adapter, address);
 *
 * if (isLoading) return <Spinner />;
 * if (hasError) return <ErrorMessage />;
 *
 * return <AccountsList roles={roles} />;
 * ```
 */
export function useContractRolesEnriched(
  adapter: ContractAdapter | null,
  contractAddress: string,
  isContractRegistered: boolean = true
): UseContractRolesEnrichedReturn {
  const { service, isReady } = useAccessControlService(adapter);
  const queryClient = useQueryClient();

  const {
    data: roles,
    isLoading,
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
  });

  const error = useMemo(() => {
    if (!rawError) return null;
    return rawError instanceof DataError ? rawError : wrapError(rawError, 'enriched-roles');
  }, [rawError]);

  const isEmpty = useMemo(() => !roles || roles.length === 0, [roles]);

  const refetch = async (): Promise<void> => {
    await queryRefetch();
  };

  const hasError = error !== null;
  const canRetry = error?.canRetry ?? false;
  const errorMessage = error?.getUserMessage() ?? null;

  return {
    roles: roles ?? [],
    isLoading,
    isFetching,
    error,
    errorMessage,
    canRetry,
    hasError,
    isEmpty,
    refetch,
  };
}
