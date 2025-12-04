/**
 * Tests for useContractData hooks (useContractRoles, useContractOwnership)
 * Feature: 006-access-control-service
 *
 * Tests the data fetching hooks for roles and ownership information.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';

import type {
  AccessControlService,
  ContractAdapter,
  NetworkConfig,
  OwnershipInfo,
  RoleAssignment,
} from '@openzeppelin/ui-builder-types';

import { DataError, ErrorCategory } from '../../utils/errors';
import { useContractOwnership, useContractRoles, usePaginatedRoles } from '../useContractData';

// Test fixtures
const mockNetworkConfig: NetworkConfig = {
  id: 'stellar-testnet',
  name: 'Stellar Testnet',
  ecosystem: 'stellar',
  network: 'stellar',
  type: 'testnet',
  isTestnet: true,
} as NetworkConfig;

const mockRolesWithMembers: RoleAssignment[] = [
  {
    role: { id: 'admin', label: 'Admin' },
    members: ['0x1111111111111111111111111111111111111111'],
  },
  {
    role: { id: 'minter', label: 'Minter' },
    members: [
      '0x2222222222222222222222222222222222222222',
      '0x3333333333333333333333333333333333333333',
    ],
  },
  {
    role: { id: 'pauser', label: 'Pauser' },
    members: [],
  },
];

const mockEmptyRoles: RoleAssignment[] = [];

const mockLargeRoleList: RoleAssignment[] = Array.from({ length: 50 }, (_, i) => ({
  role: { id: `role_${i}`, label: `Role ${i}` },
  members: [`0x${String(i).padStart(40, '0')}`],
}));

const mockOwnership: OwnershipInfo = {
  owner: '0x4444444444444444444444444444444444444444',
};

const mockOwnershipNull: OwnershipInfo = {
  owner: null,
};

// Create mock AccessControlService factory
const createMockAccessControlService = (
  overrides?: Partial<AccessControlService>
): AccessControlService =>
  ({
    getCapabilities: vi.fn().mockResolvedValue({
      hasOwnable: true,
      hasAccessControl: true,
      hasEnumerableRoles: true,
      supportsHistory: false,
      verifiedAgainstOZInterfaces: true,
      notes: [],
    }),
    getCurrentRoles: vi.fn().mockResolvedValue(mockRolesWithMembers),
    getOwnership: vi.fn().mockResolvedValue(mockOwnership),
    grantRole: vi.fn().mockResolvedValue({ id: 'tx-123' }),
    revokeRole: vi.fn().mockResolvedValue({ id: 'tx-456' }),
    transferOwnership: vi.fn().mockResolvedValue({ id: 'tx-789' }),
    exportSnapshot: vi.fn().mockResolvedValue({ roles: [], ownership: { owner: null } }),
    getHistory: vi.fn().mockResolvedValue([]),
    ...overrides,
  }) as AccessControlService;

// Create mock adapter factory
const createMockAdapter = (accessControlService?: AccessControlService | null): ContractAdapter => {
  const mockService =
    accessControlService === null
      ? undefined
      : (accessControlService ?? createMockAccessControlService());

  return {
    networkConfig: mockNetworkConfig,
    isValidAddress: vi.fn().mockReturnValue(true),
    getAccessControlService: mockService ? vi.fn().mockReturnValue(mockService) : undefined,
  } as unknown as ContractAdapter;
};

// React Query wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

describe('useContractRoles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return empty roles and not loading when adapter is null', () => {
      const { result } = renderHook(() => useContractRoles(null, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      expect(result.current.roles).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should return empty roles when address is empty', () => {
      const mockAdapter = createMockAdapter();
      const { result } = renderHook(() => useContractRoles(mockAdapter, ''), {
        wrapper: createWrapper(),
      });

      expect(result.current.roles).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('should return empty roles when adapter does not support access control', () => {
      const mockAdapter = createMockAdapter(null);
      const { result } = renderHook(() => useContractRoles(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      expect(result.current.roles).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('successful role fetching', () => {
    it('should fetch roles for a valid contract', async () => {
      const mockService = createMockAccessControlService();
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => useContractRoles(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.roles).toEqual(mockRolesWithMembers);
      expect(result.current.error).toBeNull();
      expect(mockService.getCurrentRoles).toHaveBeenCalledWith('CONTRACT_ADDRESS');
    });

    it('should handle contracts with no roles', async () => {
      const mockService = createMockAccessControlService({
        getCurrentRoles: vi.fn().mockResolvedValue(mockEmptyRoles),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => useContractRoles(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.roles).toEqual([]);
      expect(result.current.isEmpty).toBe(true);
    });

    it('should calculate total member count correctly', async () => {
      const mockService = createMockAccessControlService();
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => useContractRoles(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // mockRolesWithMembers has 1 + 2 + 0 = 3 total members
      expect(result.current.totalMemberCount).toBe(3);
    });
  });

  describe('error handling', () => {
    it('should set error state when getCurrentRoles fails', async () => {
      const mockService = createMockAccessControlService({
        getCurrentRoles: vi.fn().mockRejectedValue(new Error('Network error')),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => useContractRoles(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(DataError);
      expect(result.current.hasError).toBe(true);
      expect(result.current.canRetry).toBe(true);
      expect(result.current.errorMessage).toBeTruthy();
      expect(result.current.roles).toEqual([]);
    });

    it('should handle partial data error (indexer down)', async () => {
      const mockService = createMockAccessControlService({
        getCurrentRoles: vi.fn().mockRejectedValue(new Error('Indexer unavailable')),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => useContractRoles(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.category).toBe(ErrorCategory.INDEXER_UNAVAILABLE);
      expect(result.current.hasError).toBe(true);
      expect(result.current.canRetry).toBe(true);
    });

    it('should categorize network errors correctly', async () => {
      const mockService = createMockAccessControlService({
        getCurrentRoles: vi.fn().mockRejectedValue(new Error('Network timeout')),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => useContractRoles(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.category).toBe(ErrorCategory.NETWORK_ERROR);
      expect(result.current.canRetry).toBe(true);
    });

    it('should provide user-friendly error message', async () => {
      const mockService = createMockAccessControlService({
        getCurrentRoles: vi.fn().mockRejectedValue(new Error('Indexer unavailable')),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => useContractRoles(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.errorMessage).toContain('indexer');
    });
  });

  describe('refetch functionality', () => {
    it('should provide refetch function', async () => {
      const mockService = createMockAccessControlService();
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => useContractRoles(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');

      // Trigger refetch
      await act(async () => {
        await result.current.refetch();
      });

      // Should have been called twice (initial + refetch)
      expect(mockService.getCurrentRoles).toHaveBeenCalledTimes(2);
    });
  });

  describe('query key management', () => {
    it('should refetch when contract address changes', async () => {
      const mockService = createMockAccessControlService();
      const mockAdapter = createMockAdapter(mockService);

      const { result, rerender } = renderHook(
        ({ address }) => useContractRoles(mockAdapter, address),
        {
          wrapper: createWrapper(),
          initialProps: { address: 'CONTRACT_A' },
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockService.getCurrentRoles).toHaveBeenCalledWith('CONTRACT_A');

      // Change address
      rerender({ address: 'CONTRACT_B' });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockService.getCurrentRoles).toHaveBeenCalledWith('CONTRACT_B');
    });
  });

  describe('return type interface', () => {
    it('should match UseContractRolesReturn interface', async () => {
      const mockService = createMockAccessControlService();
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => useContractRoles(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current).toHaveProperty('roles');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refetch');
      expect(result.current).toHaveProperty('isEmpty');
      expect(result.current).toHaveProperty('totalMemberCount');
      // FR-012 compliance: new error handling properties
      expect(result.current).toHaveProperty('hasError');
      expect(result.current).toHaveProperty('canRetry');
      expect(result.current).toHaveProperty('errorMessage');

      expect(typeof result.current.refetch).toBe('function');
      expect(typeof result.current.isEmpty).toBe('boolean');
      expect(typeof result.current.totalMemberCount).toBe('number');
      expect(typeof result.current.hasError).toBe('boolean');
      expect(typeof result.current.canRetry).toBe('boolean');
    });
  });
});

describe('usePaginatedRoles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('pagination functionality', () => {
    it('should paginate roles with default page size', async () => {
      const mockService = createMockAccessControlService({
        getCurrentRoles: vi.fn().mockResolvedValue(mockLargeRoleList),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => usePaginatedRoles(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Default page size is 10
      expect(result.current.paginatedRoles.length).toBe(10);
      expect(result.current.currentPage).toBe(1);
      expect(result.current.totalPages).toBe(5); // 50 roles / 10 per page
      expect(result.current.hasNextPage).toBe(true);
      expect(result.current.hasPreviousPage).toBe(false);
    });

    it('should navigate to next page', async () => {
      const mockService = createMockAccessControlService({
        getCurrentRoles: vi.fn().mockResolvedValue(mockLargeRoleList),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => usePaginatedRoles(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Go to next page
      act(() => {
        result.current.nextPage();
      });

      expect(result.current.currentPage).toBe(2);
      expect(result.current.paginatedRoles[0].role.id).toBe('role_10');
      expect(result.current.hasPreviousPage).toBe(true);
    });

    it('should navigate to previous page', async () => {
      const mockService = createMockAccessControlService({
        getCurrentRoles: vi.fn().mockResolvedValue(mockLargeRoleList),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => usePaginatedRoles(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Go to page 2, then back to page 1
      act(() => {
        result.current.nextPage();
      });
      expect(result.current.currentPage).toBe(2);

      act(() => {
        result.current.previousPage();
      });
      expect(result.current.currentPage).toBe(1);
    });

    it('should go to specific page', async () => {
      const mockService = createMockAccessControlService({
        getCurrentRoles: vi.fn().mockResolvedValue(mockLargeRoleList),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => usePaginatedRoles(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Go directly to page 3
      act(() => {
        result.current.goToPage(3);
      });

      expect(result.current.currentPage).toBe(3);
      expect(result.current.paginatedRoles[0].role.id).toBe('role_20');
    });

    it('should not go beyond last page', async () => {
      const mockService = createMockAccessControlService({
        getCurrentRoles: vi.fn().mockResolvedValue(mockLargeRoleList),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => usePaginatedRoles(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Try to go to page 10 (doesn't exist)
      act(() => {
        result.current.goToPage(10);
      });

      // Should stay at last page (5)
      expect(result.current.currentPage).toBe(5);
      expect(result.current.hasNextPage).toBe(false);
    });

    it('should not go below first page', async () => {
      const mockService = createMockAccessControlService({
        getCurrentRoles: vi.fn().mockResolvedValue(mockLargeRoleList),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => usePaginatedRoles(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Try to go to page 0
      act(() => {
        result.current.goToPage(0);
      });

      // Should stay at first page (1)
      expect(result.current.currentPage).toBe(1);
    });

    it('should support custom page size', async () => {
      const mockService = createMockAccessControlService({
        getCurrentRoles: vi.fn().mockResolvedValue(mockLargeRoleList),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(
        () => usePaginatedRoles(mockAdapter, 'CONTRACT_ADDRESS', { pageSize: 25 }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.paginatedRoles.length).toBe(25);
      expect(result.current.totalPages).toBe(2); // 50 / 25 = 2 pages
    });

    it('should reset to page 1 when data changes', async () => {
      const mockService = createMockAccessControlService({
        getCurrentRoles: vi.fn().mockResolvedValue(mockLargeRoleList),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result, rerender } = renderHook(
        ({ address }) => usePaginatedRoles(mockAdapter, address),
        {
          wrapper: createWrapper(),
          initialProps: { address: 'CONTRACT_A' },
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Go to page 3
      act(() => {
        result.current.goToPage(3);
      });
      expect(result.current.currentPage).toBe(3);

      // Change address - should reset to page 1
      rerender({ address: 'CONTRACT_B' });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentPage).toBe(1);
    });

    it('should handle empty roles list', async () => {
      const mockService = createMockAccessControlService({
        getCurrentRoles: vi.fn().mockResolvedValue([]),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => usePaginatedRoles(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.paginatedRoles).toEqual([]);
      expect(result.current.totalPages).toBe(0);
      expect(result.current.hasNextPage).toBe(false);
      expect(result.current.hasPreviousPage).toBe(false);
    });
  });
});

describe('useContractOwnership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return null ownership and not loading when adapter is null', () => {
      const { result } = renderHook(() => useContractOwnership(null, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      expect(result.current.ownership).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.hasOwner).toBe(false);
    });

    it('should return null ownership when address is empty', () => {
      const mockAdapter = createMockAdapter();
      const { result } = renderHook(() => useContractOwnership(mockAdapter, ''), {
        wrapper: createWrapper(),
      });

      expect(result.current.ownership).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should return null ownership when adapter does not support access control', () => {
      const mockAdapter = createMockAdapter(null);
      const { result } = renderHook(() => useContractOwnership(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      expect(result.current.ownership).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('successful ownership fetching', () => {
    it('should fetch ownership for a valid contract', async () => {
      const mockService = createMockAccessControlService();
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => useContractOwnership(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.ownership).toEqual(mockOwnership);
      expect(result.current.error).toBeNull();
      expect(result.current.hasOwner).toBe(true);
      expect(mockService.getOwnership).toHaveBeenCalledWith('CONTRACT_ADDRESS');
    });

    it('should handle contracts with no owner (renounced)', async () => {
      const mockService = createMockAccessControlService({
        getOwnership: vi.fn().mockResolvedValue(mockOwnershipNull),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => useContractOwnership(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.ownership).toEqual(mockOwnershipNull);
      expect(result.current.hasOwner).toBe(false);
    });

    it('should correctly identify when contract has owner', async () => {
      const mockService = createMockAccessControlService({
        getOwnership: vi.fn().mockResolvedValue({
          owner: '0x1234567890123456789012345678901234567890',
        }),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => useContractOwnership(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasOwner).toBe(true);
      expect(result.current.ownership?.owner).toBe('0x1234567890123456789012345678901234567890');
    });
  });

  describe('error handling', () => {
    it('should set error state when getOwnership fails', async () => {
      const mockService = createMockAccessControlService({
        getOwnership: vi.fn().mockRejectedValue(new Error('Network error')),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => useContractOwnership(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(DataError);
      expect(result.current.hasError).toBe(true);
      expect(result.current.canRetry).toBe(true);
      expect(result.current.errorMessage).toBeTruthy();
      expect(result.current.ownership).toBeNull();
    });

    it('should handle contract not supporting Ownable', async () => {
      const mockService = createMockAccessControlService({
        getOwnership: vi.fn().mockRejectedValue(new Error('Contract does not support Ownable')),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => useContractOwnership(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.hasError).toBe(true);
      expect(result.current.canRetry).toBe(true);
    });

    it('should categorize network errors correctly', async () => {
      const mockService = createMockAccessControlService({
        getOwnership: vi.fn().mockRejectedValue(new Error('Connection timeout')),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => useContractOwnership(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.category).toBe(ErrorCategory.NETWORK_ERROR);
      expect(result.current.canRetry).toBe(true);
    });

    it('should handle indexer unavailable for ownership', async () => {
      const mockService = createMockAccessControlService({
        getOwnership: vi.fn().mockRejectedValue(new Error('Indexer service unavailable')),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => useContractOwnership(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.category).toBe(ErrorCategory.INDEXER_UNAVAILABLE);
      expect(result.current.errorMessage).toContain('indexer');
    });
  });

  describe('refetch functionality', () => {
    it('should provide refetch function', async () => {
      const mockService = createMockAccessControlService();
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => useContractOwnership(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');

      // Trigger refetch
      await act(async () => {
        await result.current.refetch();
      });

      // Should have been called twice (initial + refetch)
      expect(mockService.getOwnership).toHaveBeenCalledTimes(2);
    });
  });

  describe('query key management', () => {
    it('should refetch when contract address changes', async () => {
      const mockService = createMockAccessControlService();
      const mockAdapter = createMockAdapter(mockService);

      const { result, rerender } = renderHook(
        ({ address }) => useContractOwnership(mockAdapter, address),
        {
          wrapper: createWrapper(),
          initialProps: { address: 'CONTRACT_A' },
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockService.getOwnership).toHaveBeenCalledWith('CONTRACT_A');

      // Change address
      rerender({ address: 'CONTRACT_B' });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockService.getOwnership).toHaveBeenCalledWith('CONTRACT_B');
    });
  });

  describe('return type interface', () => {
    it('should match UseContractOwnershipReturn interface', async () => {
      const mockService = createMockAccessControlService();
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => useContractOwnership(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current).toHaveProperty('ownership');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refetch');
      expect(result.current).toHaveProperty('hasOwner');
      // FR-012 compliance: new error handling properties
      expect(result.current).toHaveProperty('hasError');
      expect(result.current).toHaveProperty('canRetry');
      expect(result.current).toHaveProperty('errorMessage');

      expect(typeof result.current.refetch).toBe('function');
      expect(typeof result.current.hasOwner).toBe('boolean');
      expect(typeof result.current.hasError).toBe('boolean');
      expect(typeof result.current.canRetry).toBe('boolean');
    });
  });
});
