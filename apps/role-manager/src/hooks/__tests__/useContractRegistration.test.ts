/**
 * Tests for useContractRegistration hook
 *
 * Tests contract registration with access control service.
 */
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContractAdapter, NetworkConfig } from '@openzeppelin/ui-types';

import type { ContractRecord } from '../../types/contracts';
import { useContractRegistration } from '../useContractRegistration';

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

const mockSchema = {
  name: 'TestContract',
  functions: [],
};

const mockContractWithSchema: ContractRecord = {
  id: 'contract-1',
  networkId: 'stellar-testnet',
  address: 'CONTRACT_ADDRESS_1',
  label: 'Test Contract',
  lastAccessed: Date.now(),
  createdAt: new Date(),
  updatedAt: new Date(),
  schema: JSON.stringify(mockSchema),
};

const mockContractWithoutSchema: ContractRecord = {
  id: 'contract-2',
  networkId: 'stellar-testnet',
  address: 'CONTRACT_ADDRESS_2',
  label: 'Contract Without Schema',
  lastAccessed: Date.now(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

// =============================================================================
// Mock Adapter Factory
// =============================================================================

function createMockAdapter(options: {
  supportsRegistration?: boolean;
  registerContract?: ReturnType<typeof vi.fn>;
}): ContractAdapter {
  const { supportsRegistration = true, registerContract = vi.fn() } = options;

  const mockService = supportsRegistration
    ? {
        registerContract,
        getCapabilities: vi.fn(),
      }
    : {
        getCapabilities: vi.fn(),
      };

  return {
    networkConfig: mockNetworkStellar,
    isValidAddress: vi.fn().mockReturnValue(true),
    getAccessControlService: vi.fn().mockReturnValue(mockService),
  } as unknown as ContractAdapter;
}

// =============================================================================
// Tests
// =============================================================================

describe('useContractRegistration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return false when no adapter', () => {
      const { result } = renderHook(() =>
        useContractRegistration({
          adapter: null,
          isAdapterLoading: false,
          selectedNetwork: mockNetworkStellar,
          selectedContract: mockContractWithSchema,
        })
      );

      expect(result.current.isContractRegistered).toBe(false);
    });

    it('should return false when adapter is loading', () => {
      const { result } = renderHook(() =>
        useContractRegistration({
          adapter: createMockAdapter({}),
          isAdapterLoading: true,
          selectedNetwork: mockNetworkStellar,
          selectedContract: mockContractWithSchema,
        })
      );

      expect(result.current.isContractRegistered).toBe(false);
    });

    it('should return false when no network selected', () => {
      const { result } = renderHook(() =>
        useContractRegistration({
          adapter: createMockAdapter({}),
          isAdapterLoading: false,
          selectedNetwork: null,
          selectedContract: mockContractWithSchema,
        })
      );

      expect(result.current.isContractRegistered).toBe(false);
    });

    it('should return false when no contract selected', () => {
      const { result } = renderHook(() =>
        useContractRegistration({
          adapter: createMockAdapter({}),
          isAdapterLoading: false,
          selectedNetwork: mockNetworkStellar,
          selectedContract: null,
        })
      );

      expect(result.current.isContractRegistered).toBe(false);
    });
  });

  describe('contract registration', () => {
    it('should register contract with schema', async () => {
      const registerContract = vi.fn();
      const adapter = createMockAdapter({ registerContract });

      const { result } = renderHook(() =>
        useContractRegistration({
          adapter,
          isAdapterLoading: false,
          selectedNetwork: mockNetworkStellar,
          selectedContract: mockContractWithSchema,
        })
      );

      await waitFor(() => {
        expect(result.current.isContractRegistered).toBe(true);
      });

      expect(registerContract).toHaveBeenCalledWith('CONTRACT_ADDRESS_1', mockSchema);
    });

    it('should mark as registered without calling registerContract for contract without schema', async () => {
      const registerContract = vi.fn();
      const adapter = createMockAdapter({ registerContract });

      const { result } = renderHook(() =>
        useContractRegistration({
          adapter,
          isAdapterLoading: false,
          selectedNetwork: mockNetworkStellar,
          selectedContract: mockContractWithoutSchema,
        })
      );

      await waitFor(() => {
        expect(result.current.isContractRegistered).toBe(true);
      });

      // Should not call registerContract since there's no schema
      expect(registerContract).not.toHaveBeenCalled();
    });

    it('should mark as registered when adapter does not support registration', async () => {
      const adapter = createMockAdapter({ supportsRegistration: false });

      const { result } = renderHook(() =>
        useContractRegistration({
          adapter,
          isAdapterLoading: false,
          selectedNetwork: mockNetworkStellar,
          selectedContract: mockContractWithSchema,
        })
      );

      await waitFor(() => {
        expect(result.current.isContractRegistered).toBe(true);
      });
    });

    it('should not re-register already registered contract', async () => {
      const registerContract = vi.fn();
      const adapter = createMockAdapter({ registerContract });

      const { result, rerender } = renderHook((props) => useContractRegistration(props), {
        initialProps: {
          adapter,
          isAdapterLoading: false,
          selectedNetwork: mockNetworkStellar,
          selectedContract: mockContractWithSchema,
        },
      });

      await waitFor(() => {
        expect(result.current.isContractRegistered).toBe(true);
      });

      expect(registerContract).toHaveBeenCalledTimes(1);

      // Re-render with same props
      rerender({
        adapter,
        isAdapterLoading: false,
        selectedNetwork: mockNetworkStellar,
        selectedContract: mockContractWithSchema,
      });

      // Should not call registerContract again
      expect(registerContract).toHaveBeenCalledTimes(1);
    });
  });

  describe('ecosystem change handling', () => {
    it('should clear registrations when ecosystem changes', async () => {
      const registerContractStellar = vi.fn();
      const adapterStellar = createMockAdapter({ registerContract: registerContractStellar });

      const registerContractEvm = vi.fn();
      const adapterEvm = {
        networkConfig: mockNetworkEvm,
        isValidAddress: vi.fn().mockReturnValue(true),
        getAccessControlService: vi.fn().mockReturnValue({
          registerContract: registerContractEvm,
          getCapabilities: vi.fn(),
        }),
      } as unknown as ContractAdapter;

      const evmContract: ContractRecord = {
        ...mockContractWithSchema,
        id: 'contract-evm',
        networkId: 'ethereum-mainnet',
        address: '0x1234567890123456789012345678901234567890',
      };

      const { result, rerender } = renderHook((props) => useContractRegistration(props), {
        initialProps: {
          adapter: adapterStellar,
          isAdapterLoading: false,
          selectedNetwork: mockNetworkStellar,
          selectedContract: mockContractWithSchema,
        },
      });

      await waitFor(() => {
        expect(result.current.isContractRegistered).toBe(true);
      });

      // Switch to EVM ecosystem
      rerender({
        adapter: adapterEvm,
        isAdapterLoading: false,
        selectedNetwork: mockNetworkEvm,
        selectedContract: evmContract,
      });

      await waitFor(() => {
        expect(result.current.isContractRegistered).toBe(true);
      });

      // Both should have been called
      expect(registerContractStellar).toHaveBeenCalledTimes(1);
      expect(registerContractEvm).toHaveBeenCalledTimes(1);
    });

    it('should not clear registrations when switching networks within same ecosystem', async () => {
      const registerContract = vi.fn();
      const adapter = createMockAdapter({ registerContract });

      const anotherStellarNetwork: NetworkConfig = {
        ...mockNetworkStellar,
        id: 'stellar-mainnet',
        name: 'Stellar Mainnet',
        type: 'mainnet',
        isTestnet: false,
      } as NetworkConfig;

      const { result, rerender } = renderHook((props) => useContractRegistration(props), {
        initialProps: {
          adapter,
          isAdapterLoading: false,
          selectedNetwork: mockNetworkStellar,
          selectedContract: mockContractWithSchema,
        },
      });

      await waitFor(() => {
        expect(result.current.isContractRegistered).toBe(true);
      });

      expect(registerContract).toHaveBeenCalledTimes(1);

      // Switch to another Stellar network (same ecosystem)
      rerender({
        adapter,
        isAdapterLoading: false,
        selectedNetwork: anotherStellarNetwork,
        selectedContract: mockContractWithSchema,
      });

      // Should still be registered (same ecosystem:address key)
      expect(result.current.isContractRegistered).toBe(true);

      // Should not have called registerContract again
      expect(registerContract).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should mark as registered even when registration throws', async () => {
      const registerContract = vi.fn().mockImplementation(() => {
        throw new Error('Registration failed');
      });
      const adapter = createMockAdapter({ registerContract });

      const { result } = renderHook(() =>
        useContractRegistration({
          adapter,
          isAdapterLoading: false,
          selectedNetwork: mockNetworkStellar,
          selectedContract: mockContractWithSchema,
        })
      );

      await waitFor(() => {
        expect(result.current.isContractRegistered).toBe(true);
      });

      // Should have attempted registration
      expect(registerContract).toHaveBeenCalled();
    });

    it('should handle invalid schema JSON gracefully', async () => {
      const registerContract = vi.fn();
      const adapter = createMockAdapter({ registerContract });

      const contractWithInvalidSchema: ContractRecord = {
        ...mockContractWithSchema,
        schema: 'invalid-json{',
      };

      const { result } = renderHook(() =>
        useContractRegistration({
          adapter,
          isAdapterLoading: false,
          selectedNetwork: mockNetworkStellar,
          selectedContract: contractWithInvalidSchema,
        })
      );

      await waitFor(() => {
        expect(result.current.isContractRegistered).toBe(true);
      });

      // Should not have called registerContract due to JSON parse error
      // But should still mark as registered
    });
  });

  describe('return type', () => {
    it('should return isContractRegistered boolean', () => {
      const { result } = renderHook(() =>
        useContractRegistration({
          adapter: null,
          isAdapterLoading: false,
          selectedNetwork: null,
          selectedContract: null,
        })
      );

      expect(result.current).toHaveProperty('isContractRegistered');
      expect(typeof result.current.isContractRegistered).toBe('boolean');
    });
  });
});
