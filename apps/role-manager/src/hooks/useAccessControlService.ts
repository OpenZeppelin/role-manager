/**
 * Hook for accessing the Access Control service from the adapter.
 * Feature: 006-access-control-service
 *
 * Provides a stable reference to the AccessControlService from the current adapter,
 * enabling access control operations (feature detection, roles, ownership, mutations).
 */

import { useMemo } from 'react';

import type { AccessControlService, ContractAdapter } from '@openzeppelin/ui-types';

/**
 * Return type for useAccessControlService hook
 */
export interface UseAccessControlServiceReturn {
  /** The AccessControlService instance, or null if not available */
  service: AccessControlService | null;
  /** Whether the service is ready to use (adapter loaded and supports access control) */
  isReady: boolean;
}

/**
 * Hook that provides access to the AccessControlService from the current adapter.
 *
 * The service is extracted from the adapter's optional `getAccessControlService()` method.
 * If the adapter does not support access control, the service will be null.
 *
 * @param adapter - The contract adapter instance, or null if not loaded
 * @returns Object containing the service and its readiness state
 *
 * @example
 * ```tsx
 * const { adapter } = useNetworkAdapter(selectedNetwork);
 * const { service, isReady } = useAccessControlService(adapter);
 *
 * if (!isReady) return <div>Loading...</div>;
 *
 * // Now safe to use the service
 * const capabilities = await service.getCapabilities(contractAddress);
 * ```
 */
export function useAccessControlService(
  adapter: ContractAdapter | null
): UseAccessControlServiceReturn {
  // Memoize the service extraction to maintain stable reference
  const service = useMemo<AccessControlService | null>(() => {
    if (!adapter) {
      return null;
    }

    // Check if adapter supports access control operations
    if (!adapter.getAccessControlService) {
      return null;
    }

    return adapter.getAccessControlService() ?? null;
  }, [adapter]);

  const isReady = service !== null;

  return {
    service,
    isReady,
  };
}
