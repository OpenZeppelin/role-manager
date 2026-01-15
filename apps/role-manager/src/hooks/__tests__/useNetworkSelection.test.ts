/**
 * Tests for useNetworkSelection hook
 *
 * Tests network selection state management with preference persistence.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NetworkConfig } from '@openzeppelin/ui-types';

import { useNetworkSelection } from '../useNetworkSelection';

// =============================================================================
// Test Fixtures
// =============================================================================

const mockNetworkStellar: NetworkConfig = {
  id: 'stellar-testnet',
  name: 'Stellar Testnet',
  ecosystem: 'stellar',
  network: 'stellar',
  type: 'testnet',
  isTestnet: true,
} as NetworkConfig;

const mockNetworkEvm: NetworkConfig = {
  id: 'ethereum-mainnet',
  name: 'Ethereum Mainnet',
  ecosystem: 'evm',
  network: 'ethereum',
  type: 'mainnet',
  isTestnet: false,
} as NetworkConfig;

// =============================================================================
// Mocks
// =============================================================================

const mockPreferences = {
  getString: vi.fn(),
  set: vi.fn(),
};

vi.mock('@/core/storage/UserPreferencesStorage', () => ({
  userPreferencesStorage: {
    getString: (...args: unknown[]) => mockPreferences.getString(...args),
    set: (...args: unknown[]) => mockPreferences.set(...args),
  },
}));

// =============================================================================
// Tests
// =============================================================================

describe('useNetworkSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPreferences.getString.mockResolvedValue(undefined);
    mockPreferences.set.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return null selectedNetwork when networks are loading', () => {
      const { result } = renderHook(() =>
        useNetworkSelection({
          networks: [],
          isLoadingNetworks: true,
        })
      );

      expect(result.current.selectedNetwork).toBeNull();
    });

    it('should return null selectedNetwork when networks array is empty', () => {
      const { result } = renderHook(() =>
        useNetworkSelection({
          networks: [],
          isLoadingNetworks: false,
        })
      );

      expect(result.current.selectedNetwork).toBeNull();
    });

    it('should auto-select first network when no saved preference', async () => {
      mockPreferences.getString.mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useNetworkSelection({
          networks: [mockNetworkStellar, mockNetworkEvm],
          isLoadingNetworks: false,
        })
      );

      await waitFor(() => {
        expect(result.current.selectedNetwork).toEqual(mockNetworkStellar);
      });
    });

    it('should restore saved network from preferences', async () => {
      mockPreferences.getString.mockImplementation((key: string) => {
        if (key === 'lastSelectedNetworkId') return Promise.resolve('ethereum-mainnet');
        return Promise.resolve(undefined);
      });

      const { result } = renderHook(() =>
        useNetworkSelection({
          networks: [mockNetworkStellar, mockNetworkEvm],
          isLoadingNetworks: false,
        })
      );

      await waitFor(() => {
        expect(result.current.selectedNetwork).toEqual(mockNetworkEvm);
      });
    });

    it('should restore pending contract ID from preferences', async () => {
      mockPreferences.getString.mockImplementation((key: string) => {
        if (key === 'lastSelectedNetworkId') return Promise.resolve('stellar-testnet');
        if (key === 'lastSelectedContractId') return Promise.resolve('contract-123');
        return Promise.resolve(undefined);
      });

      const { result } = renderHook(() =>
        useNetworkSelection({
          networks: [mockNetworkStellar],
          isLoadingNetworks: false,
        })
      );

      await waitFor(() => {
        expect(result.current.pendingContractId).toBe('contract-123');
      });
    });

    it('should fallback to first network if saved network not found', async () => {
      mockPreferences.getString.mockImplementation((key: string) => {
        if (key === 'lastSelectedNetworkId') return Promise.resolve('non-existent-network');
        return Promise.resolve(undefined);
      });

      const { result } = renderHook(() =>
        useNetworkSelection({
          networks: [mockNetworkStellar, mockNetworkEvm],
          isLoadingNetworks: false,
        })
      );

      await waitFor(() => {
        expect(result.current.selectedNetwork).toEqual(mockNetworkStellar);
      });
    });
  });

  describe('setSelectedNetwork', () => {
    it('should update selected network state', async () => {
      const { result } = renderHook(() =>
        useNetworkSelection({
          networks: [mockNetworkStellar, mockNetworkEvm],
          isLoadingNetworks: false,
        })
      );

      await waitFor(() => {
        expect(result.current.selectedNetwork).toBeDefined();
      });

      act(() => {
        result.current.setSelectedNetwork(mockNetworkEvm);
      });

      expect(result.current.selectedNetwork).toEqual(mockNetworkEvm);
    });

    it('should persist network selection to preferences', async () => {
      const { result } = renderHook(() =>
        useNetworkSelection({
          networks: [mockNetworkStellar, mockNetworkEvm],
          isLoadingNetworks: false,
        })
      );

      await waitFor(() => {
        expect(result.current.selectedNetwork).toBeDefined();
      });

      act(() => {
        result.current.setSelectedNetwork(mockNetworkEvm);
      });

      await waitFor(() => {
        expect(mockPreferences.set).toHaveBeenCalledWith(
          'lastSelectedNetworkId',
          'ethereum-mainnet'
        );
      });
    });

    it('should allow setting network to null', async () => {
      const { result } = renderHook(() =>
        useNetworkSelection({
          networks: [mockNetworkStellar],
          isLoadingNetworks: false,
        })
      );

      await waitFor(() => {
        expect(result.current.selectedNetwork).toBeDefined();
      });

      act(() => {
        result.current.setSelectedNetwork(null);
      });

      expect(result.current.selectedNetwork).toBeNull();
    });
  });

  describe('pendingContractId', () => {
    it('should initialize with null pending contract ID', () => {
      const { result } = renderHook(() =>
        useNetworkSelection({
          networks: [mockNetworkStellar],
          isLoadingNetworks: false,
        })
      );

      // Before preferences load, pending should be null
      expect(result.current.pendingContractId).toBeNull();
    });

    it('should allow setting pending contract ID', async () => {
      const { result } = renderHook(() =>
        useNetworkSelection({
          networks: [mockNetworkStellar],
          isLoadingNetworks: false,
        })
      );

      act(() => {
        result.current.setPendingContractId('contract-456');
      });

      expect(result.current.pendingContractId).toBe('contract-456');
    });

    it('should allow clearing pending contract ID', async () => {
      const { result } = renderHook(() =>
        useNetworkSelection({
          networks: [mockNetworkStellar],
          isLoadingNetworks: false,
        })
      );

      act(() => {
        result.current.setPendingContractId('contract-456');
      });

      act(() => {
        result.current.setPendingContractId(null);
      });

      expect(result.current.pendingContractId).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should fallback to first network on preference load error', async () => {
      mockPreferences.getString.mockRejectedValue(new Error('Storage error'));

      const { result } = renderHook(() =>
        useNetworkSelection({
          networks: [mockNetworkStellar, mockNetworkEvm],
          isLoadingNetworks: false,
        })
      );

      await waitFor(() => {
        expect(result.current.selectedNetwork).toEqual(mockNetworkStellar);
      });
    });

    it('should handle preference save error gracefully', async () => {
      mockPreferences.set.mockRejectedValue(new Error('Save error'));

      const { result } = renderHook(() =>
        useNetworkSelection({
          networks: [mockNetworkStellar, mockNetworkEvm],
          isLoadingNetworks: false,
        })
      );

      await waitFor(() => {
        expect(result.current.selectedNetwork).toBeDefined();
      });

      // Should not throw when setting network
      act(() => {
        result.current.setSelectedNetwork(mockNetworkEvm);
      });

      expect(result.current.selectedNetwork).toEqual(mockNetworkEvm);
    });
  });

  describe('return type', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() =>
        useNetworkSelection({
          networks: [mockNetworkStellar],
          isLoadingNetworks: false,
        })
      );

      expect(result.current).toHaveProperty('selectedNetwork');
      expect(result.current).toHaveProperty('setSelectedNetwork');
      expect(result.current).toHaveProperty('isPreferencesLoaded');
      expect(result.current).toHaveProperty('pendingContractId');
      expect(result.current).toHaveProperty('setPendingContractId');
      expect(typeof result.current.setSelectedNetwork).toBe('function');
      expect(typeof result.current.setPendingContractId).toBe('function');
    });
  });
});
