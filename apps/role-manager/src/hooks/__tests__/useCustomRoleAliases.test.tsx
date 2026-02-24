/**
 * Tests for useCustomRoleAliases hook
 * Feature: role alias support
 */
import 'fake-indexeddb/auto';

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCustomRoleAliases } from '../useCustomRoleAliases';

// =============================================================================
// Mocks
// =============================================================================

const mocks = {
  getCustomRoleAliases: vi.fn(),
  updateRoleAlias: vi.fn(),
  clearRoleAlias: vi.fn(),
  get: vi.fn(),
};

vi.mock('@/core/storage/RecentContractsStorage', () => ({
  recentContractsStorage: {
    getCustomRoleAliases: (...args: unknown[]) => mocks.getCustomRoleAliases(...args),
    updateRoleAlias: (...args: unknown[]) => mocks.updateRoleAlias(...args),
    clearRoleAlias: (...args: unknown[]) => mocks.clearRoleAlias(...args),
    get: (...args: unknown[]) => mocks.get(...args),
  },
  RecentContractsStorage: class {
    getCustomRoleAliases = (...args: unknown[]) => mocks.getCustomRoleAliases(...args);
    updateRoleAlias = (...args: unknown[]) => mocks.updateRoleAlias(...args);
    clearRoleAlias = (...args: unknown[]) => mocks.clearRoleAlias(...args);
    get = (...args: unknown[]) => mocks.get(...args);
  },
}));

vi.mock('@openzeppelin/ui-utils', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// =============================================================================
// Tests
// =============================================================================

describe('useCustomRoleAliases', () => {
  const mockContractId = 'contract-123';

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCustomRoleAliases.mockResolvedValue({});
    mocks.updateRoleAlias.mockResolvedValue(undefined);
    mocks.clearRoleAlias.mockResolvedValue(undefined);
    mocks.get.mockResolvedValue({ id: mockContractId, customRoleAliases: {} });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  describe('initialization', () => {
    it('should return loading state initially', async () => {
      const { result } = renderHook(() => useCustomRoleAliases(mockContractId));

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should return empty aliases when no custom aliases exist', async () => {
      mocks.getCustomRoleAliases.mockResolvedValue({});

      const { result } = renderHook(() => useCustomRoleAliases(mockContractId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.aliases).toEqual({});
    });

    it('should load existing aliases from storage', async () => {
      mocks.getCustomRoleAliases.mockResolvedValue({
        '0xabc123': 'Minter',
        '0xdef456': 'Burner',
      });

      const { result } = renderHook(() => useCustomRoleAliases(mockContractId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.aliases).toEqual({
        '0xabc123': 'Minter',
        '0xdef456': 'Burner',
      });
    });

    it('should expose updateAlias and clearAlias methods', async () => {
      const { result } = renderHook(() => useCustomRoleAliases(mockContractId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.updateAlias).toBe('function');
      expect(typeof result.current.clearAlias).toBe('function');
    });
  });

  // ---------------------------------------------------------------------------
  // updateAlias
  // ---------------------------------------------------------------------------

  describe('updateAlias', () => {
    it('should call storage updateRoleAlias with correct params', async () => {
      const { result } = renderHook(() => useCustomRoleAliases(mockContractId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateAlias('0xabc123', 'Treasury Manager');
      });

      expect(mocks.updateRoleAlias).toHaveBeenCalledWith(
        mockContractId,
        '0xabc123',
        'Treasury Manager'
      );
    });

    it('should update local aliases optimistically', async () => {
      mocks.getCustomRoleAliases.mockResolvedValue({});

      const { result } = renderHook(() => useCustomRoleAliases(mockContractId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateAlias('0xabc123', 'Minter');
      });

      expect(result.current.aliases['0xabc123']).toBe('Minter');
    });

    it('should trim whitespace from alias', async () => {
      const { result } = renderHook(() => useCustomRoleAliases(mockContractId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateAlias('0xabc123', '  Minter  ');
      });

      expect(result.current.aliases['0xabc123']).toBe('Minter');
    });

    it('should remove alias from local state when trimmed value is empty', async () => {
      mocks.getCustomRoleAliases.mockResolvedValue({ '0xabc123': 'Minter' });

      const { result } = renderHook(() => useCustomRoleAliases(mockContractId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateAlias('0xabc123', '   ');
      });

      expect(result.current.aliases['0xabc123']).toBeUndefined();
    });

    it('should preserve existing aliases when adding a new one', async () => {
      mocks.getCustomRoleAliases.mockResolvedValue({
        '0xabc123': 'Minter',
      });

      const { result } = renderHook(() => useCustomRoleAliases(mockContractId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updateAlias('0xdef456', 'Burner');
      });

      expect(result.current.aliases).toEqual({
        '0xabc123': 'Minter',
        '0xdef456': 'Burner',
      });
    });

    it('should throw when no contract is selected', async () => {
      const { result } = renderHook(() => useCustomRoleAliases(undefined));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.updateAlias('0xabc123', 'Minter');
        })
      ).rejects.toThrow('No contract selected');
    });
  });

  // ---------------------------------------------------------------------------
  // clearAlias
  // ---------------------------------------------------------------------------

  describe('clearAlias', () => {
    it('should call storage clearRoleAlias with correct params', async () => {
      mocks.getCustomRoleAliases.mockResolvedValue({ '0xabc123': 'Minter' });

      const { result } = renderHook(() => useCustomRoleAliases(mockContractId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.clearAlias('0xabc123');
      });

      expect(mocks.clearRoleAlias).toHaveBeenCalledWith(mockContractId, '0xabc123');
    });

    it('should remove alias from local state', async () => {
      mocks.getCustomRoleAliases.mockResolvedValue({
        '0xabc123': 'Minter',
        '0xdef456': 'Burner',
      });

      const { result } = renderHook(() => useCustomRoleAliases(mockContractId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.clearAlias('0xabc123');
      });

      expect(result.current.aliases['0xabc123']).toBeUndefined();
      expect(result.current.aliases['0xdef456']).toBe('Burner');
    });

    it('should throw when no contract is selected', async () => {
      const { result } = renderHook(() => useCustomRoleAliases(null));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.clearAlias('0xabc123');
        })
      ).rejects.toThrow('No contract selected');
    });
  });

  // ---------------------------------------------------------------------------
  // contractId changes
  // ---------------------------------------------------------------------------

  describe('contractId changes', () => {
    it('should reload aliases when contractId changes', async () => {
      mocks.getCustomRoleAliases
        .mockResolvedValueOnce({ '0xabc': 'First Contract Role' })
        .mockResolvedValueOnce({ '0xdef': 'Second Contract Role' });

      const { result, rerender } = renderHook(
        ({ contractId }) => useCustomRoleAliases(contractId),
        { initialProps: { contractId: 'contract-1' } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.aliases).toEqual({ '0xabc': 'First Contract Role' });

      rerender({ contractId: 'contract-2' });

      await waitFor(() => {
        expect(result.current.aliases).toEqual({ '0xdef': 'Second Contract Role' });
      });
    });

    it('should return empty aliases when contractId is undefined', async () => {
      const { result } = renderHook(() => useCustomRoleAliases(undefined));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.aliases).toEqual({});
    });

    it('should return empty aliases when contractId is null', async () => {
      const { result } = renderHook(() => useCustomRoleAliases(null));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.aliases).toEqual({});
    });
  });

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  describe('error handling', () => {
    it('should handle storage errors gracefully on load', async () => {
      mocks.getCustomRoleAliases.mockRejectedValue(new Error('Storage error'));

      const { result } = renderHook(() => useCustomRoleAliases(mockContractId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.aliases).toEqual({});
    });

    it('should propagate storage errors on update', async () => {
      mocks.updateRoleAlias.mockRejectedValue(new Error('Storage error'));

      const { result } = renderHook(() => useCustomRoleAliases(mockContractId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.updateAlias('0xabc123', 'Minter');
        })
      ).rejects.toThrow('Storage error');
    });

    it('should propagate storage errors on clear', async () => {
      mocks.clearRoleAlias.mockRejectedValue(new Error('Storage error'));

      const { result } = renderHook(() => useCustomRoleAliases(mockContractId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.clearAlias('0xabc123');
        })
      ).rejects.toThrow('Storage error');
    });
  });
});
