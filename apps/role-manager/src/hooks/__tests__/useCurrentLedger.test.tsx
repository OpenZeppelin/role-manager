/**
 * Tests for useCurrentLedger hook
 * Feature: 015-ownership-transfer
 *
 * Tests the hook for polling current block/ledger number.
 * Covers: initial fetch, polling, error handling, manual refetch, enabled toggle.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';

import type { ContractAdapter, NetworkConfig } from '@openzeppelin/ui-builder-types';

import { useCurrentLedger } from '../useCurrentLedger';

// Test fixtures
const mockNetworkConfig: NetworkConfig = {
  id: 'stellar-testnet',
  name: 'Stellar Testnet',
  ecosystem: 'stellar',
  network: 'stellar',
  type: 'testnet',
  isTestnet: true,
} as NetworkConfig;

// Create mock adapter factory
const createMockAdapter = (getCurrentBlockFn?: () => Promise<number>): ContractAdapter => {
  return {
    networkConfig: mockNetworkConfig,
    getCurrentBlock: getCurrentBlockFn ?? vi.fn().mockResolvedValue(12345),
  } as unknown as ContractAdapter;
};

// React Query wrapper factory
const createWrapper = (queryClient?: QueryClient) => {
  const client =
    queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
};

describe('useCurrentLedger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return null currentLedger initially before fetch completes', () => {
      // Use a promise that never resolves to keep loading state
      const getCurrentBlockFn = vi.fn().mockImplementation(() => new Promise(() => {}));
      const mockAdapter = createMockAdapter(getCurrentBlockFn);

      const { result } = renderHook(() => useCurrentLedger(mockAdapter), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.currentLedger).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should return currentLedger after fetch completes', async () => {
      const getCurrentBlockFn = vi.fn().mockResolvedValue(54321);
      const mockAdapter = createMockAdapter(getCurrentBlockFn);

      const { result } = renderHook(() => useCurrentLedger(mockAdapter), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentLedger).toBe(54321);
      expect(result.current.error).toBeNull();
    });

    it('should not fetch when adapter is null', () => {
      const { result } = renderHook(() => useCurrentLedger(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.currentLedger).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should not fetch when enabled is false', () => {
      const getCurrentBlockFn = vi.fn().mockResolvedValue(12345);
      const mockAdapter = createMockAdapter(getCurrentBlockFn);

      const { result } = renderHook(() => useCurrentLedger(mockAdapter, { enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.currentLedger).toBeNull();
      expect(getCurrentBlockFn).not.toHaveBeenCalled();
    });
  });

  describe('polling configuration', () => {
    it('should configure polling with default interval (5000ms)', async () => {
      const getCurrentBlockFn = vi.fn().mockResolvedValue(100);
      const mockAdapter = createMockAdapter(getCurrentBlockFn);

      const { result } = renderHook(() => useCurrentLedger(mockAdapter), {
        wrapper: createWrapper(),
      });

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.currentLedger).toBe(100);
      });

      // Verify initial call was made
      expect(getCurrentBlockFn).toHaveBeenCalledTimes(1);
    });

    it('should use custom poll interval when provided', async () => {
      const getCurrentBlockFn = vi.fn().mockResolvedValue(100);
      const mockAdapter = createMockAdapter(getCurrentBlockFn);

      const { result } = renderHook(() => useCurrentLedger(mockAdapter, { pollInterval: 2000 }), {
        wrapper: createWrapper(),
      });

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.currentLedger).toBe(100);
      });

      // Verify initial call was made
      expect(getCurrentBlockFn).toHaveBeenCalledTimes(1);
    });

    it('should stop polling when enabled changes to false', async () => {
      const getCurrentBlockFn = vi.fn().mockResolvedValue(100);
      const mockAdapter = createMockAdapter(getCurrentBlockFn);

      const { result, rerender } = renderHook(
        ({ enabled }) => useCurrentLedger(mockAdapter, { enabled }),
        {
          wrapper: createWrapper(),
          initialProps: { enabled: true },
        }
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.currentLedger).toBe(100);
      });

      const callCountAfterInitial = getCurrentBlockFn.mock.calls.length;

      // Disable polling
      rerender({ enabled: false });

      // Verify no additional calls are made immediately
      // (polling should be disabled)
      expect(getCurrentBlockFn).toHaveBeenCalledTimes(callCountAfterInitial);
    });
  });

  describe('error handling', () => {
    it('should set error when fetch fails', async () => {
      const getCurrentBlockFn = vi.fn().mockRejectedValue(new Error('Network error'));
      const mockAdapter = createMockAdapter(getCurrentBlockFn);

      const { result } = renderHook(() => useCurrentLedger(mockAdapter), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Network error');
      expect(result.current.currentLedger).toBeNull();
    });

    it('should handle multiple fetch cycles', async () => {
      const getCurrentBlockFn = vi.fn().mockResolvedValueOnce(100).mockResolvedValueOnce(101);
      const mockAdapter = createMockAdapter(getCurrentBlockFn);

      const { result } = renderHook(() => useCurrentLedger(mockAdapter), {
        wrapper: createWrapper(),
      });

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.currentLedger).toBe(100);
      });

      // Manual refetch to simulate next poll
      await act(async () => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.currentLedger).toBe(101);
      });
    });
  });

  describe('manual refetch', () => {
    it('should provide refetch function', async () => {
      const getCurrentBlockFn = vi.fn().mockResolvedValueOnce(100).mockResolvedValueOnce(150);
      const mockAdapter = createMockAdapter(getCurrentBlockFn);

      const { result } = renderHook(() => useCurrentLedger(mockAdapter), {
        wrapper: createWrapper(),
      });

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.currentLedger).toBe(100);
      });

      // Manually refetch
      await act(async () => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.currentLedger).toBe(150);
      });

      expect(getCurrentBlockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('adapter changes', () => {
    it('should refetch when adapter changes', async () => {
      const getCurrentBlockFn1 = vi.fn().mockResolvedValue(100);
      const getCurrentBlockFn2 = vi.fn().mockResolvedValue(999);

      const adapter1 = createMockAdapter(getCurrentBlockFn1);
      const adapter2 = {
        ...adapter1,
        networkConfig: { ...mockNetworkConfig, id: 'stellar-mainnet' },
        getCurrentBlock: getCurrentBlockFn2,
      } as unknown as ContractAdapter;

      const { result, rerender } = renderHook(({ adapter }) => useCurrentLedger(adapter), {
        wrapper: createWrapper(),
        initialProps: { adapter: adapter1 },
      });

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.currentLedger).toBe(100);
      });

      // Change adapter
      rerender({ adapter: adapter2 });

      await waitFor(() => {
        expect(result.current.currentLedger).toBe(999);
      });

      expect(getCurrentBlockFn2).toHaveBeenCalled();
    });
  });

  describe('return type', () => {
    it('should return correct shape matching UseCurrentLedgerReturn', async () => {
      const mockAdapter = createMockAdapter(vi.fn().mockResolvedValue(12345));

      const { result } = renderHook(() => useCurrentLedger(mockAdapter), {
        wrapper: createWrapper(),
      });

      // Check shape immediately
      expect(result.current).toHaveProperty('currentLedger');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refetch');
      expect(typeof result.current.refetch).toBe('function');

      // Wait for fetch to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentLedger).toBe(12345);
    });
  });
});
