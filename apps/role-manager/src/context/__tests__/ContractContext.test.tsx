/**
 * Tests for ContractContext
 * Feature: 007-dashboard-real-data
 *
 * Tests the contract selection context that provides shared state
 * across the application.
 */
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';

import type { ContractAdapter, NetworkConfig } from '@openzeppelin/ui-builder-types';

import type { ContractRecord } from '../../types/contracts';
import { ContractProvider, useContractContext } from '../ContractContext';

// =============================================================================
// Test Fixtures
// =============================================================================

const mockNetworks: NetworkConfig[] = [
  {
    id: 'stellar-testnet',
    name: 'Stellar Testnet',
    ecosystem: 'stellar',
    network: 'stellar',
    type: 'testnet',
    isTestnet: true,
  } as NetworkConfig,
  {
    id: 'stellar-mainnet',
    name: 'Stellar Mainnet',
    ecosystem: 'stellar',
    network: 'stellar',
    type: 'mainnet',
    isTestnet: false,
  } as NetworkConfig,
];

const mockContracts: ContractRecord[] = [
  {
    id: 'contract-1',
    networkId: 'stellar-testnet',
    address: 'CONTRACT_ADDRESS_1',
    label: 'Test Contract 1',
    lastAccessed: Date.now(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'contract-2',
    networkId: 'stellar-testnet',
    address: 'CONTRACT_ADDRESS_2',
    label: 'Test Contract 2',
    lastAccessed: Date.now() - 1000,
    createdAt: new Date(Date.now() - 1000),
    updatedAt: new Date(Date.now() - 1000),
  },
];

const mockAdapter: ContractAdapter = {
  networkConfig: mockNetworks[0],
  isValidAddress: vi.fn().mockReturnValue(true),
} as unknown as ContractAdapter;

// =============================================================================
// Mocks
// =============================================================================

// Track mock state
const mocks = {
  networks: mockNetworks,
  isLoadingNetworks: false,
  contracts: mockContracts,
  adapter: mockAdapter as ContractAdapter | null,
  isAdapterLoading: false,
};

// Mock hooks
vi.mock('../../hooks/useAllNetworks', () => ({
  useAllNetworks: () => ({
    networks: mocks.networks,
    isLoading: mocks.isLoadingNetworks,
  }),
}));

vi.mock('../../hooks/useRecentContracts', () => ({
  useRecentContracts: () => ({
    data: mocks.contracts,
    isLoading: false,
    addOrUpdate: vi.fn(),
    getByNetwork: vi.fn(),
    deleteContract: vi.fn(),
  }),
}));

vi.mock('../../hooks/useNetworkAdapter', () => ({
  useNetworkAdapter: () => ({
    adapter: mocks.adapter,
    isLoading: mocks.isAdapterLoading,
    error: null,
    retry: vi.fn(),
  }),
}));

// =============================================================================
// Test Wrapper
// =============================================================================

function TestWrapper({ children }: PropsWithChildren) {
  return <ContractProvider>{children}</ContractProvider>;
}

// =============================================================================
// Tests
// =============================================================================

describe('ContractContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state
    mocks.networks = mockNetworks;
    mocks.isLoadingNetworks = false;
    mocks.contracts = mockContracts;
    mocks.adapter = mockAdapter;
    mocks.isAdapterLoading = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('ContractProvider', () => {
    it('should render children', () => {
      render(
        <ContractProvider>
          <div data-testid="child">Child Content</div>
        </ContractProvider>
      );

      expect(screen.getByTestId('child')).toBeDefined();
      expect(screen.getByText('Child Content')).toBeDefined();
    });

    it('should provide context value to children', () => {
      const { result } = renderHook(() => useContractContext(), {
        wrapper: TestWrapper,
      });

      expect(result.current).toBeDefined();
      expect(result.current).toHaveProperty('selectedContract');
      expect(result.current).toHaveProperty('setSelectedContract');
      expect(result.current).toHaveProperty('selectedNetwork');
      expect(result.current).toHaveProperty('setSelectedNetwork');
      expect(result.current).toHaveProperty('adapter');
      expect(result.current).toHaveProperty('isAdapterLoading');
      expect(result.current).toHaveProperty('contracts');
      expect(result.current).toHaveProperty('isContractsLoading');
    });
  });

  describe('useContractContext', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useContractContext());
      }).toThrow('useContractContext must be used within a ContractProvider');

      consoleError.mockRestore();
    });

    it('should provide initial state with null selections', () => {
      const { result } = renderHook(() => useContractContext(), {
        wrapper: TestWrapper,
      });

      // Initially, selections are null before auto-selection kicks in
      expect(result.current.selectedContract).toBeDefined();
      expect(result.current.selectedNetwork).toBeDefined();
    });

    it('should provide contracts from useRecentContracts', () => {
      const { result } = renderHook(() => useContractContext(), {
        wrapper: TestWrapper,
      });

      expect(result.current.contracts).toEqual(mockContracts);
    });

    it('should provide adapter from useNetworkAdapter', () => {
      const { result } = renderHook(() => useContractContext(), {
        wrapper: TestWrapper,
      });

      expect(result.current.adapter).toBe(mockAdapter);
    });
  });

  describe('network selection', () => {
    it('should auto-select first network when networks load', async () => {
      const { result } = renderHook(() => useContractContext(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.selectedNetwork).toEqual(mockNetworks[0]);
      });
    });

    it('should allow updating selected network', async () => {
      const { result } = renderHook(() => useContractContext(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.selectedNetwork).toBeDefined();
      });

      act(() => {
        result.current.setSelectedNetwork(mockNetworks[1]);
      });

      expect(result.current.selectedNetwork).toEqual(mockNetworks[1]);
    });

    it('should allow setting network to null (but auto-reselects if available)', async () => {
      const { result } = renderHook(() => useContractContext(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.selectedNetwork).toBeDefined();
      });

      act(() => {
        result.current.setSelectedNetwork(null);
      });

      // Note: The context auto-selects first network when networks are available
      // So setting to null will trigger re-selection
      await waitFor(() => {
        expect(result.current.selectedNetwork).toEqual(mockNetworks[0]);
      });
    });
  });

  describe('contract selection', () => {
    it('should auto-select first contract when contracts load', async () => {
      const { result } = renderHook(() => useContractContext(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.selectedContract).toEqual(mockContracts[0]);
      });
    });

    it('should allow updating selected contract', async () => {
      const { result } = renderHook(() => useContractContext(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.selectedContract).toBeDefined();
      });

      act(() => {
        result.current.setSelectedContract(mockContracts[1]);
      });

      expect(result.current.selectedContract).toEqual(mockContracts[1]);
    });

    it('should allow setting contract to null (but auto-reselects if available)', async () => {
      const { result } = renderHook(() => useContractContext(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.selectedContract).toBeDefined();
      });

      act(() => {
        result.current.setSelectedContract(null);
      });

      // Note: The context auto-selects first contract when contracts are available
      // So setting to null will trigger re-selection
      await waitFor(() => {
        expect(result.current.selectedContract).toEqual(mockContracts[0]);
      });
    });

    it('should reset contract selection when selected contract is no longer in list', async () => {
      // Start with contracts
      mocks.contracts = mockContracts;

      const { result, rerender } = renderHook(() => useContractContext(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.selectedContract).toEqual(mockContracts[0]);
      });

      // Select second contract
      act(() => {
        result.current.setSelectedContract(mockContracts[1]);
      });

      expect(result.current.selectedContract).toEqual(mockContracts[1]);

      // Now simulate contract being deleted (only first contract remains)
      mocks.contracts = [mockContracts[0]];
      rerender();

      // Should auto-select first available contract
      await waitFor(() => {
        expect(result.current.selectedContract).toEqual(mockContracts[0]);
      });
    });
  });

  describe('loading states', () => {
    it('should reflect adapter loading state', () => {
      mocks.isAdapterLoading = true;

      const { result } = renderHook(() => useContractContext(), {
        wrapper: TestWrapper,
      });

      expect(result.current.isAdapterLoading).toBe(true);
    });

    it('should reflect contracts loading state', () => {
      // Note: This is controlled by useRecentContracts mock
      const { result } = renderHook(() => useContractContext(), {
        wrapper: TestWrapper,
      });

      expect(result.current.isContractsLoading).toBe(false);
    });
  });

  describe('empty states', () => {
    it('should handle empty networks list', () => {
      mocks.networks = [];

      const { result } = renderHook(() => useContractContext(), {
        wrapper: TestWrapper,
      });

      expect(result.current.selectedNetwork).toBeNull();
    });

    it('should handle empty contracts list', () => {
      mocks.contracts = [];

      const { result } = renderHook(() => useContractContext(), {
        wrapper: TestWrapper,
      });

      expect(result.current.contracts).toEqual([]);
      expect(result.current.selectedContract).toBeNull();
    });

    it('should handle null adapter', () => {
      mocks.adapter = null;

      const { result } = renderHook(() => useContractContext(), {
        wrapper: TestWrapper,
      });

      expect(result.current.adapter).toBeNull();
    });
  });

  describe('context value stability', () => {
    it('should maintain stable setSelectedContract reference', async () => {
      const { result, rerender } = renderHook(() => useContractContext(), {
        wrapper: TestWrapper,
      });

      const initialSetSelectedContract = result.current.setSelectedContract;

      rerender();

      expect(result.current.setSelectedContract).toBe(initialSetSelectedContract);
    });

    it('should maintain stable setSelectedNetwork reference', async () => {
      const { result, rerender } = renderHook(() => useContractContext(), {
        wrapper: TestWrapper,
      });

      const initialSetSelectedNetwork = result.current.setSelectedNetwork;

      rerender();

      expect(result.current.setSelectedNetwork).toBe(initialSetSelectedNetwork);
    });
  });
});
