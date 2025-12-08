/**
 * useContractHistory hook
 * Feature: 012-role-changes-data
 *
 * Provides paginated history data from the AccessControlService's getHistory() API.
 * Uses react-query for caching and cursor-based pagination.
 *
 * Tasks: T004
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { ContractAdapter } from '@openzeppelin/ui-builder-types';

import type {
  HistoryQueryOptions,
  PageInfo,
  PaginatedHistoryResult,
  UseContractHistoryReturn,
} from '../types/role-changes';
import { DataError, ErrorCategory, wrapError } from '../utils/errors';
import { useAccessControlService } from './useAccessControlService';

/**
 * Default page size for history queries.
 * Per FR-023: Default page size MUST be 20 events per page.
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Query key factory for contract history.
 * Includes all parameters that affect the query result.
 */
const historyQueryKey = (address: string, cursor?: string, roleId?: string, limit?: number) =>
  ['contract-history', address, { cursor, roleId, limit }] as const;

/**
 * Empty page info for default/error states.
 */
const EMPTY_PAGE_INFO: PageInfo = {
  hasNextPage: false,
  endCursor: undefined,
};

/**
 * Hook that fetches paginated history entries for a contract.
 *
 * Uses the AccessControlService's getHistory() API with cursor-based pagination.
 * Supports server-side filtering by roleId.
 *
 * @param adapter - Contract adapter instance
 * @param contractAddress - Contract address to fetch history for
 * @param isContractRegistered - Whether contract is registered (default: true)
 * @param options - Query options (cursor, roleId, limit)
 * @returns History data and controls
 *
 * @example
 * ```tsx
 * const {
 *   items,
 *   pageInfo,
 *   isLoading,
 *   hasError,
 * } = useContractHistory(adapter, address, true, { limit: 20 });
 *
 * if (isLoading) return <Spinner />;
 * if (hasError) return <ErrorMessage />;
 *
 * return <HistoryTable items={items} />;
 * ```
 */
export function useContractHistory(
  adapter: ContractAdapter | null,
  contractAddress: string,
  isContractRegistered: boolean = true,
  options?: HistoryQueryOptions
): UseContractHistoryReturn {
  const { service, isReady } = useAccessControlService(adapter);

  // Normalize options with defaults
  const queryOptions = useMemo(
    () => ({
      limit: options?.limit ?? DEFAULT_PAGE_SIZE,
      cursor: options?.cursor,
      roleId: options?.roleId,
      account: options?.account,
    }),
    [options?.limit, options?.cursor, options?.roleId, options?.account]
  );

  const {
    data,
    isLoading,
    isFetching,
    error: rawError,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: historyQueryKey(
      contractAddress,
      queryOptions.cursor,
      queryOptions.roleId,
      queryOptions.limit
    ),
    queryFn: async (): Promise<PaginatedHistoryResult> => {
      if (!service) {
        throw new DataError(
          'Access control service not available',
          ErrorCategory.SERVICE_UNAVAILABLE,
          { canRetry: false }
        );
      }

      try {
        return await service.getHistory(contractAddress, queryOptions);
      } catch (err) {
        throw wrapError(err, 'history');
      }
    },
    enabled: isReady && !!contractAddress && isContractRegistered,
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });

  // Process error
  const error = useMemo(() => {
    if (!rawError) return null;
    return rawError instanceof DataError ? rawError : wrapError(rawError, 'history');
  }, [rawError]);

  // Refetch wrapper
  const refetch = async (): Promise<void> => {
    await queryRefetch();
  };

  // Computed values
  const hasError = error !== null;
  const canRetry = error?.canRetry ?? false;
  const errorMessage = error?.getUserMessage() ?? null;

  return {
    items: data?.items ?? [],
    pageInfo: data?.pageInfo ?? EMPTY_PAGE_INFO,
    isLoading,
    isFetching,
    hasError,
    errorMessage,
    canRetry,
    refetch,
  };
}
