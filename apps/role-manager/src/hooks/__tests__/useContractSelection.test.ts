/**
 * Tests for useContractSelection hook
 *
 * Tests contract selection state management with preference persistence
 * and auto-selection logic.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NetworkConfig } from '@openzeppelin/ui-types';

import type { ContractRecord } from '../../types/contracts';
import { useContractSelection } from '../useContractSelection';

// =============================================================================
// Test Fixtures
// =============================================================================

const mockNetwork: NetworkConfig = {
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

const mockContract1: ContractRecord = {
  id: 'contract-1',
  networkId: 'stellar-testnet',
  address: 'CONTRACT_ADDRESS_1',
  label: 'Test Contract 1',
  lastAccessed: Date.now(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockContract2: ContractRecord = {
  id: 'contract-2',
  networkId: 'stellar-testnet',
  address: 'CONTRACT_ADDRESS_2',
  label: 'Test Contract 2',
  lastAccessed: Date.now(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockContractEvm: ContractRecord = {
  id: 'contract-evm',
  networkId: 'ethereum-mainnet',
  address: '0x1234567890123456789012345678901234567890',
  label: 'EVM Contract',
  lastAccessed: Date.now(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

// =============================================================================
// Mocks
// =============================================================================

const mockPreferences = {
  set: vi.fn(),
};

const mockStorage = {
  get: vi.fn(),
};

vi.mock('@/core/storage/UserPreferencesStorage', () => ({
  userPreferencesStorage: {
    set: (...args: unknown[]) => mockPreferences.set(...args),
  },
}));

vi.mock('@/core/storage/RecentContractsStorage', () => ({
  recentContractsStorage: {
    get: (...args: unknown[]) => mockStorage.get(...args),
  },
}));

// =============================================================================
// Tests
// =============================================================================

describe('useContractSelection', () => {
  const defaultProps = {
    contracts: [mockContract1, mockContract2] as ContractRecord[] | undefined,
    isContractsLoading: false,
    pendingContractId: null as string | null,
    onPendingContractHandled: vi.fn(),
    selectedNetwork: mockNetwork,
    networks: [mockNetwork, mockNetworkEvm],
    setSelectedNetwork: vi.fn(),
    setPendingContractId: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPreferences.set.mockResolvedValue(undefined);
    mockStorage.get.mockResolvedValue(null);
    defaultProps.onPendingContractHandled = vi.fn();
    defaultProps.setSelectedNetwork = vi.fn();
    defaultProps.setPendingContractId = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return null selectedContract when no contracts', () => {
      const { result } = renderHook(() =>
        useContractSelection({
          ...defaultProps,
          contracts: [],
        })
      );

      expect(result.current.selectedContract).toBeNull();
    });

    it('should auto-select first contract when contracts available', async () => {
      const { result } = renderHook(() => useContractSelection(defaultProps));

      await waitFor(() => {
        expect(result.current.selectedContract).toEqual(mockContract1);
      });
    });

    it('should return undefined contracts as empty selection', () => {
      const { result } = renderHook(() =>
        useContractSelection({
          ...defaultProps,
          contracts: undefined,
        })
      );

      expect(result.current.selectedContract).toBeNull();
    });
  });

  describe('setSelectedContract', () => {
    it('should update selected contract state', async () => {
      const { result } = renderHook(() => useContractSelection(defaultProps));

      await waitFor(() => {
        expect(result.current.selectedContract).toBeDefined();
      });

      act(() => {
        result.current.setSelectedContract(mockContract2);
      });

      expect(result.current.selectedContract).toEqual(mockContract2);
    });

    it('should persist contract selection to preferences', async () => {
      const { result } = renderHook(() => useContractSelection(defaultProps));

      await waitFor(() => {
        expect(result.current.selectedContract).toBeDefined();
      });

      act(() => {
        result.current.setSelectedContract(mockContract2);
      });

      await waitFor(() => {
        expect(mockPreferences.set).toHaveBeenCalledWith('lastSelectedContractId', 'contract-2');
      });
    });

    it('should auto-reselect first contract when set to null', async () => {
      const { result } = renderHook(() => useContractSelection(defaultProps));

      await waitFor(() => {
        expect(result.current.selectedContract).toBeDefined();
      });

      act(() => {
        result.current.setSelectedContract(null);
      });

      // Auto-selection kicks in and selects the first contract
      await waitFor(() => {
        expect(result.current.selectedContract).toEqual(mockContract1);
      });
    });
  });

  describe('pending contract selection', () => {
    it('should select pending contract when found in list', async () => {
      const { result } = renderHook(() =>
        useContractSelection({
          ...defaultProps,
          pendingContractId: 'contract-2',
        })
      );

      await waitFor(() => {
        expect(result.current.selectedContract).toEqual(mockContract2);
      });

      expect(defaultProps.onPendingContractHandled).toHaveBeenCalled();
    });

    it('should select first contract if pending not found', async () => {
      const { result } = renderHook(() =>
        useContractSelection({
          ...defaultProps,
          pendingContractId: 'non-existent-contract',
        })
      );

      await waitFor(() => {
        expect(result.current.selectedContract).toEqual(mockContract1);
      });

      expect(defaultProps.onPendingContractHandled).toHaveBeenCalled();
    });

    it('should not select pending while contracts are loading', () => {
      const onPendingHandled = vi.fn();

      const { result } = renderHook(() =>
        useContractSelection({
          ...defaultProps,
          pendingContractId: 'contract-2',
          isContractsLoading: true,
          onPendingContractHandled: onPendingHandled,
        })
      );

      // Should not have called onPendingContractHandled yet
      expect(onPendingHandled).not.toHaveBeenCalled();
      expect(result.current.selectedContract).toBeNull();
    });
  });

  describe('auto-selection behavior', () => {
    it('should not auto-select when pending contract exists', async () => {
      const { result } = renderHook(() =>
        useContractSelection({
          ...defaultProps,
          pendingContractId: 'contract-2',
        })
      );

      await waitFor(() => {
        expect(result.current.selectedContract).toEqual(mockContract2);
      });

      // Should have selected the pending contract, not the first one
      expect(result.current.selectedContract?.id).toBe('contract-2');
    });

    it('should select first contract when current selection is removed', async () => {
      const { result, rerender } = renderHook((props) => useContractSelection(props), {
        initialProps: defaultProps,
      });

      await waitFor(() => {
        expect(result.current.selectedContract).toBeDefined();
      });

      // Select second contract
      act(() => {
        result.current.setSelectedContract(mockContract2);
      });

      expect(result.current.selectedContract).toEqual(mockContract2);

      // Remove contract-2 from the list
      rerender({
        ...defaultProps,
        contracts: [mockContract1],
      });

      await waitFor(() => {
        expect(result.current.selectedContract).toEqual(mockContract1);
      });
    });

    it('should clear selection when all contracts removed', async () => {
      const { result, rerender } = renderHook((props) => useContractSelection(props), {
        initialProps: defaultProps,
      });

      await waitFor(() => {
        expect(result.current.selectedContract).toBeDefined();
      });

      rerender({
        ...defaultProps,
        contracts: [],
      });

      await waitFor(() => {
        expect(result.current.selectedContract).toBeNull();
      });
    });
  });

  describe('selectContractById', () => {
    it('should set pending contract when on same network', async () => {
      mockStorage.get.mockResolvedValue(mockContract2);

      const { result } = renderHook(() => useContractSelection(defaultProps));

      await waitFor(() => {
        expect(result.current.selectedContract).toBeDefined();
      });

      await act(async () => {
        await result.current.selectContractById('contract-2');
      });

      expect(defaultProps.setPendingContractId).toHaveBeenCalledWith('contract-2');
    });

    it('should switch network and set pending contract when on different network', async () => {
      mockStorage.get.mockResolvedValue(mockContractEvm);

      const { result } = renderHook(() => useContractSelection(defaultProps));

      await waitFor(() => {
        expect(result.current.selectedContract).toBeDefined();
      });

      await act(async () => {
        await result.current.selectContractById('contract-evm');
      });

      expect(defaultProps.setSelectedNetwork).toHaveBeenCalledWith(mockNetworkEvm);
      expect(defaultProps.setPendingContractId).toHaveBeenCalledWith('contract-evm');
    });

    it('should not change anything if contract not found in storage', async () => {
      mockStorage.get.mockResolvedValue(null);

      const { result } = renderHook(() => useContractSelection(defaultProps));

      await waitFor(() => {
        expect(result.current.selectedContract).toBeDefined();
      });

      await act(async () => {
        await result.current.selectContractById('non-existent');
      });

      expect(defaultProps.setSelectedNetwork).not.toHaveBeenCalled();
      expect(defaultProps.setPendingContractId).not.toHaveBeenCalled();
    });

    it('should handle storage error gracefully', async () => {
      mockStorage.get.mockRejectedValue(new Error('Storage error'));

      const { result } = renderHook(() => useContractSelection(defaultProps));

      await waitFor(() => {
        expect(result.current.selectedContract).toBeDefined();
      });

      // Should not throw
      await act(async () => {
        await result.current.selectContractById('contract-1');
      });

      expect(defaultProps.setPendingContractId).not.toHaveBeenCalled();
    });
  });

  describe('return type', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useContractSelection(defaultProps));

      expect(result.current).toHaveProperty('selectedContract');
      expect(result.current).toHaveProperty('setSelectedContract');
      expect(result.current).toHaveProperty('selectContractById');
      expect(typeof result.current.setSelectedContract).toBe('function');
      expect(typeof result.current.selectContractById).toBe('function');
    });
  });
});
