/**
 * Tests for useNetworkAdapter hook
 * Feature: 004-add-contract-record
 *
 * TDD: These tests should FAIL initially before hook implementation
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContractAdapter, NetworkConfig } from '@openzeppelin/ui-types';

// Import after mock setup
import { getAdapter } from '@/core/ecosystems/ecosystemManager';

import { useNetworkAdapter } from '../useNetworkAdapter';

// Mock the ecosystemManager module
vi.mock('@/core/ecosystems/ecosystemManager', () => ({
  getAdapter: vi.fn(),
}));

const mockGetAdapter = vi.mocked(getAdapter);

// Test fixtures - use partial type to avoid needing all NetworkConfig fields
const mockNetworkConfig = {
  id: 'ethereum-mainnet',
  name: 'Ethereum Mainnet',
  ecosystem: 'evm',
  network: 'ethereum',
  type: 'mainnet',
  isTestnet: false,
} as NetworkConfig;

const mockAdapter: ContractAdapter = {
  networkConfig: mockNetworkConfig,
  isValidAddress: vi.fn().mockReturnValue(true),
  getContract: vi.fn(),
  // Add minimal required adapter methods
} as unknown as ContractAdapter;

describe('useNetworkAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdapter.mockResolvedValue(mockAdapter);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return null adapter when networkConfig is null', () => {
      const { result } = renderHook(() => useNetworkAdapter(null));

      expect(result.current.adapter).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should start with loading state when networkConfig is provided', () => {
      const { result } = renderHook(() => useNetworkAdapter(mockNetworkConfig));

      // Should be loading initially
      expect(result.current.isLoading).toBe(true);
      expect(result.current.adapter).toBeNull();
    });
  });

  describe('adapter loading', () => {
    it('should load adapter for given network config', async () => {
      const { result } = renderHook(() => useNetworkAdapter(mockNetworkConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetAdapter).toHaveBeenCalledWith(mockNetworkConfig);
      expect(result.current.adapter).toBe(mockAdapter);
      expect(result.current.error).toBeNull();
    });

    it('should update adapter when networkConfig changes', async () => {
      const stellarConfig = {
        id: 'stellar-mainnet',
        name: 'Stellar Mainnet',
        ecosystem: 'stellar',
        network: 'stellar',
        type: 'mainnet',
        isTestnet: false,
      } as NetworkConfig;

      const stellarAdapter = {
        ...mockAdapter,
        networkConfig: stellarConfig,
      } as ContractAdapter;

      mockGetAdapter.mockResolvedValueOnce(mockAdapter).mockResolvedValueOnce(stellarAdapter);

      const { result, rerender } = renderHook(({ config }) => useNetworkAdapter(config), {
        initialProps: { config: mockNetworkConfig },
      });

      await waitFor(() => {
        expect(result.current.adapter).toBe(mockAdapter);
      });

      // Change network config
      rerender({ config: stellarConfig });

      await waitFor(() => {
        expect(result.current.adapter).toBe(stellarAdapter);
      });

      expect(mockGetAdapter).toHaveBeenCalledTimes(2);
    });

    it('should reset adapter to null when networkConfig becomes null', async () => {
      const { result, rerender } = renderHook(({ config }) => useNetworkAdapter(config), {
        initialProps: { config: mockNetworkConfig as NetworkConfig | null },
      });

      await waitFor(() => {
        expect(result.current.adapter).toBe(mockAdapter);
      });

      // Set config to null
      rerender({ config: null });

      expect(result.current.adapter).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should set error state when adapter loading fails', async () => {
      const loadError = new Error('Failed to load adapter');
      mockGetAdapter.mockRejectedValue(loadError);

      const { result } = renderHook(() => useNetworkAdapter(mockNetworkConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual(loadError);
      expect(result.current.adapter).toBeNull();
    });

    it('should clear error state when loading succeeds after retry', async () => {
      const loadError = new Error('Failed to load adapter');
      mockGetAdapter.mockRejectedValueOnce(loadError).mockResolvedValueOnce(mockAdapter);

      const { result } = renderHook(() => useNetworkAdapter(mockNetworkConfig));

      // Wait for error state
      await waitFor(() => {
        expect(result.current.error).toEqual(loadError);
      });

      // Retry
      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.adapter).toBe(mockAdapter);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('retry functionality', () => {
    it('should provide retry function', () => {
      const { result } = renderHook(() => useNetworkAdapter(mockNetworkConfig));

      expect(result.current.retry).toBeDefined();
      expect(typeof result.current.retry).toBe('function');
    });

    it('should reload adapter when retry is called', async () => {
      const { result } = renderHook(() => useNetworkAdapter(mockNetworkConfig));

      await waitFor(() => {
        expect(result.current.adapter).toBe(mockAdapter);
      });

      expect(mockGetAdapter).toHaveBeenCalledTimes(1);

      // Call retry
      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(mockGetAdapter).toHaveBeenCalledTimes(2);
      });
    });

    it('should not retry when networkConfig is null', async () => {
      const { result } = renderHook(() => useNetworkAdapter(null));

      act(() => {
        result.current.retry();
      });

      expect(mockGetAdapter).not.toHaveBeenCalled();
    });
  });

  describe('return type interface', () => {
    it('should match UseNetworkAdapterReturn interface', async () => {
      const { result } = renderHook(() => useNetworkAdapter(mockNetworkConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify return type shape
      expect(result.current).toHaveProperty('adapter');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('retry');
    });
  });
});
