/**
 * Tests for useFilterAnalytics hook and its diff helpers.
 *
 * Verifies that:
 * - Enumerated filters report their value, free-form filters only report set/cleared
 * - Only changed fields emit events (no per-keystroke spam for search)
 * - Events carry the page name and the runtime network dimensions
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RoleManagerRuntime } from '@/core/runtimeAdapter';

import {
  diffFilterStates,
  toAnalyticsFilterValue,
  useFilterAnalytics,
} from '../useFilterAnalytics';

const mockAnalytics = vi.hoisted(() => ({ trackFilterApplied: vi.fn() }));
const mockUseSelectedContract = vi.hoisted(() => vi.fn());

vi.mock('../useRoleManagerAnalytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../useRoleManagerAnalytics')>()),
  useRoleManagerAnalytics: () => mockAnalytics,
}));

vi.mock('../useSelectedContract', () => ({
  useSelectedContract: () => mockUseSelectedContract(),
}));

const runtime = {
  networkConfig: { id: 'stellar-testnet', ecosystem: 'stellar' },
} as unknown as RoleManagerRuntime;
const NETWORK = { networkId: 'stellar-testnet', ecosystem: 'stellar' };

describe('toAnalyticsFilterValue', () => {
  it('reports enumerated filter values verbatim', () => {
    expect(toAnalyticsFilterValue('actionFilter', 'grant')).toBe('grant');
    expect(toAnalyticsFilterValue('statusFilter', 'active')).toBe('active');
  });

  it('reports cleared for empty enumerated values', () => {
    expect(toAnalyticsFilterValue('roleFilter', '')).toBe('cleared');
    expect(toAnalyticsFilterValue('roleFilter', undefined)).toBe('cleared');
  });

  it.each(['searchQuery', 'timestampFrom', 'timestampTo'])(
    'never reports the raw value of free-form field %s',
    (field) => {
      expect(toAnalyticsFilterValue(field, '0xabc123')).toBe('set');
      expect(toAnalyticsFilterValue(field, '')).toBe('cleared');
      expect(toAnalyticsFilterValue(field, undefined)).toBe('cleared');
    }
  );
});

describe('diffFilterStates', () => {
  const base: {
    searchQuery: string;
    actionFilter: string;
    roleFilter: string;
    timestampFrom?: string;
  } = { searchQuery: '', actionFilter: 'all', roleFilter: 'all' };

  it('returns nothing when states are equal', () => {
    expect(diffFilterStates(base, { ...base })).toEqual([]);
  });

  it('returns only the changed fields with their reported values', () => {
    expect(diffFilterStates(base, { ...base, actionFilter: 'grant' })).toEqual([
      ['actionFilter', 'grant'],
    ]);
  });

  it('collapses search typing into a single set transition', () => {
    expect(diffFilterStates(base, { ...base, searchQuery: '0x1' })).toEqual([
      ['searchQuery', 'set'],
    ]);
    expect(
      diffFilterStates({ ...base, searchQuery: '0x1' }, { ...base, searchQuery: '0x12' })
    ).toEqual([]);
    expect(diffFilterStates({ ...base, searchQuery: '0x12' }, base)).toEqual([
      ['searchQuery', 'cleared'],
    ]);
  });

  it('handles optional fields that appear or disappear', () => {
    expect(diffFilterStates(base, { ...base, timestampFrom: '2026-01-01T00:00:00' })).toEqual([
      ['timestampFrom', 'set'],
    ]);
  });
});

describe('useFilterAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSelectedContract.mockReturnValue({ runtime });
  });

  it('emits one filter_applied per changed field with page and network', () => {
    const { result } = renderHook(() => useFilterAnalytics('Role Changes'));

    result.current(
      { searchQuery: '', actionFilter: 'all', roleFilter: 'all' },
      { searchQuery: 'abc', actionFilter: 'revoke', roleFilter: 'all' }
    );

    expect(mockAnalytics.trackFilterApplied).toHaveBeenCalledTimes(2);
    expect(mockAnalytics.trackFilterApplied).toHaveBeenCalledWith(
      'Role Changes',
      'searchQuery',
      'set',
      NETWORK
    );
    expect(mockAnalytics.trackFilterApplied).toHaveBeenCalledWith(
      'Role Changes',
      'actionFilter',
      'revoke',
      NETWORK
    );
  });

  it('emits nothing when the filter state is unchanged', () => {
    const { result } = renderHook(() => useFilterAnalytics('Authorized Accounts'));
    const filters = { searchQuery: '', statusFilter: 'all', roleFilter: 'all' };

    result.current(filters, { ...filters });

    expect(mockAnalytics.trackFilterApplied).not.toHaveBeenCalled();
  });

  it('falls back to unknown network dimensions without a runtime', () => {
    mockUseSelectedContract.mockReturnValue({ runtime: null });
    const { result } = renderHook(() => useFilterAnalytics('Authorized Accounts'));

    result.current({ statusFilter: 'all' }, { statusFilter: 'active' });

    expect(mockAnalytics.trackFilterApplied).toHaveBeenCalledWith(
      'Authorized Accounts',
      'statusFilter',
      'active',
      { networkId: 'unknown', ecosystem: 'unknown' }
    );
  });
});
