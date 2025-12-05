/**
 * Tests for useSelectedContract hook
 * Feature: 007-dashboard-real-data
 *
 * Tests the convenience wrapper hook for ContractContext.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';

import type { ContractAdapter, NetworkConfig } from '@openzeppelin/ui-builder-types';

import { ContractProvider } from '../../context/ContractContext';
import type { ContractRecord } from '../../types/contracts';
import { useSelectedContract } from '../useSelectedContract';

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

const mockContract: ContractRecord = {
  id: 'contract-1',
  networkId: 'stellar-testnet',
  address: 'CONTRACT_ADDRESS_1',
  label: 'Test Contract',
  lastAccessed: Date.now(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAdapter: ContractAdapter = {
  networkConfig: mockNetwork,
  isValidAddress: vi.fn().mockReturnValue(true),
} as unknown as ContractAdapter;

// =============================================================================
// Mocks
// =============================================================================

const mocks = {
  networks: [mockNetwork],
  contracts: [mockContract],
  adapter: mockAdapter as ContractAdapter | null,
  isAdapterLoading: false,
};

vi.mock('../useAllNetworks', () => ({
  useAllNetworks: () => ({
    networks: mocks.networks,
    isLoading: false,
  }),
}));

vi.mock('../useRecentContracts', () => ({
  useRecentContracts: () => ({
    data: mocks.contracts,
    isLoading: false,
    addOrUpdate: vi.fn(),
    getByNetwork: vi.fn(),
    deleteContract: vi.fn(),
  }),
}));

vi.mock('../useNetworkAdapter', () => ({
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

describe('useSelectedContract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.networks = [mockNetwork];
    mocks.contracts = [mockContract];
    mocks.adapter = mockAdapter;
    mocks.isAdapterLoading = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should throw error when used outside ContractProvider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useSelectedContract());
      }).toThrow('useContractContext must be used within a ContractProvider');

      consoleError.mockRestore();
    });

    it('should return all context values', async () => {
      const { result } = renderHook(() => useSelectedContract(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.selectedContract).toBeDefined();
      });

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

  describe('selected contract', () => {
    it('should return the selected contract', async () => {
      const { result } = renderHook(() => useSelectedContract(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.selectedContract).toEqual(mockContract);
      });
    });

    it('should allow updating the selected contract', async () => {
      const newContract: ContractRecord = {
        ...mockContract,
        id: 'contract-2',
        label: 'New Contract',
      };
      mocks.contracts = [mockContract, newContract];

      const { result } = renderHook(() => useSelectedContract(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.selectedContract).toBeDefined();
      });

      act(() => {
        result.current.setSelectedContract(newContract);
      });

      expect(result.current.selectedContract).toEqual(newContract);
    });

    it('should return null when no contracts exist', () => {
      mocks.contracts = [];

      const { result } = renderHook(() => useSelectedContract(), {
        wrapper: TestWrapper,
      });

      expect(result.current.selectedContract).toBeNull();
    });
  });

  describe('selected network', () => {
    it('should return the selected network', async () => {
      const { result } = renderHook(() => useSelectedContract(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.selectedNetwork).toEqual(mockNetwork);
      });
    });

    it('should allow updating the selected network', async () => {
      const newNetwork: NetworkConfig = {
        ...mockNetwork,
        id: 'stellar-mainnet',
        name: 'Stellar Mainnet',
      };
      mocks.networks = [mockNetwork, newNetwork];

      const { result } = renderHook(() => useSelectedContract(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.selectedNetwork).toBeDefined();
      });

      act(() => {
        result.current.setSelectedNetwork(newNetwork);
      });

      expect(result.current.selectedNetwork).toEqual(newNetwork);
    });
  });

  describe('adapter', () => {
    it('should return the loaded adapter', async () => {
      const { result } = renderHook(() => useSelectedContract(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.adapter).toBe(mockAdapter);
      });
    });

    it('should return null when adapter is not loaded', () => {
      mocks.adapter = null;

      const { result } = renderHook(() => useSelectedContract(), {
        wrapper: TestWrapper,
      });

      expect(result.current.adapter).toBeNull();
    });

    it('should reflect adapter loading state', () => {
      mocks.isAdapterLoading = true;

      const { result } = renderHook(() => useSelectedContract(), {
        wrapper: TestWrapper,
      });

      expect(result.current.isAdapterLoading).toBe(true);
    });
  });

  describe('contracts list', () => {
    it('should return contracts for the current network', async () => {
      const { result } = renderHook(() => useSelectedContract(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.contracts).toEqual([mockContract]);
      });
    });

    it('should return empty array when no contracts exist', () => {
      mocks.contracts = [];

      const { result } = renderHook(() => useSelectedContract(), {
        wrapper: TestWrapper,
      });

      expect(result.current.contracts).toEqual([]);
    });
  });

  describe('return type interface', () => {
    it('should match UseSelectedContractReturn interface', async () => {
      const { result } = renderHook(() => useSelectedContract(), {
        wrapper: TestWrapper,
      });

      await waitFor(() => {
        expect(result.current.selectedContract).toBeDefined();
      });

      // Verify all expected properties are present and have correct types
      expect(typeof result.current.setSelectedContract).toBe('function');
      expect(typeof result.current.setSelectedNetwork).toBe('function');
      expect(typeof result.current.isAdapterLoading).toBe('boolean');
      expect(typeof result.current.isContractsLoading).toBe('boolean');
      expect(Array.isArray(result.current.contracts)).toBe(true);
    });
  });
});
