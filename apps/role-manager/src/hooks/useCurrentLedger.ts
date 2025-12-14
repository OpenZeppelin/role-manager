/**
 * useCurrentLedger hook
 * Feature: 015-ownership-transfer
 *
 * Provides polling for current block/ledger number.
 * Used for:
 * - Displaying current ledger in transfer dialog
 * - Validating expiration input is in the future
 */
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import type { ContractAdapter } from '@openzeppelin/ui-builder-types';

// =============================================================================
// Constants
// =============================================================================

/** Default polling interval for current block/ledger (milliseconds) */
export const DEFAULT_POLL_INTERVAL_MS = 5000;

// =============================================================================
// Types
// =============================================================================

/**
 * Options for useCurrentLedger hook
 */
export interface UseCurrentLedgerOptions {
  /** Polling interval in milliseconds (default: 5000) */
  pollInterval?: number;
  /** Whether polling is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Return type for useCurrentLedger hook
 */
export interface UseCurrentLedgerReturn {
  /** Current ledger/block number, null if not yet fetched */
  currentLedger: number | null;
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
 * Hook for polling the current ledger/block number.
 *
 * Uses the adapter's `getCurrentBlock()` method which is chain-agnostic,
 * returning the current block number for EVM chains or ledger sequence for Stellar.
 *
 * @param adapter - The contract adapter instance, or null if not loaded
 * @param options - Polling configuration
 * @returns Current ledger and loading/error states
 *
 * @example
 * ```tsx
 * const { currentLedger, isLoading } = useCurrentLedger(adapter, {
 *   pollInterval: 5000,
 *   enabled: hasTwoStepOwnable,
 * });
 *
 * const isExpirationValid = expirationLedger > (currentLedger ?? 0);
 * ```
 */
export function useCurrentLedger(
  adapter: ContractAdapter | null,
  options?: UseCurrentLedgerOptions
): UseCurrentLedgerReturn {
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
    currentLedger: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch,
  };
}
