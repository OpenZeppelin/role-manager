/**
 * useContractData hooks
 * Feature: 006-access-control-service
 *
 * Provides data fetching hooks for roles and ownership information.
 * Uses react-query for caching, automatic refetching, and optimistic updates.
 */

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  ContractAdapter,
  OwnershipInfo,
  RoleAssignment,
} from '@openzeppelin/ui-builder-types';

import { useAccessControlService } from './useAccessControlService';

/**
 * Return type for useContractRoles hook
 */
export interface UseContractRolesReturn {
  /** Array of role assignments */
  roles: RoleAssignment[];
  /** Whether the query is currently loading */
  isLoading: boolean;
  /** Error if role fetching failed */
  error: Error | null;
  /** Function to manually refetch roles */
  refetch: () => Promise<void>;
  /** Whether the roles list is empty */
  isEmpty: boolean;
  /** Total count of members across all roles */
  totalMemberCount: number;
}

/**
 * Return type for useContractOwnership hook
 */
export interface UseContractOwnershipReturn {
  /** Ownership information */
  ownership: OwnershipInfo | null;
  /** Whether the query is currently loading */
  isLoading: boolean;
  /** Error if ownership fetching failed */
  error: Error | null;
  /** Function to manually refetch ownership */
  refetch: () => Promise<void>;
  /** Whether the contract has an owner */
  hasOwner: boolean;
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
 * const { adapter } = useNetworkAdapter(selectedNetwork);
 * const { roles, isLoading, isEmpty } = useContractRoles(adapter, address);
 *
 * if (isLoading) return <Spinner />;
 * if (isEmpty) return <NoRolesMessage />;
 *
 * return (
 *   <ul>
 *     {roles.map((r) => (
 *       <li key={r.role.id}>
 *         {r.role.label}: {r.members.length} members
 *       </li>
 *     ))}
 *   </ul>
 * );
 * ```
 */
export function useContractRoles(
  adapter: ContractAdapter | null,
  contractAddress: string
): UseContractRolesReturn {
  // Get the access control service from the adapter
  const { service, isReady } = useAccessControlService(adapter);

  // Query for roles using react-query
  const {
    data: roles,
    isLoading,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: rolesQueryKey(contractAddress),
    queryFn: async (): Promise<RoleAssignment[]> => {
      if (!service) {
        throw new Error('Access control service not available');
      }
      return service.getCurrentRoles(contractAddress);
    },
    // Only run query when we have a service and valid address
    enabled: isReady && !!contractAddress,
    // Stale time of 1 minute - roles can change, so we want fresher data
    staleTime: 1 * 60 * 1000,
    // Keep in cache for 10 minutes
    gcTime: 10 * 60 * 1000,
    // Don't retry on failure - let user manually retry
    retry: false,
  });

  // Compute derived values
  const isEmpty = useMemo(() => {
    if (!roles) return true;
    return roles.length === 0;
  }, [roles]);

  const totalMemberCount = useMemo(() => {
    if (!roles) return 0;
    return roles.reduce((count, role) => count + role.members.length, 0);
  }, [roles]);

  // Wrap refetch to return void
  const refetch = async (): Promise<void> => {
    await queryRefetch();
  };

  return {
    roles: roles ?? [],
    isLoading,
    error: error as Error | null,
    refetch,
    isEmpty,
    totalMemberCount,
  };
}

/**
 * Hook that fetches ownership information for a given contract.
 *
 * Uses the AccessControlService from the adapter to retrieve the current
 * owner of the contract.
 *
 * @param adapter - The contract adapter instance, or null if not loaded
 * @param contractAddress - The contract address to fetch ownership for
 * @returns Object containing ownership, loading state, error, and helper functions
 *
 * @example
 * ```tsx
 * const { adapter } = useNetworkAdapter(selectedNetwork);
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
  // Get the access control service from the adapter
  const { service, isReady } = useAccessControlService(adapter);

  // Query for ownership using react-query
  const {
    data: ownership,
    isLoading,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: ownershipQueryKey(contractAddress),
    queryFn: async (): Promise<OwnershipInfo> => {
      if (!service) {
        throw new Error('Access control service not available');
      }
      return service.getOwnership(contractAddress);
    },
    // Only run query when we have a service and valid address
    enabled: isReady && !!contractAddress,
    // Stale time of 1 minute - ownership can change
    staleTime: 1 * 60 * 1000,
    // Keep in cache for 10 minutes
    gcTime: 10 * 60 * 1000,
    // Don't retry on failure - let user manually retry
    retry: false,
  });

  // Compute derived values
  const hasOwner = useMemo(() => {
    if (!ownership) return false;
    return ownership.owner !== null;
  }, [ownership]);

  // Wrap refetch to return void
  const refetch = async (): Promise<void> => {
    await queryRefetch();
  };

  return {
    ownership: ownership ?? null,
    isLoading,
    error: error as Error | null,
    refetch,
    hasOwner,
  };
}

/**
 * Default page size for pagination
 */
const DEFAULT_PAGE_SIZE = 10;

/**
 * Hook that provides paginated access to role assignments.
 *
 * Extends useContractRoles with client-side pagination for handling
 * large role lists efficiently in the UI.
 *
 * @param adapter - The contract adapter instance, or null if not loaded
 * @param contractAddress - The contract address to fetch roles for
 * @param options - Pagination options
 * @returns Object containing paginated roles and pagination controls
 *
 * @example
 * ```tsx
 * const { adapter } = useNetworkAdapter(selectedNetwork);
 * const {
 *   paginatedRoles,
 *   currentPage,
 *   totalPages,
 *   hasNextPage,
 *   nextPage,
 *   previousPage,
 * } = usePaginatedRoles(adapter, address, { pageSize: 20 });
 *
 * return (
 *   <>
 *     <RolesList roles={paginatedRoles} />
 *     <Pagination
 *       currentPage={currentPage}
 *       totalPages={totalPages}
 *       onNext={nextPage}
 *       onPrevious={previousPage}
 *       hasNext={hasNextPage}
 *     />
 *   </>
 * );
 * ```
 */
export function usePaginatedRoles(
  adapter: ContractAdapter | null,
  contractAddress: string,
  options?: PaginationOptions
): UsePaginatedRolesReturn {
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;

  // Get base roles data
  const rolesData = useContractRoles(adapter, contractAddress);
  const { roles } = rolesData;

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate total pages
  const totalPages = useMemo(() => {
    if (roles.length === 0) return 0;
    return Math.ceil(roles.length / pageSize);
  }, [roles.length, pageSize]);

  // Reset to page 1 when contract address changes
  useEffect(() => {
    setCurrentPage(1);
  }, [contractAddress]);

  // Get paginated subset
  const paginatedRoles = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return roles.slice(startIndex, endIndex);
  }, [roles, currentPage, pageSize]);

  // Pagination helpers
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [hasPreviousPage]);

  const goToPage = useCallback(
    (page: number) => {
      // Clamp to valid range
      const validPage = Math.max(1, Math.min(page, totalPages || 1));
      setCurrentPage(validPage);
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
