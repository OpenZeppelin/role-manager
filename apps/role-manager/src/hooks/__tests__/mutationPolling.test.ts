/**
 * Tests for mutationPolling module
 *
 * Covers:
 * - recordMutationTimestamp: dedup, preview preservation, snapshot preservation
 * - postMutationRefetchInterval: no-state, timeout, snapshot capture, data-change stop
 * - computeAdminRefetchInterval: layer priority, pending delay, pending transfer
 * - useMutationPreview / useIsAwaitingUpdate: reactive hooks
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminInfo } from '@openzeppelin/ui-types';

import {
  _getPollStateForTesting,
  _resetPollStatesForTesting,
  computeAdminRefetchInterval,
  POST_MUTATION_POLL_INTERVAL_MS,
  POST_MUTATION_POLL_WINDOW_MS,
  postMutationRefetchInterval,
  recordMutationTimestamp,
  useIsAwaitingUpdate,
  useMutationPreview,
} from '../mutationPolling';
import type { MutationPreviewData } from '../mutationPolling';

const CONTRACT = '0xABCDEF1234567890';

beforeEach(() => {
  _resetPollStatesForTesting();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// =============================================================================
// recordMutationTimestamp
// =============================================================================

describe('recordMutationTimestamp', () => {
  it('should create a new poll state with preview data', () => {
    const preview: MutationPreviewData = { type: 'grantRole', args: { account: '0x1' } };

    recordMutationTimestamp(CONTRACT, preview);

    const state = _getPollStateForTesting(CONTRACT);
    expect(state).toBeDefined();
    expect(state!.preview).toEqual(preview);
    expect(state!.snapshots.size).toBe(0);
  });

  it('should create a poll state without preview data', () => {
    recordMutationTimestamp(CONTRACT);

    const state = _getPollStateForTesting(CONTRACT);
    expect(state).toBeDefined();
    expect(state!.preview).toBeUndefined();
  });

  it('should dedup calls within 1 second', () => {
    const preview: MutationPreviewData = { type: 'grantRole', args: { account: '0x1' } };
    recordMutationTimestamp(CONTRACT, preview);
    const firstTimestamp = _getPollStateForTesting(CONTRACT)!.timestamp;

    // Call again within 1 second — should be ignored
    vi.advanceTimersByTime(500);
    recordMutationTimestamp(CONTRACT, { type: 'revokeRole', args: { account: '0x2' } });

    const state = _getPollStateForTesting(CONTRACT);
    expect(state!.timestamp).toBe(firstTimestamp);
    expect(state!.preview!.type).toBe('grantRole');
  });

  it('should allow overwrite after 1 second elapses', () => {
    const preview1: MutationPreviewData = { type: 'grantRole', args: {} };
    recordMutationTimestamp(CONTRACT, preview1);

    vi.advanceTimersByTime(1001);

    const preview2: MutationPreviewData = { type: 'revokeRole', args: {} };
    recordMutationTimestamp(CONTRACT, preview2);

    const state = _getPollStateForTesting(CONTRACT);
    expect(state!.preview!.type).toBe('revokeRole');
  });

  it('should preserve existing preview when called without preview after dedup window', () => {
    const preview: MutationPreviewData = { type: 'changeAdminDelay', args: { newDelay: 60 } };
    recordMutationTimestamp(CONTRACT, preview);

    vi.advanceTimersByTime(1500);

    // Called without preview (simulates onSuccess fire-and-forget)
    recordMutationTimestamp(CONTRACT);

    const state = _getPollStateForTesting(CONTRACT);
    expect(state!.preview).toEqual(preview);
  });

  it('should preserve existing snapshots when called after dedup window', () => {
    recordMutationTimestamp(CONTRACT, { type: 'grantRole', args: {} });

    // Simulate snapshot capture by the interval function
    const state = _getPollStateForTesting(CONTRACT)!;
    state.snapshots.set('roles', { ref: 1 });

    vi.advanceTimersByTime(1500);

    recordMutationTimestamp(CONTRACT);

    const updated = _getPollStateForTesting(CONTRACT)!;
    expect(updated.snapshots.has('roles')).toBe(true);
    expect(updated.snapshots.get('roles')).toEqual({ ref: 1 });
  });
});

// =============================================================================
// postMutationRefetchInterval
// =============================================================================

describe('postMutationRefetchInterval', () => {
  it('should return false when no mutation is pending', () => {
    const result = postMutationRefetchInterval(CONTRACT, 'roles', {}, Date.now());
    expect(result).toBe(false);
  });

  it('should return poll interval when data has not been updated since mutation', () => {
    const now = Date.now();
    recordMutationTimestamp(CONTRACT);

    // dataUpdatedAt is BEFORE or equal to the mutation timestamp
    const result = postMutationRefetchInterval(CONTRACT, 'roles', {}, now - 1000);
    expect(result).toBe(POST_MUTATION_POLL_INTERVAL_MS);
  });

  it('should capture snapshot on first post-mutation fetch and keep polling', () => {
    recordMutationTimestamp(CONTRACT);
    const mutationTs = _getPollStateForTesting(CONTRACT)!.timestamp;

    const staleData = { members: ['0x1'] };
    // dataUpdatedAt is AFTER mutation — this is the first post-mutation fetch
    const result = postMutationRefetchInterval(CONTRACT, 'roles', staleData, mutationTs + 1000);

    expect(result).toBe(POST_MUTATION_POLL_INTERVAL_MS);

    // Snapshot should be captured
    const state = _getPollStateForTesting(CONTRACT)!;
    expect(state.snapshots.get('roles')).toBe(staleData);
  });

  it('should continue polling when data reference has NOT changed', () => {
    recordMutationTimestamp(CONTRACT);
    const mutationTs = _getPollStateForTesting(CONTRACT)!.timestamp;

    const staleData = { members: ['0x1'] };

    // First fetch: captures snapshot
    postMutationRefetchInterval(CONTRACT, 'roles', staleData, mutationTs + 1000);

    // Subsequent fetch with same reference — still stale
    const result = postMutationRefetchInterval(CONTRACT, 'roles', staleData, mutationTs + 6000);
    expect(result).toBe(POST_MUTATION_POLL_INTERVAL_MS);
  });

  it('should stop polling when data reference changes', () => {
    recordMutationTimestamp(CONTRACT);
    const mutationTs = _getPollStateForTesting(CONTRACT)!.timestamp;

    const staleData = { members: ['0x1'] };
    const freshData = { members: ['0x1', '0x2'] };

    // First fetch: captures snapshot
    postMutationRefetchInterval(CONTRACT, 'roles', staleData, mutationTs + 1000);

    // Data changed → stop
    const result = postMutationRefetchInterval(CONTRACT, 'roles', freshData, mutationTs + 6000);
    expect(result).toBe(false);

    // State should be cleaned up
    expect(_getPollStateForTesting(CONTRACT)).toBeUndefined();
  });

  it('should stop polling after safety timeout', () => {
    recordMutationTimestamp(CONTRACT);

    vi.advanceTimersByTime(POST_MUTATION_POLL_WINDOW_MS + 1);

    const result = postMutationRefetchInterval(CONTRACT, 'roles', {}, Date.now());
    expect(result).toBe(false);
    expect(_getPollStateForTesting(CONTRACT)).toBeUndefined();
  });

  it('should handle multiple queries independently for snapshot capture', () => {
    recordMutationTimestamp(CONTRACT);
    const mutationTs = _getPollStateForTesting(CONTRACT)!.timestamp;

    const rolesData = { roles: [] };
    const ownershipData = { owner: '0x1' };

    // Capture snapshots for two different queries
    postMutationRefetchInterval(CONTRACT, 'roles', rolesData, mutationTs + 1000);
    postMutationRefetchInterval(CONTRACT, 'ownership', ownershipData, mutationTs + 1000);

    const state = _getPollStateForTesting(CONTRACT)!;
    expect(state.snapshots.get('roles')).toBe(rolesData);
    expect(state.snapshots.get('ownership')).toBe(ownershipData);
  });

  it('should stop ALL query polling when any query data changes', () => {
    recordMutationTimestamp(CONTRACT);
    const mutationTs = _getPollStateForTesting(CONTRACT)!.timestamp;

    const rolesData = { roles: [] };
    const ownershipData = { owner: '0x1' };

    // Capture snapshots for both
    postMutationRefetchInterval(CONTRACT, 'roles', rolesData, mutationTs + 1000);
    postMutationRefetchInterval(CONTRACT, 'ownership', ownershipData, mutationTs + 1000);

    // Roles data changes → entire contract poll state is cleared
    const freshRolesData = { roles: [{ id: 'admin' }] };
    const result = postMutationRefetchInterval(
      CONTRACT,
      'roles',
      freshRolesData,
      mutationTs + 6000
    );

    expect(result).toBe(false);
    expect(_getPollStateForTesting(CONTRACT)).toBeUndefined();

    // Ownership query also sees no state
    const ownerResult = postMutationRefetchInterval(
      CONTRACT,
      'ownership',
      ownershipData,
      mutationTs + 6000
    );
    expect(ownerResult).toBe(false);
  });
});

// =============================================================================
// computeAdminRefetchInterval
// =============================================================================

describe('computeAdminRefetchInterval', () => {
  it('should return false when no data and no mutation pending', () => {
    const result = computeAdminRefetchInterval(null, CONTRACT, Date.now());
    expect(result).toBe(false);
  });

  it('should return false when data has no pending states', () => {
    const data: AdminInfo = { admin: '0x1', state: 'active' };
    const result = computeAdminRefetchInterval(data, CONTRACT, Date.now());
    expect(result).toBe(false);
  });

  // Layer 1: Post-mutation smart polling takes priority
  it('should prioritize post-mutation polling over data-driven polling', () => {
    recordMutationTimestamp(CONTRACT);
    const mutationTs = _getPollStateForTesting(CONTRACT)!.timestamp;

    // Data has a pending delay, but post-mutation polling should take priority
    const data: AdminInfo = {
      admin: '0x1',
      state: 'active',
      delayInfo: {
        currentDelay: 60,
        pendingDelay: {
          newDelay: 120,
          effectAt: Math.floor(Date.now() / 1000) + 3600, // 1 hour away
        },
      },
    };

    // dataUpdatedAt is before mutation → post-mutation polling active
    const result = computeAdminRefetchInterval(data, CONTRACT, mutationTs - 1000);
    expect(result).toBe(POST_MUTATION_POLL_INTERVAL_MS);
  });

  // Layer 2: Pending delay change — past deadline
  it('should return 5s when pending delay effectAt is in the past', () => {
    const pastEffectAt = Math.floor(Date.now() / 1000) - 10;
    const data: AdminInfo = {
      admin: '0x1',
      state: 'active',
      delayInfo: {
        currentDelay: 60,
        pendingDelay: { newDelay: 120, effectAt: pastEffectAt },
      },
    };

    const result = computeAdminRefetchInterval(data, CONTRACT, Date.now());
    expect(result).toBe(5_000);
  });

  // Layer 2: Pending delay change — within 2 minutes
  it('should return 15s when pending delay effectAt is within 2 minutes', () => {
    const soonEffectAt = Math.floor(Date.now() / 1000) + 60; // 60s away
    const data: AdminInfo = {
      admin: '0x1',
      state: 'active',
      delayInfo: {
        currentDelay: 60,
        pendingDelay: { newDelay: 120, effectAt: soonEffectAt },
      },
    };

    const result = computeAdminRefetchInterval(data, CONTRACT, Date.now());
    expect(result).toBe(15_000);
  });

  // Layer 2: Pending delay change — more than 2 minutes out
  it('should return 60s when pending delay effectAt is far in the future', () => {
    const farEffectAt = Math.floor(Date.now() / 1000) + 600; // 10 min away
    const data: AdminInfo = {
      admin: '0x1',
      state: 'active',
      delayInfo: {
        currentDelay: 60,
        pendingDelay: { newDelay: 120, effectAt: farEffectAt },
      },
    };

    const result = computeAdminRefetchInterval(data, CONTRACT, Date.now());
    expect(result).toBe(60_000);
  });

  // Layer 3: Pending admin transfer with timestamp-based expiration
  it('should return 5s when pending admin transfer expiration is past', () => {
    const pastExpiration = Math.floor(Date.now() / 1000) - 10;
    const data: AdminInfo = {
      admin: '0x1',
      state: 'pending',
      pendingTransfer: {
        pendingAdmin: '0x2',
        expirationBlock: pastExpiration,
      },
      delayInfo: { currentDelay: 60 },
    };

    const result = computeAdminRefetchInterval(data, CONTRACT, Date.now());
    expect(result).toBe(5_000);
  });

  it('should return 15s when pending admin transfer expiration is within 2 minutes', () => {
    const soonExpiration = Math.floor(Date.now() / 1000) + 90;
    const data: AdminInfo = {
      admin: '0x1',
      state: 'pending',
      pendingTransfer: {
        pendingAdmin: '0x2',
        expirationBlock: soonExpiration,
      },
      delayInfo: { currentDelay: 60 },
    };

    const result = computeAdminRefetchInterval(data, CONTRACT, Date.now());
    expect(result).toBe(15_000);
  });

  it('should return 60s when pending admin transfer expiration is far out', () => {
    const farExpiration = Math.floor(Date.now() / 1000) + 600;
    const data: AdminInfo = {
      admin: '0x1',
      state: 'pending',
      pendingTransfer: {
        pendingAdmin: '0x2',
        expirationBlock: farExpiration,
      },
      delayInfo: { currentDelay: 60 },
    };

    const result = computeAdminRefetchInterval(data, CONTRACT, Date.now());
    expect(result).toBe(60_000);
  });

  // Layer 3 requires delayInfo to identify timestamp-based contracts
  it('should return false for pending transfer WITHOUT delayInfo (block-based contract)', () => {
    const data: AdminInfo = {
      admin: '0x1',
      state: 'pending',
      pendingTransfer: {
        pendingAdmin: '0x2',
        expirationBlock: 999999,
      },
      // No delayInfo → not AccessControlDefaultAdminRules → block-based
    };

    const result = computeAdminRefetchInterval(data, CONTRACT, Date.now());
    expect(result).toBe(false);
  });

  it('should return false for active state with delayInfo but no pending changes', () => {
    const data: AdminInfo = {
      admin: '0x1',
      state: 'active',
      delayInfo: { currentDelay: 60 },
    };

    const result = computeAdminRefetchInterval(data, CONTRACT, Date.now());
    expect(result).toBe(false);
  });
});

// =============================================================================
// useMutationPreview & useIsAwaitingUpdate hooks
// =============================================================================

describe('useMutationPreview', () => {
  it('should return null when no mutation is pending', () => {
    const { result } = renderHook(() => useMutationPreview(CONTRACT));
    expect(result.current).toBeNull();
  });

  it('should return preview data after recordMutationTimestamp', () => {
    const preview: MutationPreviewData = { type: 'grantRole', args: { account: '0xABC' } };

    const { result } = renderHook(() => useMutationPreview(CONTRACT));

    act(() => {
      recordMutationTimestamp(CONTRACT, preview);
    });

    expect(result.current).toEqual(preview);
  });

  it('should return null after poll state is cleared by data change', () => {
    const preview: MutationPreviewData = { type: 'grantRole', args: {} };

    const { result } = renderHook(() => useMutationPreview(CONTRACT));

    act(() => {
      recordMutationTimestamp(CONTRACT, preview);
    });
    expect(result.current).toEqual(preview);

    // Simulate post-mutation polling detecting data change
    const mutationTs = _getPollStateForTesting(CONTRACT)!.timestamp;

    act(() => {
      const staleData = { ref: 'old' };
      postMutationRefetchInterval(CONTRACT, 'roles', staleData, mutationTs + 1000);
      // Data changes → clears state
      postMutationRefetchInterval(CONTRACT, 'roles', { ref: 'new' }, mutationTs + 6000);
    });

    expect(result.current).toBeNull();
  });

  it('should return null for a different contract address', () => {
    const preview: MutationPreviewData = { type: 'grantRole', args: {} };
    recordMutationTimestamp(CONTRACT, preview);

    const { result } = renderHook(() => useMutationPreview('0xOTHER'));
    expect(result.current).toBeNull();
  });
});

describe('useIsAwaitingUpdate', () => {
  it('should return false when no mutation is pending', () => {
    const { result } = renderHook(() => useIsAwaitingUpdate(CONTRACT));
    expect(result.current).toBe(false);
  });

  it('should return true when mutation preview is active', () => {
    const { result } = renderHook(() => useIsAwaitingUpdate(CONTRACT));

    act(() => {
      recordMutationTimestamp(CONTRACT, { type: 'revokeRole', args: {} });
    });

    expect(result.current).toBe(true);
  });

  it('should return false when mutation was recorded without preview', () => {
    const { result } = renderHook(() => useIsAwaitingUpdate(CONTRACT));

    act(() => {
      recordMutationTimestamp(CONTRACT);
    });

    // No preview → useIsAwaitingUpdate returns false
    expect(result.current).toBe(false);
  });

  it('should return false after poll state timeout', () => {
    const { result } = renderHook(() => useIsAwaitingUpdate(CONTRACT));

    act(() => {
      recordMutationTimestamp(CONTRACT, { type: 'grantRole', args: {} });
    });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(POST_MUTATION_POLL_WINDOW_MS + 1);
      // Trigger the timeout by calling the interval function
      postMutationRefetchInterval(CONTRACT, 'roles', {}, Date.now());
    });

    expect(result.current).toBe(false);
  });
});
