/**
 * useContractCapabilities hook
 * Feature: 006-access-control-service
 *
 * Provides feature detection for access control contracts.
 * Determines what interfaces a contract supports (AccessControl, Ownable, AccessManager, etc.)
 * Uses react-query for caching and automatic refetching.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import type { AccessControlCapabilities } from '@openzeppelin/ui-types';
import { appConfigService, isValidUrl, userNetworkServiceConfigService } from '@openzeppelin/ui-utils';

import type { RoleManagerRuntime } from '@/core/runtimeAdapter';

import { queryKeys } from './queryKeys';
import { useAccessControlService } from './useAccessControlService';

/**
 * Resolve the RPC URL respecting user config > app override > default.
 * Mirrors the adapter's resolveRpcUrl priority.
 */
function resolveProbeRpcUrl(networkId: string, defaultRpcUrl: string): string {
  const userCfg = userNetworkServiceConfigService.get(networkId, 'rpc') as
    | { rpcUrl?: string }
    | undefined;
  if (userCfg?.rpcUrl && isValidUrl(String(userCfg.rpcUrl))) return String(userCfg.rpcUrl);

  const override = appConfigService.getRpcEndpointOverride(networkId);
  if (typeof override === 'string' && override && isValidUrl(override)) return override;
  if (override && typeof override === 'object' && 'http' in override) {
    const url = (override as { http: string }).http;
    if (isValidUrl(url)) return url;
  }

  return defaultRpcUrl;
}

// ============================================================================
// Extended Capabilities (includes AccessManager)
// ============================================================================

/**
 * Extended capabilities that includes AccessManager detection.
 * Augments the upstream AccessControlCapabilities with local extensions.
 */
export type ExtendedCapabilities = AccessControlCapabilities & {
  hasAccessManager?: boolean;
  hasScheduledOperations?: boolean;
  hasTargetManagement?: boolean;
};

/**
 * Return type for useContractCapabilities hook
 */
export interface UseContractCapabilitiesReturn {
  /** Detected capabilities, or null if not yet loaded or unsupported */
  capabilities: ExtendedCapabilities | null;
  /** Whether the query is currently loading */
  isLoading: boolean;
  /** Whether no cached data exists yet (true even when query is disabled or just enabled) */
  isPending: boolean;
  /** Error if capability detection failed */
  error: Error | null;
  /** Function to manually refetch capabilities */
  refetch: () => Promise<void>;
  /** Whether the contract is supported (has AccessControl OR Ownable OR AccessManager) */
  isSupported: boolean;
}

// Use centralized query keys

/**
 * Detect if a contract is an AccessManager by probing for ADMIN_ROLE() returning uint64(0).
 * Uses dynamic import of viem to avoid bundling it when not needed.
 */
async function probeAccessManager(
  runtime: RoleManagerRuntime,
  contractAddress: string
): Promise<boolean> {
  if (runtime.networkConfig.ecosystem !== 'evm') return false;

  try {
    const networkConfig = runtime.networkConfig as {
      id: string;
      rpcUrl: string;
      chainId: number;
    };

    const rpcUrl = resolveProbeRpcUrl(networkConfig.id, networkConfig.rpcUrl);

    const { createPublicClient, http } = await import('viem');
    const { ACCESS_MANAGER_ABI } = await import('../core/ecosystems/evm/accessManagerAbi');

    const client = createPublicClient({
      transport: http(rpcUrl),
    });

    const adminRole = await client.readContract({
      address: contractAddress as `0x${string}`,
      abi: ACCESS_MANAGER_ABI,
      functionName: 'ADMIN_ROLE',
    });

    // ADMIN_ROLE() should return uint64(0) for AccessManager
    return adminRole === 0n;
  } catch {
    return false;
  }
}

/**
 * Detect Ownable by probing owner() directly via RPC.
 * Used as a fallback when ABI-based detection fails (e.g., proxy contracts
 * whose implementation ABI couldn't be loaded from Etherscan/Sourcify).
 */
async function probeOwnable(
  runtime: RoleManagerRuntime,
  contractAddress: string
): Promise<boolean> {
  if (runtime.networkConfig.ecosystem !== 'evm') return false;

  try {
    const networkConfig = runtime.networkConfig as { id: string; rpcUrl: string };
    const rpcUrl = resolveProbeRpcUrl(networkConfig.id, networkConfig.rpcUrl);
    const { createPublicClient, http } = await import('viem');

    const client = createPublicClient({ transport: http(rpcUrl) });

    const owner = await client.readContract({
      address: contractAddress as `0x${string}`,
      abi: [
        {
          type: 'function',
          name: 'owner',
          inputs: [],
          outputs: [{ name: '', type: 'address' }],
          stateMutability: 'view',
        },
      ],
      functionName: 'owner',
    });

    // If owner() returns a valid address, the contract is Ownable
    return typeof owner === 'string' && owner.startsWith('0x');
  } catch {
    return false;
  }
}

/**
 * Hook that detects access control capabilities for a given contract.
 *
 * Uses the AccessControlService from the runtime to determine what
 * interfaces the contract implements (AccessControl, Ownable, etc.).
 * Additionally probes for AccessManager on EVM chains when standard
 * detection doesn't find AC/Ownable.
 *
 * @param runtime - The ecosystem runtime instance, or null if not loaded
 * @param contractAddress - The contract address to check
 * @param isContractRegistered - Whether the contract is registered with the AccessControlService (default: true for backwards compatibility)
 * @returns Object containing capabilities, loading state, error, and helper functions
 *
 * @example
 * ```tsx
 * const { runtime } = useNetworkAdapter(selectedNetwork);
 * const { capabilities, isLoading, isSupported } = useContractCapabilities(runtime, address, isContractRegistered);
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
  runtime: RoleManagerRuntime | null,
  contractAddress: string,
  isContractRegistered: boolean = true,
  /** Stored capabilities from the contract record — seeds the cache on first load */
  storedCapabilities?: AccessControlCapabilities | null
): UseContractCapabilitiesReturn {
  // Get the access control service from the runtime
  const { service, isReady } = useAccessControlService(runtime);
  const queryClient = useQueryClient();

  // Seed/merge cache from stored capabilities if they include hasAccessManager
  // This ensures the hook picks up AccessManager detection across page navigations
  useEffect(() => {
    if (!contractAddress || !storedCapabilities) return;
    const stored = storedCapabilities as ExtendedCapabilities;
    if (!stored.hasAccessManager) return;

    const cached = queryClient.getQueryData<ExtendedCapabilities>(
      queryKeys.contractCapabilities(contractAddress)
    );

    // Seed if no cache, or merge if cache lacks hasAccessManager
    if (!cached || !cached.hasAccessManager) {
      queryClient.setQueryData(queryKeys.contractCapabilities(contractAddress), {
        ...(cached ?? stored),
        hasAccessManager: true,
        hasScheduledOperations: true,
        hasTargetManagement: true,
      });
    }
  }, [contractAddress, storedCapabilities, queryClient]);

  // Query for capabilities using react-query
  const {
    data: capabilities,
    isLoading,
    isPending,
    error,
    refetch: queryRefetch,
  } = useQuery({
    queryKey: queryKeys.contractCapabilities(contractAddress),
    queryFn: async (): Promise<ExtendedCapabilities> => {
      if (!service) {
        throw new Error('Access control service not available');
      }

      // Check stored capabilities first — avoids re-probing AccessManager
      const stored = storedCapabilities as ExtendedCapabilities | null | undefined;
      if (stored?.hasAccessManager) {
        const baseCaps = await service.getCapabilities(contractAddress);
        return {
          ...baseCaps,
          hasAccessManager: true,
          hasScheduledOperations: true,
          hasTargetManagement: true,
        };
      }

      // Standard capability detection
      const baseCaps = await service.getCapabilities(contractAddress);

      // If standard detection found AC or Ownable, return as-is
      if (baseCaps.hasAccessControl || baseCaps.hasOwnable) {
        return baseCaps as ExtendedCapabilities;
      }

      // Fallback: probe via RPC (covers proxy contracts whose implementation
      // ABI couldn't be loaded from Etherscan/Sourcify)
      if (runtime) {
        const isAccessManager = await probeAccessManager(runtime, contractAddress);
        if (isAccessManager) {
          return {
            ...baseCaps,
            hasAccessManager: true,
            hasScheduledOperations: true,
            hasTargetManagement: true,
          } as ExtendedCapabilities;
        }

        // Probe Ownable via owner() call — catches proxy contracts where
        // the adapter couldn't resolve the implementation ABI
        if (!baseCaps.hasOwnable) {
          const isOwnable = await probeOwnable(runtime, contractAddress);
          if (isOwnable) {
            return { ...baseCaps, hasOwnable: true } as ExtendedCapabilities;
          }
        }
      }

      // Nothing detected
      return baseCaps as ExtendedCapabilities;
    },
    // Only run query when we have a service, valid address, and contract is registered
    enabled: isReady && !!contractAddress && isContractRegistered,
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
    return (
      capabilities.hasAccessControl || capabilities.hasOwnable || !!capabilities.hasAccessManager
    );
  }, [capabilities]);

  // Wrap refetch to return void
  const refetch = async (): Promise<void> => {
    await queryRefetch();
  };

  return {
    capabilities: capabilities ?? null,
    isLoading,
    isPending,
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
 * @returns true if contract has AccessControl OR Ownable OR AccessManager
 */
export function isContractSupported(capabilities: ExtendedCapabilities | null): boolean {
  if (!capabilities) return false;
  return (
    capabilities.hasAccessControl || capabilities.hasOwnable || !!capabilities.hasAccessManager
  );
}

/**
 * Check if capabilities indicate an AccessManager contract.
 * Works with both raw capabilities and stored contract capabilities.
 */
export function hasAccessManagerCapability(
  capabilities:
    | ExtendedCapabilities
    | import('@openzeppelin/ui-types').AccessControlCapabilities
    | null
    | undefined
): boolean {
  return !!(capabilities as ExtendedCapabilities)?.hasAccessManager;
}
