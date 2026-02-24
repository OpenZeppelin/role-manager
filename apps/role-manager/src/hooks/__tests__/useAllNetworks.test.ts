import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NetworkConfig } from '@openzeppelin/ui-types';

import { getAllNetworks } from '@/core/ecosystems/ecosystemManager';

import { useAllNetworks } from '../useAllNetworks';

vi.mock('@/core/ecosystems/ecosystemManager', () => ({
  getAllNetworks: vi.fn(),
}));

const mockGetAllNetworks = vi.mocked(getAllNetworks);

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
    mockGetAllNetworks.mockResolvedValue([...mockEvmNetworks, ...mockStellarNetworks]);
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
    it('should fetch networks via getAllNetworks', async () => {
      const { result } = renderHook(() => useAllNetworks());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetAllNetworks).toHaveBeenCalledTimes(1);
    });

    it('should combine networks from all ecosystems', async () => {
      const { result } = renderHook(() => useAllNetworks());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.networks).toHaveLength(4);
      expect(result.current.networks).toContainEqual(
        expect.objectContaining({ id: 'ethereum-mainnet' })
      );
      expect(result.current.networks).toContainEqual(
        expect.objectContaining({ id: 'stellar-mainnet' })
      );
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

    it('should set loading to false even on failure', async () => {
      mockGetAllNetworks.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAllNetworks());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('error handling', () => {
    it('should handle complete failure gracefully', async () => {
      mockGetAllNetworks.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAllNetworks());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.networks).toEqual([]);
      expect(result.current.error).toBeDefined();
    });

    it('should set error when getAllNetworks returns empty array', async () => {
      mockGetAllNetworks.mockResolvedValue([]);

      const { result } = renderHook(() => useAllNetworks());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toBe('Failed to fetch networks from any ecosystem');
    });

    it('should provide error state on rejection', async () => {
      const networkError = new Error('Failed to fetch networks');
      mockGetAllNetworks.mockRejectedValue(networkError);

      const { result } = renderHook(() => useAllNetworks());

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
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

      const callCount = mockGetAllNetworks.mock.calls.length;

      rerender();

      expect(mockGetAllNetworks.mock.calls.length).toBe(callCount);
    });
  });
});
