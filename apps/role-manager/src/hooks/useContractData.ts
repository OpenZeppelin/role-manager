/**
 * useContractData hooks
 * Feature: 006-access-control-service
 *
 * Provides data fetching hooks for roles and ownership information.
 * Uses react-query for caching, automatic refetching, and optimistic updates.
 *
 * Implements FR-012: Handles contracts that pass initial validation but
 * fail subsequent service calls with contextual error messages.
 */

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  ContractAdapter,
  OwnershipInfo,
  RoleAssignment,
} from '@openzeppelin/ui-builder-types';

import { DataError, ErrorCategory, wrapError } from '../utils/errors';
import { useAccessControlService } from './useAccessControlService';

/**
 * Return type for useContractRoles hook
 */
export interface UseContractRolesReturn {
  /** Array of role assignments */
  roles: RoleAssignment[];
  /** Whether the query is currently loading (initial fetch) */
  isLoading: boolean;
  /** Whether data is being refetched (background refresh) */
  isFetching: boolean;
  /** Error if role fetching failed */
  error: DataError | null;
  /** Function to manually refetch roles */
  refetch: () => Promise<void>;
  /** Whether the roles list is empty */
  isEmpty: boolean;
  /** Total count of members across all roles */
  totalMemberCount: number;
  /** Whether the error can be recovered by retrying */
  canRetry: boolean;
  /** User-friendly error message */
  errorMessage: string | null;
  /** Whether in error state (failed after validation) */
  hasError: boolean;
}

/**
 * Return type for useContractOwnership hook
 */
export interface UseContractOwnershipReturn {
  /** Ownership information */
  ownership: OwnershipInfo | null;
  /** Whether the query is currently loading (initial fetch) */
  isLoading: boolean;
  /** Whether data is being refetched (background refresh) */
  isFetching: boolean;
  /** Error if ownership fetching failed */
  error: DataError | null;
  /** Function to manually refetch ownership */
  refetch: () => Promise<void>;
  /** Whether the contract has an owner */
  hasOwner: boolean;
  /** Whether the error can be recovered by retrying */
  canRetry: boolean;
  /** User-friendly error message */
  errorMessage: string | null;
  /** Whether in error state (failed after validation) */
  hasError: boolean;
}

/**
 * Pagination options for usePaginatedRoles
 */
export interface PaginationOptions {
  /** Number of items per page (default: 10) */
  pageSize?: number;
}

/**
 * Return type for usePaginatedRoles hook
 */
export interface UsePaginatedRolesReturn extends UseContractRolesReturn {
  /** Paginated subset of roles for current page */
  paginatedRoles: RoleAssignment[];
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNextPage: boolean;
  /** Whether there is a previous page */
  hasPreviousPage: boolean;
  /** Go to the next page */
  nextPage: () => void;
  /** Go to the previous page */
  previousPage: () => void;
  /** Go to a specific page */
  goToPage: (page: number) => void;
  /** Current page size */
  pageSize: number;
}

/**
 * Query key factory for contract roles
 */
const rolesQueryKey = (address: string) => ['contractRoles', address] as const;

/**
 * Query key factory for contract ownership
 */
const ownershipQueryKey = (address: string) => ['contractOwnership', address] as const;

/**
 * Hook that fetches role assignments for a given contract.
 *
 * Uses the AccessControlService from the adapter to retrieve all current
 * role assignments and their members.
 *
 * @param adapter - The contract adapter instance, or null if not loaded
 * @param contractAddress - The contract address to fetch roles for
 * @returns Object containing roles, loading state, error, and helper functions
 *
 * @example
 * ```tsx
 * const { roles, isLoading, isEmpty } = useContractRoles(adapter, address);
 *
 * if (isLoading) return <Spinner />;
 * if (isEmpty) return <NoRolesMessage />;
 *
 * return <RolesList roles={roles} />;
 * ```
 */
export function useContractRoles(
  adapter: ContractAdapter | null,
  contractAddress: string
): UseContractRolesReturn {
  const { service, isReady } = useAccessControlService(adapter);

  const {
    data: roles,
    isLoading,
    isFetching,
    error: rawError,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: rolesQueryKey(contractAddress),
    queryFn: async (): Promise<RoleAssignment[]> => {
      if (!service) {
        throw new DataError(
          'Access control service not available',
          ErrorCategory.SERVICE_UNAVAILABLE,
          { canRetry: false }
        );
      }
      try {
        return await service.getCurrentRoles(contractAddress);
      } catch (err) {
        throw wrapError(err, 'roles');
      }
    },
    enabled: isReady && !!contractAddress,
    staleTime: 1 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });

  const error = useMemo(() => {
    if (!rawError) return null;
    return rawError instanceof DataError ? rawError : wrapError(rawError, 'roles');
  }, [rawError]);

  const isEmpty = useMemo(() => !roles || roles.length === 0, [roles]);

  const totalMemberCount = useMemo(() => {
    if (!roles) return 0;
    return roles.reduce((count, role) => count + role.members.length, 0);
  }, [roles]);

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
    refetch,
    isEmpty,
    totalMemberCount,
    hasError,
    canRetry,
    errorMessage,
  };
}

/**
 * Hook that fetches ownership information for a given contract.
 *
 * @param adapter - The contract adapter instance, or null if not loaded
 * @param contractAddress - The contract address to fetch ownership for
 * @returns Object containing ownership, loading state, error, and helper functions
 *
 * @example
 * ```tsx
 * const { ownership, isLoading, hasOwner } = useContractOwnership(adapter, address);
 *
 * if (isLoading) return <Spinner />;
 * if (!hasOwner) return <NoOwnerMessage />;
 *
 * return <div>Owner: {ownership.owner}</div>;
 * ```
 */
export function useContractOwnership(
  adapter: ContractAdapter | null,
  contractAddress: string
): UseContractOwnershipReturn {
  const { service, isReady } = useAccessControlService(adapter);

  const {
    data: ownership,
    isLoading,
    isFetching,
    error: rawError,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: ownershipQueryKey(contractAddress),
    queryFn: async (): Promise<OwnershipInfo> => {
      if (!service) {
        throw new DataError(
          'Access control service not available',
          ErrorCategory.SERVICE_UNAVAILABLE,
          { canRetry: false }
        );
      }
      try {
        return await service.getOwnership(contractAddress);
      } catch (err) {
        throw wrapError(err, 'ownership');
      }
    },
    enabled: isReady && !!contractAddress,
    staleTime: 1 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });

  const error = useMemo(() => {
    if (!rawError) return null;
    return rawError instanceof DataError ? rawError : wrapError(rawError, 'ownership');
  }, [rawError]);

  const hasOwner = useMemo(() => ownership?.owner != null, [ownership]);

  const refetch = async (): Promise<void> => {
    await queryRefetch();
  };

  const hasError = error !== null;
  const canRetry = error?.canRetry ?? false;
  const errorMessage = error?.getUserMessage() ?? null;

  return {
    ownership: ownership ?? null,
    isLoading,
    isFetching,
    error,
    refetch,
    hasOwner,
    hasError,
    canRetry,
    errorMessage,
  };
}

const DEFAULT_PAGE_SIZE = 10;

/**
 * Hook that provides paginated access to role assignments.
 *
 * @param adapter - The contract adapter instance, or null if not loaded
 * @param contractAddress - The contract address to fetch roles for
 * @param options - Pagination options
 * @returns Object containing paginated roles and pagination controls
 */
export function usePaginatedRoles(
  adapter: ContractAdapter | null,
  contractAddress: string,
  options?: PaginationOptions
): UsePaginatedRolesReturn {
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const rolesData = useContractRoles(adapter, contractAddress);
  const { roles } = rolesData;

  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = useMemo(() => {
    if (roles.length === 0) return 0;
    return Math.ceil(roles.length / pageSize);
  }, [roles.length, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [contractAddress]);

  const paginatedRoles = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return roles.slice(startIndex, startIndex + pageSize);
  }, [roles, currentPage, pageSize]);

  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  const nextPage = useCallback(() => {
    if (hasNextPage) setCurrentPage((prev) => prev + 1);
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) setCurrentPage((prev) => prev - 1);
  }, [hasPreviousPage]);

  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages || 1)));
    },
    [totalPages]
  );

  return {
    ...rolesData,
    paginatedRoles,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    nextPage,
    previousPage,
    goToPage,
    pageSize,
  };
}
