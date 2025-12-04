/**
 * useContractCapabilities hook
 * Feature: 006-access-control-service
 *
 * Provides feature detection for access control contracts.
 * Determines what interfaces a contract supports (AccessControl, Ownable, etc.)
 * Uses react-query for caching and automatic refetching.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { AccessControlCapabilities, ContractAdapter } from '@openzeppelin/ui-builder-types';

import { useAccessControlService } from './useAccessControlService';

/**
 * Return type for useContractCapabilities hook
 */
export interface UseContractCapabilitiesReturn {
  /** Detected capabilities, or null if not yet loaded or unsupported */
  capabilities: AccessControlCapabilities | null;
  /** Whether the query is currently loading */
  isLoading: boolean;
  /** Error if capability detection failed */
  error: Error | null;
  /** Function to manually refetch capabilities */
  refetch: () => Promise<void>;
  /** Whether the contract is supported (has AccessControl OR Ownable) */
  isSupported: boolean;
}

/**
 * Query key factory for contract capabilities
 */
const capabilitiesQueryKey = (address: string) => ['contractCapabilities', address] as const;

/**
 * Hook that detects access control capabilities for a given contract.
 *
 * Uses the AccessControlService from the adapter to determine what
 * interfaces the contract implements (AccessControl, Ownable, etc.).
 *
 * @param adapter - The contract adapter instance, or null if not loaded
 * @param contractAddress - The contract address to check
 * @returns Object containing capabilities, loading state, error, and helper functions
 *
 * @example
 * ```tsx
 * const { adapter } = useNetworkAdapter(selectedNetwork);
 * const { capabilities, isLoading, isSupported } = useContractCapabilities(adapter, address);
 *
 * if (isLoading) return <Spinner />;
 * if (!isSupported) return <UnsupportedContractMessage />;
 *
 * return (
 *   <div>
 *     {capabilities.hasAccessControl && <RolesTab />}
 *     {capabilities.hasOwnable && <OwnershipTab />}
 *   </div>
 * );
 * ```
 */
export function useContractCapabilities(
  adapter: ContractAdapter | null,
  contractAddress: string
): UseContractCapabilitiesReturn {
  // Get the access control service from the adapter
  const { service, isReady } = useAccessControlService(adapter);

  // Query for capabilities using react-query
  const {
    data: capabilities,
    isLoading,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: capabilitiesQueryKey(contractAddress),
    queryFn: async (): Promise<AccessControlCapabilities> => {
      if (!service) {
        throw new Error('Access control service not available');
      }
      return service.getCapabilities(contractAddress);
    },
    // Only run query when we have a service and valid address
    enabled: isReady && !!contractAddress,
    // Stale time of 5 minutes - capabilities don't change often
    staleTime: 5 * 60 * 1000,
    // Keep in cache for 30 minutes
    gcTime: 30 * 60 * 1000,
    // Don't retry on failure - let user manually retry
    retry: false,
  });

  // Compute isSupported based on capabilities
  const isSupported = useMemo(() => {
    if (!capabilities) return false;
    return capabilities.hasAccessControl || capabilities.hasOwnable;
  }, [capabilities]);

  // Wrap refetch to return void
  const refetch = async (): Promise<void> => {
    await queryRefetch();
  };

  return {
    capabilities: capabilities ?? null,
    isLoading,
    error: error as Error | null,
    refetch,
    isSupported,
  };
}

/**
 * Helper function to validate if capabilities indicate a supported contract.
 * Can be used outside of React components for validation logic.
 *
 * @param capabilities - The capabilities to check
 * @returns true if contract has AccessControl OR Ownable
 */
export function isContractSupported(capabilities: AccessControlCapabilities | null): boolean {
  if (!capabilities) return false;
  return capabilities.hasAccessControl || capabilities.hasOwnable;
}
