/**
 * Mutation Polling Subsystem
 *
 * Manages post-mutation smart polling and reactive preview state.
 *
 * After a mutation, RPC nodes may not immediately reflect the new state.
 * This module provides:
 *
 * 1. **recordMutationTimestamp** — marks that a mutation just completed,
 *    optionally attaching preview data for inline UI placeholders.
 * 2. **postMutationRefetchInterval** — drives React Query's refetchInterval
 *    to keep polling until data actually changes (or a safety timeout fires).
 * 3. **computeAdminRefetchInterval** — adds time-sensitive polling for
 *    admin delay changes and pending admin transfers.
 * 4. **useMutationPreview / useIsAwaitingUpdate** — reactive hooks so
 *    components can render context-specific ghost/shimmer placeholders.
 *
 * Extracted from useContractData.ts for testability and SRP.
 */

import { useSyncExternalStore } from 'react';

import type { AdminInfo } from '@openzeppelin/ui-types';

// =============================================================================
// Constants
// =============================================================================

/** Max time (ms) to force-poll after a mutation */
export const POST_MUTATION_POLL_WINDOW_MS = 30_000;
/** Polling interval during the forced window */
export const POST_MUTATION_POLL_INTERVAL_MS = 5_000;

// =============================================================================
// Types
// =============================================================================

/**
 * Preview data attached to a mutation poll state.
 * Carries enough context for UI components to render
 * context-specific ghost/shimmer placeholders.
 */
export interface MutationPreviewData {
  /** The mutation type (from invalidationMap) */
  type: string;
  /** Mutation-specific args (e.g. { roleId, account } for grantRole) */
  args: Record<string, unknown>;
}

export interface MutationPollState {
  /** When the mutation completed (Date.now()) */
  timestamp: number;
  /**
   * Snapshot of each query's data captured on the first post-mutation refetch.
   * Key: logical query id (e.g. 'roles', 'ownership', 'admin').
   */
  snapshots: Map<string, unknown>;
  /** Context for rendering inline previews while polling */
  preview?: MutationPreviewData;
}

// =============================================================================
// Module-level State
// =============================================================================

const mutationPollStates = new Map<string, MutationPollState>();

// ---------------------------------------------------------------------------
// Reactive subscription layer — allows React components to subscribe to
// poll-state changes via useSyncExternalStore.
// ---------------------------------------------------------------------------

const pollStateListeners = new Set<() => void>();

function subscribeToPollState(listener: () => void): () => void {
  pollStateListeners.add(listener);
  return () => pollStateListeners.delete(listener);
}

function notifyPollStateChange(): void {
  pollStateListeners.forEach((l) => l());
}

// =============================================================================
// Public API — Reactive Hooks
// =============================================================================

/**
 * React hook that returns the active mutation preview for a contract,
 * or null if no mutation is being polled.
 *
 * UI components use this to render context-specific ghost/shimmer
 * placeholders (e.g. a ghost AccountRow for a pending grantRole).
 */
export function useMutationPreview(contractAddress: string): MutationPreviewData | null {
  return useSyncExternalStore(
    subscribeToPollState,
    () => mutationPollStates.get(contractAddress)?.preview ?? null,
    () => null // server snapshot
  );
}

/**
 * Convenience hook — returns true while the app is actively polling for
 * post-mutation data changes on the given contract.
 */
export function useIsAwaitingUpdate(contractAddress: string): boolean {
  return useMutationPreview(contractAddress) !== null;
}

// =============================================================================
// Public API — Mutation Recording
// =============================================================================

/**
 * Record that a mutation just completed for the given contract.
 * Called from executeInvalidation in the mutation factory.
 *
 * When called without preview data (e.g. from onSuccess), existing preview
 * and snapshot progress are preserved so the ghost/shimmer indicators stay
 * visible while post-mutation polling continues.
 *
 * @param contractAddress Contract address
 * @param preview Optional preview context for rendering inline UI placeholders
 */
export function recordMutationTimestamp(
  contractAddress: string,
  preview?: MutationPreviewData
): void {
  const existing = mutationPollStates.get(contractAddress);

  // Don't overwrite a recent entry from the same mutation cycle
  // (executeInvalidation is called from both mutationFn and onSuccess)
  if (existing && Date.now() - existing.timestamp < 1000) {
    return;
  }

  mutationPollStates.set(contractAddress, {
    timestamp: Date.now(),
    // Preserve snapshot progress so smart-polling comparison isn't reset
    snapshots: existing?.snapshots ?? new Map(),
    // Preserve existing preview when the caller doesn't supply one
    // (e.g. the fire-and-forget onSuccess call in the mutation factory)
    preview: preview ?? existing?.preview,
  });
  notifyPollStateChange();
}

// =============================================================================
// Public API — Refetch Interval Calculators
// =============================================================================

/**
 * Determine whether post-mutation polling should continue for a specific query.
 *
 * Returns the poll interval (ms) when polling is active, or false to stop.
 * Stops polling when:
 * - No mutation is pending for this contract
 * - The 30 s safety timeout expires
 * - The query's data reference changes from the first post-mutation snapshot
 *   (meaning the RPC has caught up and fresh data is visible)
 *
 * @param contractAddress Contract address
 * @param queryId Logical query identifier (e.g. 'roles', 'ownership', 'admin')
 * @param currentData Current query data reference (from query.state.data)
 * @param dataUpdatedAt Timestamp of the last successful fetch (from query.state.dataUpdatedAt)
 */
export function postMutationRefetchInterval(
  contractAddress: string,
  queryId: string,
  currentData: unknown,
  dataUpdatedAt: number
): number | false {
  const state = mutationPollStates.get(contractAddress);
  if (!state) return false;

  // Safety net: stop after timeout
  if (Date.now() - state.timestamp > POST_MUTATION_POLL_WINDOW_MS) {
    mutationPollStates.delete(contractAddress);
    notifyPollStateChange();
    return false;
  }

  // Wait for the first refetch after the mutation to complete
  if (dataUpdatedAt <= state.timestamp) {
    return POST_MUTATION_POLL_INTERVAL_MS;
  }

  // Capture snapshot on the first post-mutation fetch for this query
  if (!state.snapshots.has(queryId)) {
    state.snapshots.set(queryId, currentData);
    return POST_MUTATION_POLL_INTERVAL_MS;
  }

  // Data reference changed → RPC caught up → stop ALL polling for this contract
  if (currentData !== state.snapshots.get(queryId)) {
    mutationPollStates.delete(contractAddress);
    notifyPollStateChange();
    return false;
  }

  return POST_MUTATION_POLL_INTERVAL_MS;
}

/**
 * Compute dynamic refetchInterval for the admin info query.
 *
 * Three layers of polling triggers (highest priority first):
 *
 * 1. **Post-mutation smart polling**: polls until data changes (or 30 s timeout).
 *    Breaks the chicken-and-egg between data-driven polling and RPC lag.
 *
 * 2. **Pending delay change** (effectAt timestamp):
 *    - Past deadline: 5 s (fast retry for RPC propagation)
 *    - Within 2 min:  15 s
 *    - Further out:   60 s
 *
 * 3. **Pending admin transfer** with timestamp-based expiration:
 *    Same intervals as pending delay change.
 *
 * When none of the above apply: false (no polling).
 */
export function computeAdminRefetchInterval(
  data: AdminInfo | null | undefined,
  contractAddress: string,
  dataUpdatedAt: number
): number | false {
  // Layer 1: Post-mutation smart polling — stops once data changes
  const mutationPoll = postMutationRefetchInterval(contractAddress, 'admin', data, dataUpdatedAt);
  if (mutationPoll !== false) return mutationPoll;

  if (!data) return false;

  // Layer 2: Pending admin delay change (effectAt is a UNIX timestamp in seconds)
  if (data.delayInfo?.pendingDelay?.effectAt) {
    const secondsLeft = data.delayInfo.pendingDelay.effectAt - Date.now() / 1000;
    if (secondsLeft <= 0) return 5_000;
    if (secondsLeft <= 120) return 15_000;
    return 60_000;
  }

  // Layer 3: Pending admin transfer with timestamp-based expiration
  // When delayInfo is present the contract is AccessControlDefaultAdminRules,
  // so expirationBlock holds a UNIX timestamp (seconds) rather than a block number.
  if (data.pendingTransfer && data.state === 'pending' && data.delayInfo) {
    const expirationTs = data.pendingTransfer.expirationBlock;
    if (expirationTs) {
      const secondsLeft = expirationTs - Date.now() / 1000;
      if (secondsLeft <= 0) return 5_000;
      if (secondsLeft <= 120) return 15_000;
      return 60_000;
    }
  }

  return false;
}

// =============================================================================
// Test Helpers — exposed for unit tests to manage module-level state
// =============================================================================

/**
 * Clear all mutation poll states. **Test use only.**
 * @internal
 */
export function _resetPollStatesForTesting(): void {
  mutationPollStates.clear();
  pollStateListeners.clear();
}

/**
 * Read the current poll state for a contract. **Test use only.**
 * @internal
 */
export function _getPollStateForTesting(contractAddress: string): MutationPollState | undefined {
  return mutationPollStates.get(contractAddress);
}
