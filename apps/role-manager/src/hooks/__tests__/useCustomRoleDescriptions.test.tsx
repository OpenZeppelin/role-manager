/**
 * Tests for useCustomRoleDescriptions hook
 * Feature: 009-roles-page-data
 */
import 'fake-indexeddb/auto';

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCustomRoleDescriptions } from '../useCustomRoleDescriptions';

// Create mocks that will be populated by vi.mock factories
const mocks = {
  getCustomRoleDescriptions: vi.fn(),
  updateRoleDescription: vi.fn(),
  clearRoleDescription: vi.fn(),
  get: vi.fn(),
};

// Mock the storage module
vi.mock('@/core/storage/RecentContractsStorage', () => ({
  recentContractsStorage: {
    getCustomRoleDescriptions: (...args: unknown[]) => mocks.getCustomRoleDescriptions(...args),
    updateRoleDescription: (...args: unknown[]) => mocks.updateRoleDescription(...args),
    clearRoleDescription: (...args: unknown[]) => mocks.clearRoleDescription(...args),
    get: (...args: unknown[]) => mocks.get(...args),
  },
  RecentContractsStorage: class {
    getCustomRoleDescriptions = (...args: unknown[]) => mocks.getCustomRoleDescriptions(...args);
    updateRoleDescription = (...args: unknown[]) => mocks.updateRoleDescription(...args);
    clearRoleDescription = (...args: unknown[]) => mocks.clearRoleDescription(...args);
    get = (...args: unknown[]) => mocks.get(...args);
  },
}));

describe('useCustomRoleDescriptions', () => {
  const mockContractId = 'contract-123';

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCustomRoleDescriptions.mockResolvedValue({});
    mocks.updateRoleDescription.mockResolvedValue(undefined);
    mocks.clearRoleDescription.mockResolvedValue(undefined);
    mocks.get.mockResolvedValue({ id: mockContractId, customRoleDescriptions: {} });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return loading state initially', async () => {
      const { result } = renderHook(() => useCustomRoleDescriptions(mockContractId));

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should return empty descriptions when no custom descriptions exist', async () => {
      mocks.getCustomRoleDescriptions.mockResolvedValue({});

      const { result } = renderHook(() => useCustomRoleDescriptions(mockContractId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.descriptions).toEqual({});
    });

    it('should load existing descriptions from storage', async () => {
      mocks.getCustomRoleDescriptions.mockResolvedValue({
        ADMIN_ROLE: 'Admin description',
        MINTER_ROLE: 'Minter description',
      });

      const { result } = renderHook(() => useCustomRoleDescriptions(mockContractId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.descriptions).toEqual({
        ADMIN_ROLE: 'Admin description',
        MINTER_ROLE: 'Minter description',
      });
    });

    it('should expose updateDescription method', async () => {
      const { result } = renderHook(() => useCustomRoleDescriptions(mockContractId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.updateDescription).toBeDefined();
      expect(typeof result.current.updateDescription).toBe('function');
    });

    it('should expose clearDescription method', async () => {
      const { result } = renderHook(() => useCustomRoleDescriptions(mockContractId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.clearDescription).toBeDefined();
      expect(typeof result.current.clearDescription).toBe('function');
    });
  });

  describe('updateDescription', () => {
    it('should call storage updateRoleDescription with correct params', async () => {
      const { result } = renderHook(() => useCustomRoleDescriptions(mockContractId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateDescription('ADMIN_ROLE', 'New description');
      });

      expect(mocks.updateRoleDescription).toHaveBeenCalledWith(
        mockContractId,
        'ADMIN_ROLE',
        'New description'
      );
    });

    it('should update local descriptions optimistically', async () => {
      mocks.getCustomRoleDescriptions.mockResolvedValue({});

      const { result } = renderHook(() => useCustomRoleDescriptions(mockContractId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateDescription('ADMIN_ROLE', 'New description');
      });

      // Should update local state
      expect(result.current.descriptions['ADMIN_ROLE']).toBe('New description');
    });

    it('should preserve existing descriptions when adding new one', async () => {
      mocks.getCustomRoleDescriptions.mockResolvedValue({
        ADMIN_ROLE: 'Existing admin description',
      });

      const { result } = renderHook(() => useCustomRoleDescriptions(mockContractId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateDescription('MINTER_ROLE', 'New minter description');
      });

      expect(result.current.descriptions).toEqual({
        ADMIN_ROLE: 'Existing admin description',
        MINTER_ROLE: 'New minter description',
      });
    });
  });

  describe('clearDescription', () => {
    it('should call storage clearRoleDescription with correct params', async () => {
      mocks.getCustomRoleDescriptions.mockResolvedValue({
        ADMIN_ROLE: 'Admin description',
      });

      const { result } = renderHook(() => useCustomRoleDescriptions(mockContractId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.clearDescription('ADMIN_ROLE');
      });

      expect(mocks.clearRoleDescription).toHaveBeenCalledWith(mockContractId, 'ADMIN_ROLE');
    });

    it('should remove description from local state', async () => {
      mocks.getCustomRoleDescriptions.mockResolvedValue({
        ADMIN_ROLE: 'Admin description',
        MINTER_ROLE: 'Minter description',
      });

      const { result } = renderHook(() => useCustomRoleDescriptions(mockContractId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.clearDescription('ADMIN_ROLE');
      });

      expect(result.current.descriptions['ADMIN_ROLE']).toBeUndefined();
      expect(result.current.descriptions['MINTER_ROLE']).toBe('Minter description');
    });
  });

  describe('contractId changes', () => {
    it('should reload descriptions when contractId changes', async () => {
      mocks.getCustomRoleDescriptions
        .mockResolvedValueOnce({ ADMIN_ROLE: 'First contract' })
        .mockResolvedValueOnce({ MINTER_ROLE: 'Second contract' });

      const { result, rerender } = renderHook(
        ({ contractId }) => useCustomRoleDescriptions(contractId),
        {
          initialProps: { contractId: 'contract-1' },
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.descriptions).toEqual({ ADMIN_ROLE: 'First contract' });

      // Change contractId
      rerender({ contractId: 'contract-2' });

      await waitFor(() => {
        expect(result.current.descriptions).toEqual({ MINTER_ROLE: 'Second contract' });
      });
    });

    it('should return empty descriptions when contractId is undefined', async () => {
      const { result } = renderHook(() => useCustomRoleDescriptions(undefined));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.descriptions).toEqual({});
    });

    it('should return empty descriptions when contractId is null', async () => {
      const { result } = renderHook(() => useCustomRoleDescriptions(null as unknown as string));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.descriptions).toEqual({});
    });
  });

  describe('error handling', () => {
    it('should handle storage errors gracefully on load', async () => {
      const error = new Error('Storage error');
      mocks.getCustomRoleDescriptions.mockRejectedValue(error);

      const { result } = renderHook(() => useCustomRoleDescriptions(mockContractId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should return empty descriptions on error
      expect(result.current.descriptions).toEqual({});
    });

    it('should propagate storage errors on update', async () => {
      const error = new Error('Storage error');
      mocks.updateRoleDescription.mockRejectedValue(error);

      const { result } = renderHook(() => useCustomRoleDescriptions(mockContractId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.updateDescription('ADMIN_ROLE', 'New description');
        })
      ).rejects.toThrow('Storage error');
    });

    it('should propagate storage errors on clear', async () => {
      const error = new Error('Storage error');
      mocks.clearRoleDescription.mockRejectedValue(error);

      const { result } = renderHook(() => useCustomRoleDescriptions(mockContractId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.clearDescription('ADMIN_ROLE');
        })
      ).rejects.toThrow('Storage error');
    });
  });
});
