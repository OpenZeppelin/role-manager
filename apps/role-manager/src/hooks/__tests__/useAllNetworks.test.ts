/**
 * Tests for useAllNetworks hook
 * Feature: 004-add-contract-record
 *
 * TDD: These tests should FAIL initially before hook implementation
 */
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NetworkConfig } from '@openzeppelin/ui-builder-types';

// Import after mock setup
import { getNetworksByEcosystem } from '@/core/ecosystems/ecosystemManager';
import { getEcosystemDefaultFeatureConfig } from '@/core/ecosystems/registry';

import { useAllNetworks } from '../useAllNetworks';

// Mock the ecosystemManager module
vi.mock('@/core/ecosystems/ecosystemManager', () => ({
  getNetworksByEcosystem: vi.fn(),
}));

// Mock the registry module
vi.mock('@/core/ecosystems/registry', () => ({
  ECOSYSTEM_ORDER: ['evm', 'stellar', 'midnight', 'solana'],
  getEcosystemDefaultFeatureConfig: vi.fn(),
}));

const mockGetNetworksByEcosystem = vi.mocked(getNetworksByEcosystem);
const mockGetEcosystemDefaultFeatureConfig = vi.mocked(getEcosystemDefaultFeatureConfig);

// Test fixtures - use type assertion to avoid full NetworkConfig requirements
const mockEvmNetworks = [
  {
    id: 'ethereum-mainnet',
    name: 'Ethereum Mainnet',
    ecosystem: 'evm',
    network: 'ethereum',
    type: 'mainnet',
    isTestnet: false,
  },
  {
    id: 'ethereum-sepolia',
    name: 'Sepolia Testnet',
    ecosystem: 'evm',
    network: 'ethereum',
    type: 'testnet',
    isTestnet: true,
  },
] as NetworkConfig[];

const mockStellarNetworks = [
  {
    id: 'stellar-mainnet',
    name: 'Stellar Mainnet',
    ecosystem: 'stellar',
    network: 'stellar',
    type: 'mainnet',
    isTestnet: false,
  },
  {
    id: 'stellar-testnet',
    name: 'Stellar Testnet',
    ecosystem: 'stellar',
    network: 'stellar',
    type: 'testnet',
    isTestnet: true,
  },
] as NetworkConfig[];

describe('useAllNetworks', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockGetEcosystemDefaultFeatureConfig.mockImplementation((ecosystem) => {
      if (ecosystem === 'solana') {
        return { enabled: false, showInUI: false };
      }
      return { enabled: true, showInUI: true };
    });

    mockGetNetworksByEcosystem.mockImplementation(async (ecosystem) => {
      switch (ecosystem) {
        case 'evm':
          return mockEvmNetworks;
        case 'stellar':
          return mockStellarNetworks;
        case 'midnight':
          return [];
        case 'solana':
          return [];
        default:
          return [];
      }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should start with loading state', () => {
      const { result } = renderHook(() => useAllNetworks());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.networks).toEqual([]);
    });

    it('should return empty array for networks initially', () => {
      const { result } = renderHook(() => useAllNetworks());

      expect(result.current.networks).toEqual([]);
    });
  });

  describe('network fetching', () => {
    it('should fetch networks from all enabled ecosystems', async () => {
      const { result } = renderHook(() => useAllNetworks());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have called getNetworksByEcosystem for enabled ecosystems
      expect(mockGetNetworksByEcosystem).toHaveBeenCalledWith('evm');
      expect(mockGetNetworksByEcosystem).toHaveBeenCalledWith('stellar');
      expect(mockGetNetworksByEcosystem).toHaveBeenCalledWith('midnight');
      // Solana is disabled, should not be called
      expect(mockGetNetworksByEcosystem).not.toHaveBeenCalledWith('solana');
    });

    it('should combine networks from all ecosystems', async () => {
      const { result } = renderHook(() => useAllNetworks());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have all networks from enabled ecosystems
      expect(result.current.networks).toHaveLength(4); // 2 EVM + 2 Stellar
      expect(result.current.networks).toContainEqual(
        expect.objectContaining({ id: 'ethereum-mainnet' })
      );
      expect(result.current.networks).toContainEqual(
        expect.objectContaining({ id: 'stellar-mainnet' })
      );
    });

    it('should not include networks from disabled ecosystems', async () => {
      const { result } = renderHook(() => useAllNetworks());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Solana networks should not be included
      const solanaNetworks = result.current.networks.filter((n) => n.ecosystem === 'solana');
      expect(solanaNetworks).toHaveLength(0);
    });
  });

  describe('loading state', () => {
    it('should set loading to false when all networks are fetched', async () => {
      const { result } = renderHook(() => useAllNetworks());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should set loading to false even if some ecosystems fail', async () => {
      mockGetNetworksByEcosystem.mockImplementation(async (ecosystem) => {
        if (ecosystem === 'evm') {
          throw new Error('Failed to load EVM networks');
        }
        return mockStellarNetworks;
      });

      const { result } = renderHook(() => useAllNetworks());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should still have Stellar networks
      expect(result.current.networks).toContainEqual(
        expect.objectContaining({ id: 'stellar-mainnet' })
      );
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully when ecosystem loading fails', async () => {
      mockGetNetworksByEcosystem.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAllNetworks());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should return empty networks without crashing
      expect(result.current.networks).toEqual([]);
      expect(result.current.error).toBeDefined();
    });

    it('should provide error state', async () => {
      const networkError = new Error('Failed to fetch networks');
      mockGetNetworksByEcosystem.mockRejectedValue(networkError);

      const { result } = renderHook(() => useAllNetworks());

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
    });
  });

  describe('ecosystem filtering', () => {
    it('should only fetch networks for enabled ecosystems based on config', async () => {
      // All ecosystems disabled except EVM
      mockGetEcosystemDefaultFeatureConfig.mockImplementation((ecosystem) => {
        if (ecosystem === 'evm') {
          return { enabled: true, showInUI: true };
        }
        return { enabled: false, showInUI: false };
      });

      const { result } = renderHook(() => useAllNetworks());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetNetworksByEcosystem).toHaveBeenCalledWith('evm');
      expect(mockGetNetworksByEcosystem).not.toHaveBeenCalledWith('stellar');
      expect(mockGetNetworksByEcosystem).not.toHaveBeenCalledWith('midnight');
    });
  });

  describe('return type interface', () => {
    it('should return networks, isLoading, and error', async () => {
      const { result } = renderHook(() => useAllNetworks());

      expect(result.current).toHaveProperty('networks');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(Array.isArray(result.current.networks)).toBe(true);
    });
  });

  describe('caching behavior', () => {
    it('should not refetch on every render', async () => {
      const { result, rerender } = renderHook(() => useAllNetworks());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const callCount = mockGetNetworksByEcosystem.mock.calls.length;

      // Rerender
      rerender();

      // Should not have called again
      expect(mockGetNetworksByEcosystem.mock.calls.length).toBe(callCount);
    });
  });
});
