/**
 * Hook for accessing the Access Control service from the runtime.
 * Feature: 006-access-control-service
 *
 * Provides a stable reference to the AccessControlService from the current runtime,
 * enabling access control operations (feature detection, roles, ownership, mutations).
 */

import { useMemo } from 'react';

import type { AccessControlService } from '@openzeppelin/ui-types';

import type { RoleManagerRuntime } from '@/core/runtimeAdapter';

/**
 * Return type for useAccessControlService hook
 */
export interface UseAccessControlServiceReturn {
  /** The AccessControlService instance, or null if not available */
  service: AccessControlService | null;
  /** Whether the service is ready to use (runtime loaded and supports access control) */
  isReady: boolean;
}

/**
 * Hook that provides access to the AccessControlService from the current runtime.
 *
 * The service is extracted from the runtime's `accessControl` capability.
 * If the runtime does not support access control, the service will be null.
 *
 * @param runtime - The ecosystem runtime instance, or null if not loaded
 * @returns Object containing the service and its readiness state
 *
 * @example
 * ```tsx
 * const { runtime } = useNetworkAdapter(selectedNetwork);
 * const { service, isReady } = useAccessControlService(runtime);
 *
 * if (!isReady) return <div>Loading...</div>;
 *
 * // Now safe to use the service
 * const capabilities = await service.getCapabilities(contractAddress);
 * ```
 */
export function useAccessControlService(
  runtime: RoleManagerRuntime | null
): UseAccessControlServiceReturn {
  // Memoize the service extraction to maintain stable reference
  const service = useMemo<AccessControlService | null>(() => {
    return runtime?.accessControl ?? null;
  }, [runtime]);

  const isReady = service !== null;

  return {
    service,
    isReady,
  };
}
