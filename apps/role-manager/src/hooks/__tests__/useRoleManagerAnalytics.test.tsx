/**
 * Tests for useRoleManagerAnalytics hook
 *
 * Verifies that:
 * - Base analytics methods are passed through correctly
 * - Every action event carries the network dimensions (network_id, ecosystem)
 * - App-specific tracking methods call trackEvent with the registered GA param names
 * - Hook returns memoized object for stable references
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RoleManagerRuntime } from '@/core/runtimeAdapter';

import {
  getAnalyticsNetworkContext,
  UNKNOWN_ANALYTICS_VALUE,
  useRoleManagerAnalytics,
} from '../useRoleManagerAnalytics';

// Mock the useAnalytics hook from react-core
const mockTrackPageView = vi.fn();
const mockTrackEvent = vi.fn();
const mockTrackNetworkSelection = vi.fn();
const mockInitialize = vi.fn();
const mockIsEnabled = vi.fn(() => true);

// Create a stable mock analytics object to test memoization properly
const mockAnalytics = {
  trackPageView: mockTrackPageView,
  trackEvent: mockTrackEvent,
  trackNetworkSelection: mockTrackNetworkSelection,
  initialize: mockInitialize,
  isEnabled: mockIsEnabled,
};

vi.mock('@openzeppelin/ui-react', () => ({
  useAnalytics: () => mockAnalytics,
}));

const NETWORK = { networkId: 'ethereum-mainnet', ecosystem: 'evm' };
const NETWORK_PARAMS = { network_id: 'ethereum-mainnet', ecosystem: 'evm' };

describe('getAnalyticsNetworkContext', () => {
  it('reads network id and ecosystem from the runtime network config', () => {
    const runtime = {
      networkConfig: { id: 'stellar-testnet', ecosystem: 'stellar' },
    } as unknown as RoleManagerRuntime;

    expect(getAnalyticsNetworkContext(runtime)).toEqual({
      networkId: 'stellar-testnet',
      ecosystem: 'stellar',
    });
  });

  it.each([null, undefined, {} as RoleManagerRuntime])(
    'falls back to "unknown" when the runtime is %p',
    (runtime) => {
      expect(getAnalyticsNetworkContext(runtime)).toEqual({
        networkId: UNKNOWN_ANALYTICS_VALUE,
        ecosystem: UNKNOWN_ANALYTICS_VALUE,
      });
    }
  );
});

describe('useRoleManagerAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('base analytics passthrough', () => {
    it('should pass through trackPageView from base analytics', () => {
      const { result } = renderHook(() => useRoleManagerAnalytics());

      result.current.trackPageView('Test Page', '/test');

      expect(mockTrackPageView).toHaveBeenCalledWith('Test Page', '/test');
    });

    it('should pass through trackNetworkSelection from base analytics', () => {
      const { result } = renderHook(() => useRoleManagerAnalytics());

      result.current.trackNetworkSelection('ethereum-mainnet', 'evm');

      expect(mockTrackNetworkSelection).toHaveBeenCalledWith('ethereum-mainnet', 'evm');
    });

    it('should pass through initialize from base analytics', () => {
      const { result } = renderHook(() => useRoleManagerAnalytics());

      result.current.initialize();

      expect(mockInitialize).toHaveBeenCalled();
    });

    it('should pass through isEnabled from base analytics', () => {
      const { result } = renderHook(() => useRoleManagerAnalytics());

      const enabled = result.current.isEnabled();

      expect(enabled).toBe(true);
      expect(mockIsEnabled).toHaveBeenCalled();
    });
  });

  describe('app-specific tracking methods', () => {
    it('should track contract selection with contract address and network', () => {
      const { result } = renderHook(() => useRoleManagerAnalytics());

      result.current.trackContractSelection('0x123', NETWORK);

      expect(mockTrackEvent).toHaveBeenCalledWith('contract_selected', {
        contract_address: '0x123',
        ...NETWORK_PARAMS,
      });
    });

    it('should track wallet connection with wallet type and network', () => {
      const { result } = renderHook(() => useRoleManagerAnalytics());

      result.current.trackWalletConnection('MetaMask', NETWORK);

      expect(mockTrackEvent).toHaveBeenCalledWith('wallet_connected', {
        wallet_type: 'MetaMask',
        ...NETWORK_PARAMS,
      });
    });

    it('should track wallet disconnection with network', () => {
      const { result } = renderHook(() => useRoleManagerAnalytics());

      result.current.trackWalletDisconnection(NETWORK);

      expect(mockTrackEvent).toHaveBeenCalledWith('wallet_disconnected', NETWORK_PARAMS);
    });

    it.each([
      ['trackRoleGranted', 'role_granted'],
      ['trackRoleRevoked', 'role_revoked'],
      ['trackRoleRenounced', 'role_renounced'],
    ] as const)('%s should send %s with role_name and network', (method, eventName) => {
      const { result } = renderHook(() => useRoleManagerAnalytics());

      result.current[method]('Minter', NETWORK);

      expect(mockTrackEvent).toHaveBeenCalledWith(eventName, {
        role_name: 'Minter',
        ...NETWORK_PARAMS,
      });
    });

    it.each([
      ['trackOwnershipTransferInitiated', 'ownership_transfer_initiated'],
      ['trackOwnershipAccepted', 'ownership_accepted'],
      ['trackOwnershipRenounced', 'ownership_renounced'],
      ['trackAdminTransferInitiated', 'admin_transfer_initiated'],
      ['trackAdminTransferAccepted', 'admin_transfer_accepted'],
      ['trackAdminTransferCancelled', 'admin_transfer_cancelled'],
      ['trackAdminDelayChangeScheduled', 'admin_delay_change_scheduled'],
      ['trackAdminDelayChangeRolledBack', 'admin_delay_change_rolled_back'],
    ] as const)('%s should send %s with network only', (method, eventName) => {
      const { result } = renderHook(() => useRoleManagerAnalytics());

      result.current[method](NETWORK);

      expect(mockTrackEvent).toHaveBeenCalledWith(eventName, NETWORK_PARAMS);
    });

    it('should track snapshot exported with format and network', () => {
      const { result } = renderHook(() => useRoleManagerAnalytics());

      result.current.trackSnapshotExported('json', NETWORK);

      expect(mockTrackEvent).toHaveBeenCalledWith('snapshot_exported', {
        format: 'json',
        ...NETWORK_PARAMS,
      });
    });

    it('should track filter applied with page, filter dims and network', () => {
      const { result } = renderHook(() => useRoleManagerAnalytics());

      result.current.trackFilterApplied('Role Changes', 'actionFilter', 'grant', NETWORK);

      expect(mockTrackEvent).toHaveBeenCalledWith('filter_applied', {
        page: 'Role Changes',
        filter_type: 'actionFilter',
        filter_value: 'grant',
        ...NETWORK_PARAMS,
      });
    });

    it('should forward the unknown fallback when no network is resolved', () => {
      const { result } = renderHook(() => useRoleManagerAnalytics());

      result.current.trackRoleGranted('Minter', getAnalyticsNetworkContext(null));

      expect(mockTrackEvent).toHaveBeenCalledWith('role_granted', {
        role_name: 'Minter',
        network_id: 'unknown',
        ecosystem: 'unknown',
      });
    });
  });

  describe('memoization', () => {
    it('should return stable reference across renders', () => {
      const { result, rerender } = renderHook(() => useRoleManagerAnalytics());

      const first = result.current;
      rerender();

      expect(result.current).toBe(first);
    });
  });
});
