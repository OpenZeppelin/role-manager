/**
 * useExpirationMetadata hook
 * Feature: 017-evm-access-control (Phase 6 — US5)
 *
 * Queries the runtime's accessControl capability for expiration metadata
 * to determine how the UI should handle expiration for ownership and
 * admin transfers.
 *
 * Returns:
 * - ExpirationMetadata (mode, label, unit, currentValue)
 * - Derived booleans for UI rendering decisions
 */
import { useQuery } from '@tanstack/react-query';

import type { ExpirationMetadata } from '@openzeppelin/ui-types';

import type { RoleManagerRuntime } from '@/core/runtimeAdapter';

import { queryKeys } from './queryKeys';
import { useAccessControlService } from './useAccessControlService';

// =============================================================================
// Types
// =============================================================================

export type TransferType = 'ownership' | 'admin';

export interface UseExpirationMetadataOptions {
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
}

export interface UseExpirationMetadataReturn {
  /** Expiration metadata from the adapter, undefined while loading */
  metadata: ExpirationMetadata | undefined;
  /** Whether the query is loading */
  isLoading: boolean;
  /** Error from fetching metadata */
  error: Error | null;
}

// Re-export for backwards compatibility
export const expirationMetadataQueryKey = queryKeys.expirationMetadata;

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook for fetching expiration metadata from the adapter.
 *
 * The metadata tells the UI whether to show an expiration input ('required'),
 * hide it entirely ('none'), or show read-only info ('contract-managed').
 *
 * @param adapter - The contract adapter instance
 * @param contractAddress - The contract address to query
 * @param transferType - Whether this is an 'ownership' or 'admin' transfer
 * @param options - Query options
 *
 * @example
 * ```tsx
 * const { metadata } = useExpirationMetadata(adapter, address, 'ownership');
 *
 * // metadata?.mode === 'required' → show expiration input
 * // metadata?.mode === 'none' → no expiration input
 * // metadata?.mode === 'contract-managed' → show read-only info
 * ```
 */
export function useExpirationMetadata(
  runtime: RoleManagerRuntime | null,
  contractAddress: string,
  transferType: TransferType,
  options?: UseExpirationMetadataOptions
): UseExpirationMetadataReturn {
  const { service } = useAccessControlService(runtime);
  const { enabled = true } = options ?? {};

  const networkId = runtime?.networkConfig?.id;

  // Guard: all runtimes expose getExpirationMetadata via the accessControl
  // capability, but the interface marks it optional. If missing, the query stays disabled.
  const hasMethod = !!service?.getExpirationMetadata;

  const query = useQuery({
    queryKey: queryKeys.expirationMetadata(contractAddress, transferType, networkId),
    queryFn: async (): Promise<ExpirationMetadata> => {
      // Safe to assert: query is only enabled when hasMethod is true
      return service!.getExpirationMetadata!(contractAddress, transferType);
    },
    enabled: !!service && !!contractAddress && hasMethod && enabled,
    // Metadata is stable for a given contract+transferType, cache indefinitely
    staleTime: Infinity,
    retry: false,
  });

  return {
    metadata: query.data ?? undefined,
    isLoading: query.isLoading && hasMethod,
    error: query.error as Error | null,
  };
}
