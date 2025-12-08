/**
 * useContractRolesEnriched hook
 * Feature: 011-accounts-real-data
 *
 * Provides enriched role assignments with member timestamps from the
 * AccessControlService. Falls back to regular getCurrentRoles() when
 * enriched API is unavailable.
 *
 * Tasks: T027, T028
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { ContractAdapter } from '@openzeppelin/ui-builder-types';

import type { EnrichedRoleAssignment } from '../types/authorized-accounts';
import { DataError, ErrorCategory, wrapError } from '../utils/errors';
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

/**
 * Query key factory for enriched roles
 */
const enrichedRolesQueryKey = (address: string) => ['contractRolesEnriched', address] as const;

/**
 * Hook that fetches enriched role assignments with timestamps.
 *
 * Uses the AccessControlService's getCurrentRolesEnriched() API when available,
 * falling back to getCurrentRoles() and converting to enriched format.
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

  const {
    data: roles,
    isLoading,
    isFetching,
    error: rawError,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: enrichedRolesQueryKey(contractAddress),
    queryFn: async (): Promise<EnrichedRoleAssignment[]> => {
      if (!service) {
        throw new DataError(
          'Access control service not available',
          ErrorCategory.SERVICE_UNAVAILABLE,
          { canRetry: false }
        );
      }

      try {
        // T028: Try enriched API first, fallback to regular API
        if ('getCurrentRolesEnriched' in service) {
          const enrichedRoles = await (
            service as {
              getCurrentRolesEnriched: (address: string) => Promise<EnrichedRoleAssignment[]>;
            }
          ).getCurrentRolesEnriched(contractAddress);
          return enrichedRoles;
        }

        // Fallback: convert regular roles to enriched format (without timestamps)
        const regularRoles = await service.getCurrentRoles(contractAddress);
        return regularRoles.map((roleAssignment) => ({
          role: roleAssignment.role,
          members: roleAssignment.members.map((address) => ({ address })),
        }));
      } catch (err) {
        throw wrapError(err, 'enriched-roles');
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
