/**
 * Tests for useRoleChangesPageData hook
 * Feature: 012-role-changes-data
 *
 * Tests the main orchestration hook that:
 * - Transforms history data to account-centric view
 * - Handles contract change auto-refresh
 * - Handles cursor-based pagination
 * - Handles unsupported contract states
 * - Combines loading/error states
 *
 * Tasks: T005
 */
import 'fake-indexeddb/auto';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  AccessControlCapabilities,
  HistoryEntry,
  PageInfo,
} from '@openzeppelin/ui-builder-types';

import { useRoleChangesPageData } from '../useRoleChangesPageData';

// =============================================================================
// Mock Setup
// =============================================================================

const mockCapabilitiesWithHistory: AccessControlCapabilities = {
  hasAccessControl: true,
  hasOwnable: true,
  hasEnumerableRoles: false,
  supportsHistory: true,
  verifiedAgainstOZInterfaces: true,
};

const mockCapabilitiesNoHistory: AccessControlCapabilities = {
  hasAccessControl: true,
  hasOwnable: true,
  hasEnumerableRoles: false,
  supportsHistory: false,
  verifiedAgainstOZInterfaces: true,
};

const mockHistoryEntries: HistoryEntry[] = [
  {
    role: { id: 'ADMIN_ROLE' },
    account: '0x1234567890123456789012345678901234567890',
    changeType: 'GRANTED',
    txId: '0xabc123',
    timestamp: '2024-02-15T10:00:00Z',
    ledger: 12345,
  },
  {
    role: { id: 'MINTER_ROLE' },
    account: '0xabcdef1234567890abcdef1234567890abcdef12',
    changeType: 'REVOKED',
    txId: '0xdef456',
    timestamp: '2024-02-14T10:00:00Z',
    ledger: 12344,
  },
  {
    role: { id: 'ADMIN_ROLE' },
    account: '0xowner1234567890123456789012345678901234',
    changeType: 'GRANTED',
    txId: '0xghi789',
    timestamp: '2024-02-13T10:00:00Z',
    ledger: 12343,
  },
];

const mockPageInfo: PageInfo = {
  hasNextPage: true,
  endCursor: 'cursor-123',
};

// Mock hooks
const mockUseSelectedContract = vi.fn();
const mockUseContractCapabilities = vi.fn();
const mockUseContractHistory = vi.fn();

vi.mock('../useSelectedContract', () => ({
  useSelectedContract: () => mockUseSelectedContract(),
}));

vi.mock('../useContractCapabilities', () => ({
  useContractCapabilities: (...args: unknown[]) => mockUseContractCapabilities(...args),
}));

vi.mock('../useContractHistory', () => ({
  useContractHistory: (...args: unknown[]) => mockUseContractHistory(...args),
  DEFAULT_PAGE_SIZE: 20,
}));

// =============================================================================
// Test Utilities
// =============================================================================

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function setupDefaultMocks() {
  mockUseSelectedContract.mockReturnValue({
    selectedContract: {
      id: 'contract-123',
      address: '0xcontract123',
      networkId: 'stellar-testnet',
      label: 'Test Contract',
    },
    adapter: {
      id: 'test-adapter',
      getExplorerUrl: vi.fn().mockReturnValue('https://explorer.example.com/address/0xcontract123'),
      getExplorerTxUrl: vi.fn(
        (txHash: string) => `https://explorer.example.com/transaction/${txHash}`
      ),
    },
    isAdapterLoading: false,
    isContractRegistered: true,
  });

  mockUseContractCapabilities.mockReturnValue({
    capabilities: mockCapabilitiesWithHistory,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    isSupported: true,
  });

  mockUseContractHistory.mockReturnValue({
    items: mockHistoryEntries,
    pageInfo: mockPageInfo,
    isLoading: false,
    isFetching: false,
    hasError: false,
    errorMessage: null,
    canRetry: false,
    refetch: vi.fn().mockResolvedValue(undefined),
  });
}

// =============================================================================
// Tests
// =============================================================================

describe('useRoleChangesPageData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Data Transformation
  // ===========================================================================

  describe('data transformation', () => {
    it('should transform history entries to event view models', async () => {
      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.events.length).toBe(mockHistoryEntries.length);
      expect(result.current.events[0]).toHaveProperty('id');
      expect(result.current.events[0]).toHaveProperty('timestamp');
      expect(result.current.events[0]).toHaveProperty('action');
      expect(result.current.events[0]).toHaveProperty('roleId');
      expect(result.current.events[0]).toHaveProperty('roleName');
      expect(result.current.events[0]).toHaveProperty('account');
    });

    it('should convert GRANTED to grant action', async () => {
      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const grantEvent = result.current.events.find((e) => e.action === 'grant');
      expect(grantEvent).toBeDefined();
    });

    it('should convert REVOKED to revoke action', async () => {
      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const revokeEvent = result.current.events.find((e) => e.action === 'revoke');
      expect(revokeEvent).toBeDefined();
    });

    it('should extract available roles from history entries', async () => {
      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.availableRoles.length).toBeGreaterThan(0);
      expect(result.current.availableRoles.some((r) => r.id === 'ADMIN_ROLE')).toBe(true);
      expect(result.current.availableRoles.some((r) => r.id === 'MINTER_ROLE')).toBe(true);
    });

    it('should generate transaction URLs when txId exists', async () => {
      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const eventWithTx = result.current.events.find((e) => e.transactionHash !== null);
      expect(eventWithTx?.transactionUrl).toBeTruthy();
    });
  });

  // ===========================================================================
  // Contract State
  // ===========================================================================

  describe('contract state', () => {
    it('should return hasContractSelected=true when contract is selected', async () => {
      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasContractSelected).toBe(true);
    });

    it('should return hasContractSelected=false when no contract selected', async () => {
      mockUseSelectedContract.mockReturnValue({
        selectedContract: null,
        adapter: null,
        isAdapterLoading: false,
        isContractRegistered: false,
      });

      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasContractSelected).toBe(false);
      expect(result.current.events).toEqual([]);
    });

    it('should return supportsHistory based on capabilities', async () => {
      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.supportsHistory).toBe(true);
    });

    it('should return supportsHistory=false when contract does not support history', async () => {
      mockUseContractCapabilities.mockReturnValue({
        capabilities: mockCapabilitiesNoHistory,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSupported: true,
      });

      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.supportsHistory).toBe(false);
    });

    it('should return isSupported based on capabilities', async () => {
      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isSupported).toBe(true);
    });

    it('should return isSupported=false for unsupported contracts', async () => {
      mockUseContractCapabilities.mockReturnValue({
        capabilities: null,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSupported: false,
      });

      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isSupported).toBe(false);
    });
  });

  // ===========================================================================
  // Filter Functionality
  // ===========================================================================

  describe('filter functionality', () => {
    it('should initialize with default filter state', async () => {
      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.filters.actionFilter).toBe('all');
      expect(result.current.filters.roleFilter).toBe('all');
    });

    it('should filter events by action type (client-side)', async () => {
      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCount = result.current.events.length;

      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          actionFilter: 'grant',
        });
      });

      // Should only show grant events
      expect(result.current.events.length).toBeLessThan(initialCount);
      expect(result.current.events.every((e) => e.action === 'grant')).toBe(true);
    });

    it('should filter events by revoke action', async () => {
      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          actionFilter: 'revoke',
        });
      });

      expect(result.current.events.every((e) => e.action === 'revoke')).toBe(true);
    });

    it('should reset filters with resetFilters', async () => {
      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Set filters
      act(() => {
        result.current.setFilters({
          actionFilter: 'grant',
          roleFilter: 'ADMIN_ROLE',
          searchQuery: '',
        });
      });

      expect(result.current.filters.actionFilter).toBe('grant');
      expect(result.current.filters.roleFilter).toBe('ADMIN_ROLE');

      // Reset
      act(() => {
        result.current.resetFilters();
      });

      expect(result.current.filters.actionFilter).toBe('all');
      expect(result.current.filters.roleFilter).toBe('all');
    });
  });

  // ===========================================================================
  // Contract Change Auto-Refresh
  // ===========================================================================

  describe('contract change auto-refresh', () => {
    it('should reset filters when contract changes', async () => {
      const { result, rerender } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Set filters
      act(() => {
        result.current.setFilters({
          actionFilter: 'grant',
          roleFilter: 'ADMIN_ROLE',
          searchQuery: '',
        });
      });

      expect(result.current.filters.actionFilter).toBe('grant');

      // Change contract
      mockUseSelectedContract.mockReturnValue({
        selectedContract: {
          id: 'contract-456',
          address: '0xnewcontract456',
          networkId: 'stellar-testnet',
          label: 'New Contract',
        },
        adapter: {
          id: 'test-adapter',
          getExplorerUrl: vi.fn().mockReturnValue('https://explorer.example.com/address/0xnew'),
          getExplorerTxUrl: vi.fn(
            (txHash: string) => `https://explorer.example.com/transaction/${txHash}`
          ),
        },
        isAdapterLoading: false,
        isContractRegistered: true,
      });

      rerender();

      // Filters should be reset
      await waitFor(() => {
        expect(result.current.filters.actionFilter).toBe('all');
        expect(result.current.filters.roleFilter).toBe('all');
      });
    });
  });

  // ===========================================================================
  // Pagination
  // ===========================================================================

  describe('pagination', () => {
    it('should expose pagination controls', async () => {
      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.pagination).toHaveProperty('hasNextPage');
      expect(result.current.pagination).toHaveProperty('hasPrevPage');
      expect(result.current.pagination).toHaveProperty('nextPage');
      expect(result.current.pagination).toHaveProperty('prevPage');
      expect(result.current.pagination).toHaveProperty('resetToFirst');
      expect(result.current.pagination).toHaveProperty('isLoading');
    });

    it('should have hasPrevPage=false on first page', async () => {
      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.pagination.hasPrevPage).toBe(false);
    });

    it('should provide nextPage function that can be called', async () => {
      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // nextPage should be callable without errors
      expect(() => {
        act(() => {
          result.current.pagination.nextPage();
        });
      }).not.toThrow();
    });

    it('should provide prevPage function that can be called', async () => {
      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // prevPage should be callable without errors
      expect(() => {
        act(() => {
          result.current.pagination.prevPage();
        });
      }).not.toThrow();
    });

    it('should provide resetToFirst function that resets to initial state', async () => {
      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Navigate (simulates going forward)
      act(() => {
        result.current.pagination.nextPage();
      });

      // Reset to first
      act(() => {
        result.current.pagination.resetToFirst();
      });

      // After reset, should have no previous page
      expect(result.current.pagination.hasPrevPage).toBe(false);
    });
  });

  // ===========================================================================
  // Loading States
  // ===========================================================================

  describe('loading states', () => {
    it('should return isLoading=true when capabilities are loading', async () => {
      mockUseContractCapabilities.mockReturnValue({
        capabilities: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
        isSupported: false,
      });

      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('should return isLoading=true when history is loading', async () => {
      mockUseContractHistory.mockReturnValue({
        items: [],
        pageInfo: { hasNextPage: false, endCursor: undefined },
        isLoading: true,
        isFetching: false,
        hasError: false,
        errorMessage: null,
        canRetry: false,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('should return isRefreshing=true when fetching but not initial load', async () => {
      mockUseContractHistory.mockReturnValue({
        items: mockHistoryEntries,
        pageInfo: mockPageInfo,
        isLoading: false,
        isFetching: true,
        hasError: false,
        errorMessage: null,
        canRetry: false,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isRefreshing).toBe(true);
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('error handling', () => {
    it('should return hasError=true when history fetch fails', async () => {
      mockUseContractHistory.mockReturnValue({
        items: [],
        pageInfo: { hasNextPage: false, endCursor: undefined },
        isLoading: false,
        isFetching: false,
        hasError: true,
        errorMessage: 'Failed to load history',
        canRetry: true,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasError).toBe(true);
      expect(result.current.errorMessage).toBe('Failed to load history');
      expect(result.current.canRetry).toBe(true);
    });

    it('should return hasError=true when capabilities fetch fails', async () => {
      mockUseContractCapabilities.mockReturnValue({
        capabilities: null,
        isLoading: false,
        error: new Error('Capabilities failed'),
        refetch: vi.fn(),
        isSupported: false,
      });

      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasError).toBe(true);
    });
  });

  // ===========================================================================
  // Refetch Functionality
  // ===========================================================================

  describe('refetch functionality', () => {
    it('should expose refetch function', async () => {
      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.refetch).toBeDefined();
      expect(typeof result.current.refetch).toBe('function');
    });

    it('should call history refetch on refetch', async () => {
      const mockRefetch = vi.fn().mockResolvedValue(undefined);
      mockUseContractHistory.mockReturnValue({
        items: mockHistoryEntries,
        pageInfo: mockPageInfo,
        isLoading: false,
        isFetching: false,
        hasError: false,
        errorMessage: null,
        canRetry: false,
        refetch: mockRefetch,
      });

      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Empty States
  // ===========================================================================

  describe('empty states', () => {
    it('should return empty events when history is empty', async () => {
      mockUseContractHistory.mockReturnValue({
        items: [],
        pageInfo: { hasNextPage: false, endCursor: undefined },
        isLoading: false,
        isFetching: false,
        hasError: false,
        errorMessage: null,
        canRetry: false,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.events).toEqual([]);
      expect(result.current.availableRoles).toEqual([]);
    });

    it('should return empty state for no contract selected', async () => {
      mockUseSelectedContract.mockReturnValue({
        selectedContract: null,
        adapter: null,
        isAdapterLoading: false,
        isContractRegistered: false,
      });

      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.events).toEqual([]);
      expect(result.current.availableRoles).toEqual([]);
      expect(result.current.hasContractSelected).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);
    });
  });

  // ===========================================================================
  // Return Type Interface
  // ===========================================================================

  describe('return type interface', () => {
    it('should match UseRoleChangesPageDataReturn interface', async () => {
      const { result } = renderHook(() => useRoleChangesPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Event Data
      expect(result.current).toHaveProperty('events');
      expect(result.current).toHaveProperty('availableRoles');

      // Filter State
      expect(result.current).toHaveProperty('filters');
      expect(result.current).toHaveProperty('setFilters');
      expect(result.current).toHaveProperty('resetFilters');

      // Pagination
      expect(result.current).toHaveProperty('pagination');

      // Contract State
      expect(result.current).toHaveProperty('hasContractSelected');
      expect(result.current).toHaveProperty('supportsHistory');
      expect(result.current).toHaveProperty('isSupported');

      // Loading States
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isRefreshing');

      // Error States
      expect(result.current).toHaveProperty('hasError');
      expect(result.current).toHaveProperty('errorMessage');
      expect(result.current).toHaveProperty('canRetry');

      // Actions
      expect(result.current).toHaveProperty('refetch');

      // Type checks
      expect(Array.isArray(result.current.events)).toBe(true);
      expect(Array.isArray(result.current.availableRoles)).toBe(true);
      expect(typeof result.current.filters).toBe('object');
      expect(typeof result.current.setFilters).toBe('function');
      expect(typeof result.current.resetFilters).toBe('function');
      expect(typeof result.current.pagination).toBe('object');
      expect(typeof result.current.hasContractSelected).toBe('boolean');
      expect(typeof result.current.supportsHistory).toBe('boolean');
      expect(typeof result.current.isSupported).toBe('boolean');
      expect(typeof result.current.isLoading).toBe('boolean');
      expect(typeof result.current.isRefreshing).toBe('boolean');
      expect(typeof result.current.hasError).toBe('boolean');
      expect(typeof result.current.canRetry).toBe('boolean');
      expect(typeof result.current.refetch).toBe('function');
    });
  });
});
