/**
 * useCurrentBlock hook
 * Feature: 015-ownership-transfer
 * Updated by: 017-evm-access-control (Phase 6 — US5, T041a)
 *
 * Provides polling for current block/ledger number.
 * Used for:
 * - Displaying current block/ledger in transfer dialogs (label from adapter metadata)
 * - Validating expiration input is in the future
 *
 * Polling is only enabled when the adapter requires expiration input (mode: 'required').
 * Callers use getCurrentValueLabel() from utils/expiration.ts for display labels.
 */
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import type { ContractAdapter } from '@openzeppelin/ui-types';

// =============================================================================
// Constants
// =============================================================================

/** Default polling interval for current block (milliseconds) */
export const DEFAULT_POLL_INTERVAL_MS = 5000;

// =============================================================================
// Types
// =============================================================================

/**
 * Options for useCurrentBlock hook
 */
export interface UseCurrentBlockOptions {
  /** Polling interval in milliseconds (default: 5000) */
  pollInterval?: number;
  /** Whether polling is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Return type for useCurrentBlock hook
 */
export interface UseCurrentBlockReturn {
  /** Current block number, null if not yet fetched */
  currentBlock: number | null;
  /** Whether the initial fetch is loading */
  isLoading: boolean;
  /** Error from fetching, if any */
  error: Error | null;
  /** Manually trigger a refresh */
  refetch: () => void;
}

// =============================================================================
// Query Key
// =============================================================================

const currentBlockQueryKey = (networkId: string | undefined) =>
  ['currentBlock', networkId] as const;

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for polling the current block number.
 *
 * Uses the adapter's `getCurrentBlock()` method which is chain-agnostic,
 * returning the current block number for any supported chain.
 *
 * @param adapter - The contract adapter instance, or null if not loaded
 * @param options - Polling configuration
 * @returns Current block and loading/error states
 *
 * @example
 * ```tsx
 * const { currentBlock, isLoading } = useCurrentBlock(adapter, {
 *   pollInterval: 5000,
 *   enabled: hasTwoStepOwnable,
 * });
 *
 * const isExpirationValid = expirationBlock > (currentBlock ?? 0);
 * ```
 */
export function useCurrentBlock(
  adapter: ContractAdapter | null,
  options?: UseCurrentBlockOptions
): UseCurrentBlockReturn {
  const { pollInterval = DEFAULT_POLL_INTERVAL_MS, enabled = true } = options ?? {};

  const networkId = adapter?.networkConfig?.id;

  const query = useQuery({
    queryKey: currentBlockQueryKey(networkId),
    queryFn: async () => {
      if (!adapter) {
        throw new Error('Adapter not available');
      }
      return adapter.getCurrentBlock();
    },
    enabled: !!adapter && enabled,
    refetchInterval: enabled ? pollInterval : false,
    // Don't retry on error - let polling handle recovery
    retry: false,
    // Keep stale data while refetching
    staleTime: pollInterval / 2,
  });

  // Wrap refetch to handle void return
  const refetch = useCallback(() => {
    void query.refetch();
  }, [query]);

  return {
    currentBlock: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch,
  };
}
