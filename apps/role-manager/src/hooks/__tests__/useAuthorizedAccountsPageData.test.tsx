/**
 * Tests for useAuthorizedAccountsPageData hook
 * Feature: 011-accounts-real-data
 *
 * TDD tests for the main orchestration hook that:
 * - Transforms role data to account-centric view
 * - Handles contract change auto-refresh
 * - Handles unsupported contract states
 *
 * Tasks: T023, T024, T025, T026
 */
import 'fake-indexeddb/auto';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AccessControlCapabilities, OwnershipInfo } from '@openzeppelin/ui-types';

import type { EnrichedRoleAssignment } from '../../types/authorized-accounts';
import { useAuthorizedAccountsPageData } from '../useAuthorizedAccountsPageData';

// =============================================================================
// Mock Setup
// =============================================================================

const mockCapabilities: AccessControlCapabilities = {
  hasAccessControl: true,
  hasOwnable: true,
  hasEnumerableRoles: false,
  supportsHistory: false,
  verifiedAgainstOZInterfaces: true,
};

const mockEnrichedRoles: EnrichedRoleAssignment[] = [
  {
    role: { id: 'ADMIN_ROLE', label: 'Admin' },
    members: [
      {
        address: '0x1234567890123456789012345678901234567890',
        grantedAt: '2024-02-15T10:00:00Z',
      },
    ],
  },
  {
    role: { id: 'MINTER_ROLE', label: 'Minter' },
    members: [
      {
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
        grantedAt: '2024-01-01T10:00:00Z',
      },
      {
        address: '0x1234567890123456789012345678901234567890',
        grantedAt: '2024-01-20T10:00:00Z',
      },
    ],
  },
];

const mockOwnership: OwnershipInfo = {
  owner: '0xowner1234567890123456789012345678901234',
};

// Mock hooks
const mockUseSelectedContract = vi.fn();
const mockUseContractCapabilities = vi.fn();
const mockUseContractRolesEnriched = vi.fn();
const mockUseContractOwnership = vi.fn();

vi.mock('../useSelectedContract', () => ({
  useSelectedContract: () => mockUseSelectedContract(),
}));

vi.mock('../useContractCapabilities', () => ({
  useContractCapabilities: (...args: unknown[]) => mockUseContractCapabilities(...args),
}));

vi.mock('../useContractRolesEnriched', () => ({
  useContractRolesEnriched: (...args: unknown[]) => mockUseContractRolesEnriched(...args),
}));

vi.mock('../useContractData', () => ({
  useContractOwnership: (...args: unknown[]) => mockUseContractOwnership(...args),
  useContractAdminInfo: () => ({
    adminInfo: null,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
    hasAdmin: false,
    canRetry: false,
    errorMessage: null,
    hasError: false,
  }),
}));

// Mock useDerivedAccountStatus from react-core (spec 013)
const mockUseDerivedAccountStatus = vi.fn();

vi.mock('@openzeppelin/ui-react', () => ({
  useDerivedAccountStatus: () => mockUseDerivedAccountStatus(),
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
      networkId: 'ethereum-mainnet',
      label: 'Test Contract',
    },
    adapter: { id: 'test-adapter' },
    isAdapterLoading: false,
    isContractRegistered: true,
  });

  mockUseContractCapabilities.mockReturnValue({
    capabilities: mockCapabilities,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    isSupported: true,
  });

  mockUseContractRolesEnriched.mockReturnValue({
    roles: mockEnrichedRoles,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn().mockResolvedValue(undefined),
    isEmpty: false,
    hasError: false,
    canRetry: false,
    errorMessage: null,
  });

  mockUseContractOwnership.mockReturnValue({
    ownership: mockOwnership,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn().mockResolvedValue(undefined),
    hasOwner: true,
    hasError: false,
    canRetry: false,
    errorMessage: null,
  });

  // Default: no wallet connected
  mockUseDerivedAccountStatus.mockReturnValue({
    isConnected: false,
    address: undefined,
    chainId: undefined,
  });
}

// =============================================================================
// T023: Test file creation for useAuthorizedAccountsPageData
// =============================================================================

describe('useAuthorizedAccountsPageData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // T024: Test cases for data transformation integration
  // ===========================================================================

  describe('data transformation integration (T024)', () => {
    it('should transform role-centric data to account-centric view', async () => {
      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have unique accounts aggregated
      // Account 0x1234... has both ADMIN_ROLE and MINTER_ROLE
      const multiRoleAccount = result.current.allAccounts.find((a) =>
        a.address.includes('1234567890123456789012345678901234567890')
      );
      expect(multiRoleAccount).toBeDefined();
      expect(multiRoleAccount?.roles).toHaveLength(2);
    });

    it('should include owner as account with OWNER_ROLE', async () => {
      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const ownerAccount = result.current.allAccounts.find((a) =>
        a.address.includes('owner1234567890123456789012345678901234')
      );
      expect(ownerAccount).toBeDefined();
      expect(ownerAccount?.roles.some((r) => r.id === 'OWNER_ROLE')).toBe(true);
    });

    it('should use earliest grantedAt as dateAdded for multi-role accounts', async () => {
      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Account 0x1234... has ADMIN (Feb 15) and MINTER (Jan 20) roles
      // Should use Jan 20 as earliest
      const multiRoleAccount = result.current.allAccounts.find((a) =>
        a.address.includes('1234567890123456789012345678901234567890')
      );
      expect(multiRoleAccount?.dateAdded).toBe('2024-01-20T10:00:00Z');
    });

    it('should extract available roles for filter dropdown', async () => {
      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.availableRoles.length).toBeGreaterThan(0);
      expect(result.current.availableRoles.some((r) => r.id === 'ADMIN_ROLE')).toBe(true);
      expect(result.current.availableRoles.some((r) => r.id === 'MINTER_ROLE')).toBe(true);
    });

    it('should sort accounts by dateAdded (newest first)', async () => {
      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const timestampedAccounts = result.current.allAccounts.filter((a) => a.dateAdded !== null);
      if (timestampedAccounts.length >= 2) {
        // First account should be newer than second
        expect(new Date(timestampedAccounts[0].dateAdded!).getTime()).toBeGreaterThanOrEqual(
          new Date(timestampedAccounts[1].dateAdded!).getTime()
        );
      }
    });
  });

  // ===========================================================================
  // T025: Test cases for contract change auto-refresh
  // ===========================================================================

  describe('contract change auto-refresh (T025)', () => {
    it('should reset filters when contract changes', async () => {
      const { result, rerender } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Set a filter
      act(() => {
        result.current.setFilters({
          searchQuery: 'test',
          statusFilter: 'active',
          roleFilter: 'ADMIN_ROLE',
        });
      });

      expect(result.current.filters.searchQuery).toBe('test');

      // Change contract
      mockUseSelectedContract.mockReturnValue({
        selectedContract: {
          id: 'contract-456',
          address: '0xnewcontract456',
          networkId: 'ethereum-mainnet',
          label: 'New Contract',
        },
        adapter: { id: 'test-adapter' },
        isAdapterLoading: false,
        isContractRegistered: true,
      });

      rerender();

      // Filters should be reset
      await waitFor(() => {
        expect(result.current.filters.searchQuery).toBe('');
        expect(result.current.filters.statusFilter).toBe('all');
        expect(result.current.filters.roleFilter).toBe('all');
      });
    });

    it('should reset pagination when contract changes', async () => {
      const { result, rerender } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Go to page 2
      act(() => {
        result.current.pagination.goToPage(2);
      });

      // Change contract
      mockUseSelectedContract.mockReturnValue({
        selectedContract: {
          id: 'contract-456',
          address: '0xnewcontract456',
          networkId: 'ethereum-mainnet',
          label: 'New Contract',
        },
        adapter: { id: 'test-adapter' },
        isAdapterLoading: false,
        isContractRegistered: true,
      });

      rerender();

      // Page should be reset to 1
      await waitFor(() => {
        expect(result.current.pagination.currentPage).toBe(1);
      });
    });

    it('should reset pagination when filters change', async () => {
      // Create many accounts to have multiple pages
      const manyRoles: EnrichedRoleAssignment[] = [];
      for (let i = 0; i < 15; i++) {
        manyRoles.push({
          role: { id: `ROLE_${i}`, label: `Role ${i}` },
          members: [{ address: `0x${i.toString().padStart(40, '0')}` }],
        });
      }

      mockUseContractRolesEnriched.mockReturnValue({
        roles: manyRoles,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
        isEmpty: false,
        hasError: false,
        canRetry: false,
        errorMessage: null,
      });

      mockUseContractOwnership.mockReturnValue({
        ownership: null,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
        hasOwner: false,
        hasError: false,
        canRetry: false,
        errorMessage: null,
      });

      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify we have multiple pages
      expect(result.current.pagination.totalPages).toBe(2);

      // Go to page 2
      act(() => {
        result.current.pagination.nextPage();
      });

      expect(result.current.pagination.currentPage).toBe(2);

      // Change filter
      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          searchQuery: 'test',
        });
      });

      // Page should be reset to 1
      expect(result.current.pagination.currentPage).toBe(1);
    });
  });

  // ===========================================================================
  // T026: Test cases for unsupported contract handling
  // ===========================================================================

  describe('unsupported contract handling (T026)', () => {
    it('should return isSupported=false when contract lacks AccessControl', async () => {
      mockUseContractCapabilities.mockReturnValue({
        capabilities: {
          hasAccessControl: false,
          hasOwnable: false,
          hasEnumerableRoles: false,
          supportsHistory: false,
          verifiedAgainstOZInterfaces: false,
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSupported: false,
      });

      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isSupported).toBe(false);
    });

    it('should return empty accounts for unsupported contracts', async () => {
      mockUseContractCapabilities.mockReturnValue({
        capabilities: null,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSupported: false,
      });

      mockUseContractRolesEnriched.mockReturnValue({
        roles: [],
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        isEmpty: true,
        hasError: false,
        canRetry: false,
        errorMessage: null,
      });

      mockUseContractOwnership.mockReturnValue({
        ownership: null,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        hasOwner: false,
        hasError: false,
        canRetry: false,
        errorMessage: null,
      });

      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.allAccounts).toEqual([]);
      expect(result.current.paginatedAccounts).toEqual([]);
    });

    it('should handle no selected contract gracefully', async () => {
      mockUseSelectedContract.mockReturnValue({
        selectedContract: null,
        adapter: null,
        isAdapterLoading: false,
        isContractRegistered: false,
      });

      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isSupported).toBe(false);
      expect(result.current.allAccounts).toEqual([]);
      expect(result.current.hasError).toBe(false);
    });
  });

  describe('loading states', () => {
    it('should return isLoading=true when capabilities are loading', async () => {
      mockUseContractCapabilities.mockReturnValue({
        capabilities: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
        isSupported: false,
      });

      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('should return isLoading=true when roles are loading', async () => {
      mockUseContractRolesEnriched.mockReturnValue({
        roles: [],
        isLoading: true,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        isEmpty: true,
        hasError: false,
        canRetry: false,
        errorMessage: null,
      });

      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('should return isRefreshing=true when fetching but not initial load', async () => {
      mockUseContractRolesEnriched.mockReturnValue({
        roles: mockEnrichedRoles,
        isLoading: false,
        isFetching: true,
        error: null,
        refetch: vi.fn(),
        isEmpty: false,
        hasError: false,
        canRetry: false,
        errorMessage: null,
      });

      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isRefreshing).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should return hasError=true when roles fetch fails', async () => {
      mockUseContractRolesEnriched.mockReturnValue({
        roles: [],
        isLoading: false,
        isFetching: false,
        error: new Error('Failed'),
        refetch: vi.fn(),
        isEmpty: true,
        hasError: true,
        canRetry: true,
        errorMessage: 'Failed to load roles',
      });

      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasError).toBe(true);
      expect(result.current.errorMessage).toBe('Failed to load roles');
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

      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      expect(result.current.hasError).toBe(true);
    });
  });

  describe('refetch functionality', () => {
    it('should expose refetch function', async () => {
      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.refetch).toBeDefined();
      expect(typeof result.current.refetch).toBe('function');
    });

    it('should call refetch on all underlying hooks', async () => {
      const mockRolesRefetch = vi.fn().mockResolvedValue(undefined);
      const mockOwnershipRefetch = vi.fn().mockResolvedValue(undefined);

      mockUseContractRolesEnriched.mockReturnValue({
        roles: mockEnrichedRoles,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: mockRolesRefetch,
        isEmpty: false,
        hasError: false,
        canRetry: false,
        errorMessage: null,
      });

      mockUseContractOwnership.mockReturnValue({
        ownership: mockOwnership,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: mockOwnershipRefetch,
        hasOwner: true,
        hasError: false,
        canRetry: false,
        errorMessage: null,
      });

      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockRolesRefetch).toHaveBeenCalled();
      expect(mockOwnershipRefetch).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // T056: Test cases for pagination controls visibility
  // ===========================================================================

  describe('pagination controls visibility (T056)', () => {
    it('should hide pagination controls when totalItems <= pageSize', async () => {
      // Only 3 accounts (less than page size of 10)
      const fewRoles: EnrichedRoleAssignment[] = [
        {
          role: { id: 'ROLE_1', label: 'Role 1' },
          members: [{ address: '0x1111111111111111111111111111111111111111' }],
        },
        {
          role: { id: 'ROLE_2', label: 'Role 2' },
          members: [{ address: '0x2222222222222222222222222222222222222222' }],
        },
        {
          role: { id: 'ROLE_3', label: 'Role 3' },
          members: [{ address: '0x3333333333333333333333333333333333333333' }],
        },
      ];

      mockUseContractRolesEnriched.mockReturnValue({
        roles: fewRoles,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
        isEmpty: false,
        hasError: false,
        canRetry: false,
        errorMessage: null,
      });

      mockUseContractOwnership.mockReturnValue({
        ownership: null,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
        hasOwner: false,
        hasError: false,
        canRetry: false,
        errorMessage: null,
      });

      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // With only 3 items and page size of 10, should show 1 page
      expect(result.current.pagination.totalItems).toBe(3);
      expect(result.current.pagination.pageSize).toBe(10);
      expect(result.current.pagination.totalPages).toBe(1);
      expect(result.current.pagination.hasNextPage).toBe(false);
      expect(result.current.pagination.hasPreviousPage).toBe(false);
    });

    it('should show pagination controls when totalItems > pageSize', async () => {
      // Create 15 accounts (more than page size of 10)
      const manyRoles: EnrichedRoleAssignment[] = [];
      for (let i = 0; i < 15; i++) {
        manyRoles.push({
          role: { id: `ROLE_${i}`, label: `Role ${i}` },
          members: [{ address: `0x${i.toString().padStart(40, '0')}` }],
        });
      }

      mockUseContractRolesEnriched.mockReturnValue({
        roles: manyRoles,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
        isEmpty: false,
        hasError: false,
        canRetry: false,
        errorMessage: null,
      });

      mockUseContractOwnership.mockReturnValue({
        ownership: null,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
        hasOwner: false,
        hasError: false,
        canRetry: false,
        errorMessage: null,
      });

      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // With 15 items and page size of 10, should show 2 pages
      expect(result.current.pagination.totalItems).toBe(15);
      expect(result.current.pagination.pageSize).toBe(10);
      expect(result.current.pagination.totalPages).toBe(2);
      expect(result.current.pagination.hasNextPage).toBe(true);
      expect(result.current.pagination.hasPreviousPage).toBe(false);
    });

    it('should return correct visibility flag when exactly at pageSize boundary', async () => {
      // Create exactly 10 accounts (equal to page size)
      const exactRoles: EnrichedRoleAssignment[] = [];
      for (let i = 0; i < 10; i++) {
        exactRoles.push({
          role: { id: `ROLE_${i}`, label: `Role ${i}` },
          members: [{ address: `0x${i.toString().padStart(40, '0')}` }],
        });
      }

      mockUseContractRolesEnriched.mockReturnValue({
        roles: exactRoles,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
        isEmpty: false,
        hasError: false,
        canRetry: false,
        errorMessage: null,
      });

      mockUseContractOwnership.mockReturnValue({
        ownership: null,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
        hasOwner: false,
        hasError: false,
        canRetry: false,
        errorMessage: null,
      });

      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // With exactly 10 items and page size of 10, should show 1 page (no pagination needed)
      expect(result.current.pagination.totalItems).toBe(10);
      expect(result.current.pagination.totalPages).toBe(1);
      expect(result.current.pagination.hasNextPage).toBe(false);
      expect(result.current.pagination.hasPreviousPage).toBe(false);
    });
  });

  describe('pagination', () => {
    it('should paginate accounts correctly', async () => {
      // Create 15 mock accounts
      const manyRoles: EnrichedRoleAssignment[] = [];
      for (let i = 0; i < 15; i++) {
        manyRoles.push({
          role: { id: `ROLE_${i}`, label: `Role ${i}` },
          members: [{ address: `0x${i.toString().padStart(40, '0')}` }],
        });
      }

      mockUseContractRolesEnriched.mockReturnValue({
        roles: manyRoles,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        isEmpty: false,
        hasError: false,
        canRetry: false,
        errorMessage: null,
      });

      mockUseContractOwnership.mockReturnValue({
        ownership: null,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        hasOwner: false,
        hasError: false,
        canRetry: false,
        errorMessage: null,
      });

      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Default page size is 10
      expect(result.current.paginatedAccounts.length).toBeLessThanOrEqual(10);
      expect(result.current.pagination.totalPages).toBe(2);
      expect(result.current.pagination.hasNextPage).toBe(true);
    });

    it('should navigate between pages', async () => {
      // Create 15 mock accounts
      const manyRoles: EnrichedRoleAssignment[] = [];
      for (let i = 0; i < 15; i++) {
        manyRoles.push({
          role: { id: `ROLE_${i}`, label: `Role ${i}` },
          members: [{ address: `0x${i.toString().padStart(40, '0')}` }],
        });
      }

      mockUseContractRolesEnriched.mockReturnValue({
        roles: manyRoles,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        isEmpty: false,
        hasError: false,
        canRetry: false,
        errorMessage: null,
      });

      mockUseContractOwnership.mockReturnValue({
        ownership: null,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        hasOwner: false,
        hasError: false,
        canRetry: false,
        errorMessage: null,
      });

      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.pagination.currentPage).toBe(1);

      act(() => {
        result.current.pagination.nextPage();
      });

      expect(result.current.pagination.currentPage).toBe(2);
      expect(result.current.pagination.hasPreviousPage).toBe(true);
      expect(result.current.pagination.hasNextPage).toBe(false);
    });
  });

  describe('filter functionality', () => {
    it('should apply search filter', async () => {
      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCount = result.current.allAccounts.length;

      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          searchQuery: 'abcdef',
        });
      });

      expect(result.current.allAccounts.length).toBeLessThan(initialCount);
    });

    it('should reset filters with resetFilters', async () => {
      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setFilters({
          searchQuery: 'test',
          statusFilter: 'active',
          roleFilter: 'ADMIN_ROLE',
        });
      });

      act(() => {
        result.current.resetFilters();
      });

      expect(result.current.filters.searchQuery).toBe('');
      expect(result.current.filters.statusFilter).toBe('all');
      expect(result.current.filters.roleFilter).toBe('all');
    });
  });

  // ===========================================================================
  // T046: Test cases for search filter functionality
  // ===========================================================================

  describe('search filter functionality (T046)', () => {
    it('should filter accounts by partial address match', async () => {
      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Get initial count
      const initialCount = result.current.allAccounts.length;
      expect(initialCount).toBeGreaterThan(0);

      // Search for partial address (use a prefix unique to one account)
      // 0xabcdef... is unique to the minter account
      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          searchQuery: '0xabcdef12345678',
        });
      });

      // Should find only the account with 0xabcdef...
      expect(result.current.allAccounts.length).toBeLessThan(initialCount);
      expect(result.current.allAccounts.length).toBe(1);
      expect(result.current.allAccounts[0].address.toLowerCase()).toContain('abcdef');
    });

    it('should perform case-insensitive search', async () => {
      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Search with uppercase
      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          searchQuery: 'ABCDEF',
        });
      });

      const uppercaseResults = result.current.allAccounts.length;

      // Reset filters
      act(() => {
        result.current.resetFilters();
      });

      // Search with lowercase
      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          searchQuery: 'abcdef',
        });
      });

      const lowercaseResults = result.current.allAccounts.length;

      // Should return same results regardless of case
      expect(uppercaseResults).toBe(lowercaseResults);
    });

    it('should return empty results for non-matching search query', async () => {
      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          searchQuery: 'nonexistent_address_xyz',
        });
      });

      expect(result.current.allAccounts.length).toBe(0);
    });

    it('should return all accounts when search query is empty', async () => {
      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCount = result.current.allAccounts.length;

      // Set and then clear search query
      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          searchQuery: 'abcdef',
        });
      });

      const filteredCount = result.current.allAccounts.length;
      expect(filteredCount).toBeLessThan(initialCount);

      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          searchQuery: '',
        });
      });

      expect(result.current.allAccounts.length).toBe(initialCount);
    });
  });

  // ===========================================================================
  // T047: Test cases for role filter functionality
  // ===========================================================================

  describe('role filter functionality (T047)', () => {
    it('should filter accounts by specific role', async () => {
      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Filter by ADMIN_ROLE
      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          roleFilter: 'ADMIN_ROLE',
        });
      });

      // All accounts should have ADMIN_ROLE
      expect(result.current.allAccounts.length).toBeGreaterThan(0);
      expect(
        result.current.allAccounts.every((a) => a.roles.some((r) => r.id === 'ADMIN_ROLE'))
      ).toBe(true);
    });

    it('should filter accounts by MINTER_ROLE', async () => {
      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Filter by MINTER_ROLE
      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          roleFilter: 'MINTER_ROLE',
        });
      });

      // All accounts should have MINTER_ROLE
      expect(result.current.allAccounts.length).toBeGreaterThan(0);
      expect(
        result.current.allAccounts.every((a) => a.roles.some((r) => r.id === 'MINTER_ROLE'))
      ).toBe(true);
    });

    it('should show all accounts when roleFilter is "all"', async () => {
      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const allAccountsCount = result.current.allAccounts.length;

      // Apply role filter
      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          roleFilter: 'ADMIN_ROLE',
        });
      });

      const filteredCount = result.current.allAccounts.length;
      expect(filteredCount).toBeLessThan(allAccountsCount);

      // Reset to 'all'
      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          roleFilter: 'all',
        });
      });

      expect(result.current.allAccounts.length).toBe(allAccountsCount);
    });

    it('should return empty results for non-existent role', async () => {
      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          roleFilter: 'NON_EXISTENT_ROLE',
        });
      });

      expect(result.current.allAccounts.length).toBe(0);
    });

    it('should include multi-role accounts when filtering by any of their roles', async () => {
      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Account 0x1234... has both ADMIN_ROLE and MINTER_ROLE
      // Should appear in both filtered results

      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          roleFilter: 'ADMIN_ROLE',
        });
      });

      const adminFiltered = result.current.allAccounts.find((a) =>
        a.address.includes('1234567890123456789012345678901234567890')
      );
      expect(adminFiltered).toBeDefined();

      act(() => {
        result.current.setFilters({
          ...result.current.filters,
          roleFilter: 'MINTER_ROLE',
        });
      });

      const minterFiltered = result.current.allAccounts.find((a) =>
        a.address.includes('1234567890123456789012345678901234567890')
      );
      expect(minterFiltered).toBeDefined();
    });
  });

  // ===========================================================================
  // T048: Test cases for combined filter AND logic
  // ===========================================================================

  describe('combined filter AND logic (T048)', () => {
    it('should combine search and role filters with AND logic', async () => {
      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Apply both search and role filter
      act(() => {
        result.current.setFilters({
          searchQuery: '1234',
          statusFilter: 'all',
          roleFilter: 'MINTER_ROLE',
        });
      });

      // Account must match BOTH criteria
      expect(result.current.allAccounts.length).toBeGreaterThan(0);
      expect(
        result.current.allAccounts.every(
          (a) =>
            a.address.toLowerCase().includes('1234') && a.roles.some((r) => r.id === 'MINTER_ROLE')
        )
      ).toBe(true);
    });

    it('should return empty when combined filters have no matches', async () => {
      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Search for owner address but filter by ADMIN_ROLE
      // Owner doesn't have ADMIN_ROLE, so should return empty
      act(() => {
        result.current.setFilters({
          searchQuery: 'owner1234',
          statusFilter: 'all',
          roleFilter: 'ADMIN_ROLE',
        });
      });

      expect(result.current.allAccounts.length).toBe(0);
    });

    it('should combine search, status, and role filters with AND logic', async () => {
      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // All three filters applied
      act(() => {
        result.current.setFilters({
          searchQuery: '1234',
          statusFilter: 'active',
          roleFilter: 'ADMIN_ROLE',
        });
      });

      // Results must match ALL three criteria
      expect(
        result.current.allAccounts.every(
          (a) =>
            a.address.toLowerCase().includes('1234') &&
            a.status === 'active' &&
            a.roles.some((r) => r.id === 'ADMIN_ROLE')
        )
      ).toBe(true);
    });

    it('should progressively narrow results as filters are added', async () => {
      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const noFilterCount = result.current.allAccounts.length;

      // Add search filter
      act(() => {
        result.current.setFilters({
          searchQuery: '',
          statusFilter: 'all',
          roleFilter: 'MINTER_ROLE',
        });
      });

      const roleFilterCount = result.current.allAccounts.length;
      expect(roleFilterCount).toBeLessThanOrEqual(noFilterCount);

      // Add search filter on top of role filter
      act(() => {
        result.current.setFilters({
          searchQuery: 'abcdef',
          statusFilter: 'all',
          roleFilter: 'MINTER_ROLE',
        });
      });

      const combinedFilterCount = result.current.allAccounts.length;
      expect(combinedFilterCount).toBeLessThanOrEqual(roleFilterCount);
    });

    it('should work correctly with status filter', async () => {
      const { result } = renderHook(() => useAuthorizedAccountsPageData(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // All accounts are 'active' in mock data
      act(() => {
        result.current.setFilters({
          searchQuery: '',
          statusFilter: 'active',
          roleFilter: 'all',
        });
      });

      const activeCount = result.current.allAccounts.length;
      expect(activeCount).toBeGreaterThan(0);

      // Filter by 'pending' - no mock accounts have this status
      act(() => {
        result.current.setFilters({
          searchQuery: '',
          statusFilter: 'pending',
          roleFilter: 'all',
        });
      });

      expect(result.current.allAccounts.length).toBe(0);
    });
  });
});
