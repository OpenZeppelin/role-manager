/**
 * Tests for useRoleManagerAnalytics hook
 *
 * Verifies that:
 * - Base analytics methods are passed through correctly
 * - App-specific tracking methods call trackEvent with correct parameters
 * - Hook returns memoized object for stable references
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRoleManagerAnalytics } from '../useRoleManagerAnalytics';

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

vi.mock('@openzeppelin/ui-builder-react-core', () => ({
  useAnalytics: () => mockAnalytics,
}));

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

      result.current.trackNetworkSelection('ethereum-mainnet');

      expect(mockTrackNetworkSelection).toHaveBeenCalledWith('ethereum-mainnet');
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
    it('should track contract selection with correct parameters', () => {
      const { result } = renderHook(() => useRoleManagerAnalytics());

      result.current.trackContractSelection('0x123', 'ethereum-mainnet', 'evm');

      expect(mockTrackEvent).toHaveBeenCalledWith('contract_selected', {
        contract_address: '0x123',
        network_id: 'ethereum-mainnet',
        ecosystem: 'evm',
      });
    });

    it('should track wallet connection with correct parameters', () => {
      const { result } = renderHook(() => useRoleManagerAnalytics());

      result.current.trackWalletConnection('evm', 'metamask');

      expect(mockTrackEvent).toHaveBeenCalledWith('wallet_connected', {
        ecosystem: 'evm',
        wallet_type: 'metamask',
      });
    });

    it('should track wallet disconnection with correct parameters', () => {
      const { result } = renderHook(() => useRoleManagerAnalytics());

      result.current.trackWalletDisconnection('stellar');

      expect(mockTrackEvent).toHaveBeenCalledWith('wallet_disconnected', {
        ecosystem: 'stellar',
      });
    });

    it('should track role granted with correct parameters', () => {
      const { result } = renderHook(() => useRoleManagerAnalytics());

      result.current.trackRoleGranted('MINTER_ROLE', 'evm');

      expect(mockTrackEvent).toHaveBeenCalledWith('role_granted', {
        role_name: 'MINTER_ROLE',
        ecosystem: 'evm',
      });
    });

    it('should track role revoked with correct parameters', () => {
      const { result } = renderHook(() => useRoleManagerAnalytics());

      result.current.trackRoleRevoked('PAUSER_ROLE', 'stellar');

      expect(mockTrackEvent).toHaveBeenCalledWith('role_revoked', {
        role_name: 'PAUSER_ROLE',
        ecosystem: 'stellar',
      });
    });

    it('should track ownership transfer initiated with correct parameters', () => {
      const { result } = renderHook(() => useRoleManagerAnalytics());

      result.current.trackOwnershipTransferInitiated('evm');

      expect(mockTrackEvent).toHaveBeenCalledWith('ownership_transfer_initiated', {
        ecosystem: 'evm',
      });
    });

    it('should track ownership accepted with correct parameters', () => {
      const { result } = renderHook(() => useRoleManagerAnalytics());

      result.current.trackOwnershipAccepted('stellar');

      expect(mockTrackEvent).toHaveBeenCalledWith('ownership_accepted', {
        ecosystem: 'stellar',
      });
    });

    it('should track admin transfer initiated with correct parameters', () => {
      const { result } = renderHook(() => useRoleManagerAnalytics());

      result.current.trackAdminTransferInitiated('stellar');

      expect(mockTrackEvent).toHaveBeenCalledWith('admin_transfer_initiated', {
        ecosystem: 'stellar',
      });
    });

    it('should track admin transfer accepted with correct parameters', () => {
      const { result } = renderHook(() => useRoleManagerAnalytics());

      result.current.trackAdminTransferAccepted('stellar');

      expect(mockTrackEvent).toHaveBeenCalledWith('admin_transfer_accepted', {
        ecosystem: 'stellar',
      });
    });

    it('should track snapshot exported with correct parameters', () => {
      const { result } = renderHook(() => useRoleManagerAnalytics());

      result.current.trackSnapshotExported('csv', 'evm');

      expect(mockTrackEvent).toHaveBeenCalledWith('snapshot_exported', {
        format: 'csv',
        ecosystem: 'evm',
      });
    });

    it('should track filter applied with correct parameters', () => {
      const { result } = renderHook(() => useRoleManagerAnalytics());

      result.current.trackFilterApplied('Roles', 'role', 'MINTER_ROLE');

      expect(mockTrackEvent).toHaveBeenCalledWith('filter_applied', {
        page: 'Roles',
        filter_type: 'role',
        filter_value: 'MINTER_ROLE',
      });
    });
  });

  describe('memoization', () => {
    it('should return stable reference across renders', () => {
      const { result, rerender } = renderHook(() => useRoleManagerAnalytics());

      const firstResult = result.current;
      rerender();
      const secondResult = result.current;

      // The memoized object should be the same reference
      expect(firstResult).toBe(secondResult);
    });
  });
});
