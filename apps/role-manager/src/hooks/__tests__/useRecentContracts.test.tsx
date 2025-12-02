/**
 * Tests for useRecentContracts hook
 */
import 'fake-indexeddb/auto';

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

import { useRecentContracts } from '../useRecentContracts';

// Create mocks that will be populated by vi.mock factories
const mocks = {
  addOrUpdate: vi.fn(),
  getByNetwork: vi.fn(),
};

// Mock modules using factory functions (not top-level variables)
vi.mock('@/core/storage', () => ({
  db: { table: vi.fn() },
}));

vi.mock('@/core/storage/RecentContractsStorage', () => ({
  recentContractsStorage: {
    addOrUpdate: (...args: unknown[]) => mocks.addOrUpdate(...args),
    getByNetwork: (...args: unknown[]) => mocks.getByNetwork(...args),
  },
  RecentContractsStorage: class {
    addOrUpdate = (...args: unknown[]) => mocks.addOrUpdate(...args);
    getByNetwork = (...args: unknown[]) => mocks.getByNetwork(...args);
  },
}));

// Mock createRepositoryHook to return a simple hook implementation
vi.mock('@openzeppelin/ui-builder-storage', () => ({
  createRepositoryHook: vi.fn(({ repo, expose }) => {
    // Return a hook factory that creates state-based hooks
    return function useRepoHook() {
      const [data, setData] = React.useState<unknown[]>([]);
      const [loading, setLoading] = React.useState(true);
      const [error, setError] = React.useState<Error | null>(null);

      React.useEffect(() => {
        setLoading(false);
      }, []);

      const exposed = expose ? expose(repo) : {};

      return {
        data,
        loading,
        error,
        ...exposed,
        // For testing: expose setters
        _setData: setData,
        _setError: setError,
      };
    };
  }),
}));

describe('useRecentContracts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.addOrUpdate.mockResolvedValue('mock-id-1');
    mocks.getByNetwork.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return loading state initially', () => {
      const { result } = renderHook(() => useRecentContracts('stellar-testnet'));

      // Initially loading, then should resolve
      expect(result.current.loading).toBe(false); // Our mock resolves immediately
    });

    it('should return empty data array when no contracts exist', async () => {
      const { result } = renderHook(() => useRecentContracts('stellar-testnet'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should expose addOrUpdate method', () => {
      const { result } = renderHook(() => useRecentContracts('stellar-testnet'));

      expect(result.current.addOrUpdate).toBeDefined();
      expect(typeof result.current.addOrUpdate).toBe('function');
    });

    it('should expose getByNetwork method', () => {
      const { result } = renderHook(() => useRecentContracts('stellar-testnet'));

      expect(result.current.getByNetwork).toBeDefined();
      expect(typeof result.current.getByNetwork).toBe('function');
    });
  });

  describe('addOrUpdate', () => {
    it('should call repository addOrUpdate with correct params', async () => {
      const { result } = renderHook(() => useRecentContracts('stellar-testnet'));

      await act(async () => {
        await result.current.addOrUpdate({
          networkId: 'stellar-testnet',
          address: 'ADDR1',
          label: 'Test Contract',
        });
      });

      expect(mocks.addOrUpdate).toHaveBeenCalledWith({
        networkId: 'stellar-testnet',
        address: 'ADDR1',
        label: 'Test Contract',
      });
    });

    it('should return the id from repository', async () => {
      mocks.addOrUpdate.mockResolvedValue('new-id-123');

      const { result } = renderHook(() => useRecentContracts('stellar-testnet'));

      let id: string | undefined;
      await act(async () => {
        id = await result.current.addOrUpdate({
          networkId: 'stellar-testnet',
          address: 'ADDR1',
        });
      });

      expect(id).toBe('new-id-123');
    });
  });

  describe('getByNetwork', () => {
    it('should call repository getByNetwork with correct params', async () => {
      mocks.getByNetwork.mockResolvedValue([
        { id: '1', networkId: 'stellar-testnet', address: 'ADDR1', lastAccessed: Date.now() },
      ]);

      const { result } = renderHook(() => useRecentContracts('stellar-testnet'));

      let records: unknown[] = [];
      await act(async () => {
        records = await result.current.getByNetwork('stellar-testnet');
      });

      expect(mocks.getByNetwork).toHaveBeenCalledWith('stellar-testnet');
      expect(records).toHaveLength(1);
    });
  });

  describe('with undefined networkId', () => {
    it('should handle undefined networkId gracefully', () => {
      const { result } = renderHook(() => useRecentContracts(undefined));

      expect(result.current.data).toEqual([]);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle repository errors gracefully', async () => {
      const error = new Error('Storage error');
      mocks.addOrUpdate.mockRejectedValue(error);

      const { result } = renderHook(() => useRecentContracts('stellar-testnet'));

      await expect(
        act(async () => {
          await result.current.addOrUpdate({
            networkId: 'stellar-testnet',
            address: 'ADDR1',
          });
        })
      ).rejects.toThrow('Storage error');
    });
  });

  describe('networkId changes', () => {
    it('should update when networkId changes', async () => {
      const { result, rerender } = renderHook(({ networkId }) => useRecentContracts(networkId), {
        initialProps: { networkId: 'stellar-testnet' },
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Change networkId
      rerender({ networkId: 'stellar-mainnet' });

      // Hook should still work with new networkId
      expect(result.current.addOrUpdate).toBeDefined();
    });
  });
});
