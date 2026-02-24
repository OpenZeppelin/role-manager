/**
 * useBlockPollInterval hook
 * Feature: 017-evm-access-control (RPC polling optimisation)
 *
 * Derives a chain-agnostic polling interval from the calibrated average
 * block/ledger time.  Adapts automatically to any chain:
 *   - Ethereum (~12 s blocks) → ~15 s poll
 *   - Stellar  (~5 s ledgers) → ~6–7 s poll
 *   - Slow chains              → capped at 30 s
 *
 * The pure computation is exported separately (`computeBlockPollInterval`)
 * so it can be tested without React context.
 */
import { useMemo } from 'react';

import { useBlockTime } from '../context/useBlockTime';

// =============================================================================
// Constants
// =============================================================================

/** Default poll interval while block time is still calibrating (ms) */
export const DEFAULT_POLL_INTERVAL_MS = 10_000;
/** Minimum poll interval regardless of block time (ms) */
export const MIN_POLL_INTERVAL_MS = 5_000;
/** Maximum poll interval to keep countdowns responsive (ms) */
export const MAX_POLL_INTERVAL_MS = 30_000;
/** Multiplier over average block time — poll slightly slower than 1 block */
export const BLOCK_POLL_MULTIPLIER = 1.25;

// =============================================================================
// Pure Computation
// =============================================================================

/**
 * Compute a polling interval (ms) from the observed average block time.
 *
 * @param avgBlockTimeMs - Calibrated average block/ledger time, or `null`
 *                         when still calibrating.
 * @returns Polling interval in milliseconds, clamped to
 *          [`MIN_POLL_INTERVAL_MS`, `MAX_POLL_INTERVAL_MS`].
 */
export function computeBlockPollInterval(avgBlockTimeMs: number | null): number {
  if (avgBlockTimeMs == null) return DEFAULT_POLL_INTERVAL_MS;
  return Math.min(
    MAX_POLL_INTERVAL_MS,
    Math.max(MIN_POLL_INTERVAL_MS, Math.round(avgBlockTimeMs * BLOCK_POLL_MULTIPLIER))
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Returns a chain-aware polling interval derived from the `BlockTimeProvider`'s
 * calibrated block time.
 *
 * Must be used within a `<BlockTimeProvider>`.
 *
 * @example
 * ```tsx
 * const pollInterval = useBlockPollInterval();
 *
 * const { currentBlock } = useCurrentBlock(adapter, {
 *   enabled: hasPendingTransfer,
 *   pollInterval,
 * });
 * ```
 */
export function useBlockPollInterval(): number {
  const { avgBlockTimeMs } = useBlockTime();

  return useMemo(() => computeBlockPollInterval(avgBlockTimeMs), [avgBlockTimeMs]);
}
