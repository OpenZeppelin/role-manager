/**
 * Tests for useContractHistory hook
 * Feature: 012-role-changes-data
 *
 * Tests the history data fetching hook that:
 * - Fetches paginated history from AccessControlService
 * - Handles loading, error, and success states
 * - Supports cursor-based pagination options
 *
 * Tasks: T004
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';

import type {
  AccessControlService,
  ContractAdapter,
  HistoryEntry,
  NetworkConfig,
  PaginatedHistoryResult,
} from '@openzeppelin/ui-types';

import { DEFAULT_PAGE_SIZE, useContractHistory } from '../useContractHistory';

// =============================================================================
// Test Fixtures
// =============================================================================

const mockNetworkConfig: NetworkConfig = {
  id: 'stellar-testnet',
  name: 'Stellar Testnet',
  ecosystem: 'stellar',
  network: 'stellar',
  type: 'testnet',
  isTestnet: true,
} as NetworkConfig;

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
];

const mockPaginatedResult: PaginatedHistoryResult = {
  items: mockHistoryEntries,
  pageInfo: {
    hasNextPage: true,
    endCursor: 'cursor-123',
  },
};

const mockEmptyResult: PaginatedHistoryResult = {
  items: [],
  pageInfo: {
    hasNextPage: false,
    endCursor: undefined,
  },
};

// =============================================================================
// Mock Factories
// =============================================================================

const createMockAccessControlService = (
  overrides?: Partial<AccessControlService>
): AccessControlService =>
  ({
    getCapabilities: vi.fn().mockResolvedValue({
      hasOwnable: true,
      hasAccessControl: true,
      hasEnumerableRoles: true,
      supportsHistory: true,
    }),
    getCurrentRoles: vi.fn().mockResolvedValue([]),
    getOwnership: vi.fn().mockResolvedValue({ owner: null }),
    grantRole: vi.fn().mockResolvedValue({ id: 'tx-123' }),
    revokeRole: vi.fn().mockResolvedValue({ id: 'tx-456' }),
    transferOwnership: vi.fn().mockResolvedValue({ id: 'tx-789' }),
    exportSnapshot: vi.fn().mockResolvedValue({ roles: [], ownership: { owner: null } }),
    getHistory: vi.fn().mockResolvedValue(mockPaginatedResult),
    ...overrides,
  }) as AccessControlService;

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

// =============================================================================
// Test Wrapper
// =============================================================================

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

// =============================================================================
// Tests
// =============================================================================

describe('useContractHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Initialization
  // ===========================================================================

  describe('initialization', () => {
    it('should return empty items when adapter is null', () => {
      const { result } = renderHook(() => useContractHistory(null, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);
    });

    it('should return empty items when address is empty', () => {
      const mockAdapter = createMockAdapter();
      const { result } = renderHook(() => useContractHistory(mockAdapter, ''), {
        wrapper: createWrapper(),
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('should return empty items when contract is not registered', () => {
      const mockAdapter = createMockAdapter();
      const { result } = renderHook(
        () => useContractHistory(mockAdapter, 'CONTRACT_ADDRESS', false),
        { wrapper: createWrapper() }
      );

      expect(result.current.items).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('should return empty items when adapter does not support access control', () => {
      const mockAdapter = createMockAdapter(null);
      const { result } = renderHook(() => useContractHistory(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });
  });

  // ===========================================================================
  // Successful Data Fetching
  // ===========================================================================

  describe('successful data fetching', () => {
    it('should fetch history entries for valid contract', async () => {
      const mockService = createMockAccessControlService();
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => useContractHistory(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toEqual(mockHistoryEntries);
      expect(result.current.hasError).toBe(false);
      expect(mockService.getHistory).toHaveBeenCalledWith('CONTRACT_ADDRESS', {
        limit: DEFAULT_PAGE_SIZE,
        cursor: undefined,
        roleId: undefined,
        account: undefined,
      });
    });

    it('should return pagination info from API response', async () => {
      const mockService = createMockAccessControlService();
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => useContractHistory(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.pageInfo).toEqual({
        hasNextPage: true,
        endCursor: 'cursor-123',
      });
    });

    it('should handle empty history result', async () => {
      const mockService = createMockAccessControlService({
        getHistory: vi.fn().mockResolvedValue(mockEmptyResult),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => useContractHistory(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.pageInfo.hasNextPage).toBe(false);
    });
  });

  // ===========================================================================
  // Query Options
  // ===========================================================================

  describe('query options', () => {
    it('should pass cursor option to API', async () => {
      const mockService = createMockAccessControlService();
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(
        () =>
          useContractHistory(mockAdapter, 'CONTRACT_ADDRESS', true, {
            cursor: 'page-2-cursor',
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockService.getHistory).toHaveBeenCalledWith('CONTRACT_ADDRESS', {
        limit: DEFAULT_PAGE_SIZE,
        cursor: 'page-2-cursor',
        roleId: undefined,
        account: undefined,
      });
    });

    it('should pass roleId filter option to API', async () => {
      const mockService = createMockAccessControlService();
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(
        () =>
          useContractHistory(mockAdapter, 'CONTRACT_ADDRESS', true, {
            roleId: 'ADMIN_ROLE',
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockService.getHistory).toHaveBeenCalledWith('CONTRACT_ADDRESS', {
        limit: DEFAULT_PAGE_SIZE,
        cursor: undefined,
        roleId: 'ADMIN_ROLE',
        account: undefined,
      });
    });

    it('should pass custom limit option to API', async () => {
      const mockService = createMockAccessControlService();
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(
        () =>
          useContractHistory(mockAdapter, 'CONTRACT_ADDRESS', true, {
            limit: 50,
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockService.getHistory).toHaveBeenCalledWith('CONTRACT_ADDRESS', {
        limit: 50,
        cursor: undefined,
        roleId: undefined,
        account: undefined,
      });
    });

    it('should use DEFAULT_PAGE_SIZE when limit not specified', async () => {
      const mockService = createMockAccessControlService();
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => useContractHistory(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockService.getHistory).toHaveBeenCalledWith(
        'CONTRACT_ADDRESS',
        expect.objectContaining({ limit: DEFAULT_PAGE_SIZE })
      );
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('error handling', () => {
    it('should set error state when getHistory fails', async () => {
      const mockService = createMockAccessControlService({
        getHistory: vi.fn().mockRejectedValue(new Error('Network error')),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => useContractHistory(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasError).toBe(true);
      expect(result.current.errorMessage).toBeTruthy();
      expect(result.current.items).toEqual([]);
    });

    it('should handle non-Error exceptions', async () => {
      const mockService = createMockAccessControlService({
        getHistory: vi.fn().mockRejectedValue('string error'),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => useContractHistory(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasError).toBe(true);
    });

    it('should return canRetry based on error type', async () => {
      const mockService = createMockAccessControlService({
        getHistory: vi.fn().mockRejectedValue(new Error('Temporary failure')),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => useContractHistory(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasError).toBe(true);
      expect(typeof result.current.canRetry).toBe('boolean');
    });
  });

  // ===========================================================================
  // Refetch Functionality
  // ===========================================================================

  describe('refetch functionality', () => {
    it('should provide refetch function', async () => {
      const mockService = createMockAccessControlService();
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => useContractHistory(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');
    });

    it('should call getHistory again on refetch', async () => {
      const mockService = createMockAccessControlService();
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => useContractHistory(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockService.getHistory).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockService.getHistory).toHaveBeenCalledTimes(2);
    });
  });

  // ===========================================================================
  // Query Key Management
  // ===========================================================================

  describe('query key management', () => {
    it('should refetch when contract address changes', async () => {
      const mockService = createMockAccessControlService();
      const mockAdapter = createMockAdapter(mockService);

      const { result, rerender } = renderHook(
        ({ address }) => useContractHistory(mockAdapter, address),
        {
          wrapper: createWrapper(),
          initialProps: { address: 'CONTRACT_A' },
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockService.getHistory).toHaveBeenCalledWith('CONTRACT_A', expect.anything());

      // Change address
      rerender({ address: 'CONTRACT_B' });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockService.getHistory).toHaveBeenCalledWith('CONTRACT_B', expect.anything());
    });

    it('should refetch when cursor changes', async () => {
      const mockService = createMockAccessControlService();
      const mockAdapter = createMockAdapter(mockService);

      const { result, rerender } = renderHook(
        ({ cursor }) => useContractHistory(mockAdapter, 'CONTRACT_ADDRESS', true, { cursor }),
        {
          wrapper: createWrapper(),
          initialProps: { cursor: undefined as string | undefined },
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockService.getHistory).toHaveBeenCalledTimes(1);

      // Change cursor
      rerender({ cursor: 'new-cursor' });

      await waitFor(() => {
        expect(mockService.getHistory).toHaveBeenCalledTimes(2);
      });

      expect(mockService.getHistory).toHaveBeenLastCalledWith(
        'CONTRACT_ADDRESS',
        expect.objectContaining({ cursor: 'new-cursor' })
      );
    });

    it('should refetch when roleId filter changes', async () => {
      const mockService = createMockAccessControlService();
      const mockAdapter = createMockAdapter(mockService);

      const { result, rerender } = renderHook(
        ({ roleId }) => useContractHistory(mockAdapter, 'CONTRACT_ADDRESS', true, { roleId }),
        {
          wrapper: createWrapper(),
          initialProps: { roleId: undefined as string | undefined },
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockService.getHistory).toHaveBeenCalledTimes(1);

      // Change roleId filter
      rerender({ roleId: 'MINTER_ROLE' });

      await waitFor(() => {
        expect(mockService.getHistory).toHaveBeenCalledTimes(2);
      });

      expect(mockService.getHistory).toHaveBeenLastCalledWith(
        'CONTRACT_ADDRESS',
        expect.objectContaining({ roleId: 'MINTER_ROLE' })
      );
    });
  });

  // ===========================================================================
  // Return Type Interface
  // ===========================================================================

  describe('return type interface', () => {
    it('should match UseContractHistoryReturn interface', async () => {
      const mockService = createMockAccessControlService();
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(() => useContractHistory(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Check all required properties exist
      expect(result.current).toHaveProperty('items');
      expect(result.current).toHaveProperty('pageInfo');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isFetching');
      expect(result.current).toHaveProperty('hasError');
      expect(result.current).toHaveProperty('errorMessage');
      expect(result.current).toHaveProperty('canRetry');
      expect(result.current).toHaveProperty('refetch');

      // Check types
      expect(Array.isArray(result.current.items)).toBe(true);
      expect(typeof result.current.pageInfo).toBe('object');
      expect(typeof result.current.isLoading).toBe('boolean');
      expect(typeof result.current.isFetching).toBe('boolean');
      expect(typeof result.current.hasError).toBe('boolean');
      expect(typeof result.current.canRetry).toBe('boolean');
      expect(typeof result.current.refetch).toBe('function');
    });
  });

  // ===========================================================================
  // Constants Export
  // ===========================================================================

  describe('constants export', () => {
    it('should export DEFAULT_PAGE_SIZE as 20', () => {
      expect(DEFAULT_PAGE_SIZE).toBe(20);
    });
  });
});
