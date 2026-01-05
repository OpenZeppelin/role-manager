/**
 * Unit tests for usePendingTransfers hook
 * Feature: 015-ownership-transfer (Phase 6.5)
 *
 * Tests the aggregation hook that combines pending ownership transfers
 * (and future admin/multisig transfers) for Dashboard display.
 *
 * Tasks: T044
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type ReactNode } from 'react';

import type { ContractAdapter, OwnershipInfo } from '@openzeppelin/ui-types';

import { DataError, ErrorCategory } from '../../utils/errors';
import * as useContractDataModule from '../useContractData';
import * as useCurrentBlockModule from '../useCurrentBlock';
import { usePendingTransfers } from '../usePendingTransfers';
import * as useSelectedContractModule from '../useSelectedContract';

// Mock the hooks
vi.mock('../useContractData', () => ({
  useContractOwnership: vi.fn(),
  useContractAdminInfo: vi.fn().mockReturnValue({
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

vi.mock('../useCurrentBlock', () => ({
  useCurrentBlock: vi.fn(),
}));

vi.mock('../useSelectedContract', () => ({
  useSelectedContract: vi.fn(),
}));

describe('usePendingTransfers', () => {
  let queryClient: QueryClient;
  let mockAdapter: ContractAdapter;
  const testAddress = '0x1234567890123456789012345678901234567890';
  const pendingOwnerAddress = '0xabcdef0123456789abcdef0123456789abcdef01';
  const currentOwnerAddress = '0x9999999999999999999999999999999999999999';

  // Mock contract with all required RecentContractRecord fields
  const mockContract = {
    id: '1',
    address: testAddress,
    label: 'Test',
    networkId: 'stellar-testnet',
    lastAccessed: Date.now(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    mockAdapter = {
      ecosystem: 'stellar',
      getExplorerUrl: vi.fn(),
      createAccessControlService: vi.fn(),
    } as unknown as ContractAdapter;

    vi.clearAllMocks();

    // Default mock for useSelectedContract
    vi.mocked(useSelectedContractModule.useSelectedContract).mockReturnValue({
      selectedContract: mockContract,
      adapter: mockAdapter,
      isContractRegistered: true,
      selectedNetwork: { id: 'stellar-testnet', name: 'Stellar Testnet' } as never,
      setSelectedContract: vi.fn(),
      setSelectedNetwork: vi.fn(),
      isAdapterLoading: false,
      contracts: [],
      isContractsLoading: false,
    });

    // Default mock for useCurrentBlock
    vi.mocked(useCurrentBlockModule.useCurrentBlock).mockReturnValue({
      currentBlock: 1000,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  describe('empty state', () => {
    it('returns empty array when no pending transfers exist', () => {
      vi.mocked(useContractDataModule.useContractOwnership).mockReturnValue({
        ownership: {
          owner: currentOwnerAddress,
          // No pendingTransfer
        },
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        hasOwner: true,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

      const { result } = renderHook(() => usePendingTransfers(), { wrapper });

      expect(result.current.transfers).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('returns empty array when ownership has no pending transfer', () => {
      vi.mocked(useContractDataModule.useContractOwnership).mockReturnValue({
        ownership: {
          owner: currentOwnerAddress,
          pendingTransfer: undefined,
        } as OwnershipInfo,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        hasOwner: true,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

      const { result } = renderHook(() => usePendingTransfers(), { wrapper });

      expect(result.current.transfers).toEqual([]);
    });
  });

  describe('aggregating ownership transfers', () => {
    it('returns pending ownership transfer with correct structure', () => {
      vi.mocked(useContractDataModule.useContractOwnership).mockReturnValue({
        ownership: {
          owner: currentOwnerAddress,
          pendingTransfer: {
            pendingOwner: pendingOwnerAddress,
            expirationBlock: 2000,
          },
        } as OwnershipInfo,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        hasOwner: true,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

      const { result } = renderHook(() => usePendingTransfers(), { wrapper });

      expect(result.current.transfers).toHaveLength(1);

      const transfer = result.current.transfers[0];
      expect(transfer.type).toBe('ownership');
      expect(transfer.label).toBe('Owner');
      expect(transfer.currentHolder).toBe(currentOwnerAddress);
      expect(transfer.pendingRecipient).toBe(pendingOwnerAddress);
      expect(transfer.expirationBlock).toBe(2000);
      expect(transfer.step).toEqual({ current: 1, total: 2 });
    });

    it('sets isExpired correctly based on current block', () => {
      vi.mocked(useCurrentBlockModule.useCurrentBlock).mockReturnValue({
        currentBlock: 2500, // Past expiration
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      vi.mocked(useContractDataModule.useContractOwnership).mockReturnValue({
        ownership: {
          owner: currentOwnerAddress,
          pendingTransfer: {
            pendingOwner: pendingOwnerAddress,
            expirationBlock: 2000,
          },
        } as OwnershipInfo,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        hasOwner: true,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

      // Must include expired to see the transfer (expired transfers are filtered by default)
      const { result } = renderHook(() => usePendingTransfers({ includeExpired: true }), {
        wrapper,
      });

      expect(result.current.transfers[0].isExpired).toBe(true);
    });

    it('sets isExpired to false when not expired', () => {
      vi.mocked(useCurrentBlockModule.useCurrentBlock).mockReturnValue({
        currentBlock: 1000, // Before expiration
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      vi.mocked(useContractDataModule.useContractOwnership).mockReturnValue({
        ownership: {
          owner: currentOwnerAddress,
          pendingTransfer: {
            pendingOwner: pendingOwnerAddress,
            expirationBlock: 2000,
          },
        } as OwnershipInfo,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        hasOwner: true,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

      const { result } = renderHook(() => usePendingTransfers(), { wrapper });

      expect(result.current.transfers[0].isExpired).toBe(false);
    });
  });

  describe('canAccept logic', () => {
    it('sets canAccept to true when connected wallet is pending owner', () => {
      vi.mocked(useSelectedContractModule.useSelectedContract).mockReturnValue({
        selectedContract: mockContract,
        adapter: mockAdapter,
        isContractRegistered: true,
        selectedNetwork: { id: 'stellar-testnet', name: 'Stellar Testnet' } as never,
        setSelectedContract: vi.fn(),
        setSelectedNetwork: vi.fn(),
        isAdapterLoading: false,
        contracts: [],
        isContractsLoading: false,
      });

      vi.mocked(useContractDataModule.useContractOwnership).mockReturnValue({
        ownership: {
          owner: currentOwnerAddress,
          pendingTransfer: {
            pendingOwner: pendingOwnerAddress,
            expirationBlock: 2000,
          },
        } as OwnershipInfo,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        hasOwner: true,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

      const { result } = renderHook(
        () => usePendingTransfers({ connectedAddress: pendingOwnerAddress }),
        { wrapper }
      );

      expect(result.current.transfers[0].canAccept).toBe(true);
    });

    it('sets canAccept to false when connected wallet is not pending owner', () => {
      vi.mocked(useContractDataModule.useContractOwnership).mockReturnValue({
        ownership: {
          owner: currentOwnerAddress,
          pendingTransfer: {
            pendingOwner: pendingOwnerAddress,
            expirationBlock: 2000,
          },
        } as OwnershipInfo,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        hasOwner: true,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

      const { result } = renderHook(
        () => usePendingTransfers({ connectedAddress: '0xsomeotheraddress' }),
        { wrapper }
      );

      expect(result.current.transfers[0].canAccept).toBe(false);
    });

    it('sets canAccept to false when no wallet connected', () => {
      vi.mocked(useContractDataModule.useContractOwnership).mockReturnValue({
        ownership: {
          owner: currentOwnerAddress,
          pendingTransfer: {
            pendingOwner: pendingOwnerAddress,
            expirationBlock: 2000,
          },
        } as OwnershipInfo,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        hasOwner: true,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

      const { result } = renderHook(() => usePendingTransfers({ connectedAddress: null }), {
        wrapper,
      });

      expect(result.current.transfers[0].canAccept).toBe(false);
    });

    it('sets canAccept to false when transfer is expired', () => {
      vi.mocked(useCurrentBlockModule.useCurrentBlock).mockReturnValue({
        currentBlock: 2500, // Past expiration
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      vi.mocked(useContractDataModule.useContractOwnership).mockReturnValue({
        ownership: {
          owner: currentOwnerAddress,
          pendingTransfer: {
            pendingOwner: pendingOwnerAddress,
            expirationBlock: 2000,
          },
        } as OwnershipInfo,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        hasOwner: true,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

      // Must include expired to see the transfer (expired transfers are filtered by default)
      const { result } = renderHook(
        () => usePendingTransfers({ connectedAddress: pendingOwnerAddress, includeExpired: true }),
        { wrapper }
      );

      // Even though connected address matches, transfer is expired so canAccept should be false
      expect(result.current.transfers[0].canAccept).toBe(false);
    });
  });

  describe('expired filtering', () => {
    it('excludes expired transfers by default', () => {
      vi.mocked(useCurrentBlockModule.useCurrentBlock).mockReturnValue({
        currentBlock: 2500, // Past expiration
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      vi.mocked(useContractDataModule.useContractOwnership).mockReturnValue({
        ownership: {
          owner: currentOwnerAddress,
          pendingTransfer: {
            pendingOwner: pendingOwnerAddress,
            expirationBlock: 2000,
          },
        } as OwnershipInfo,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        hasOwner: true,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

      const { result } = renderHook(() => usePendingTransfers(), { wrapper });

      // Expired transfers should be excluded by default
      expect(result.current.transfers).toHaveLength(0);
    });

    it('includes expired transfers when includeExpired is true', () => {
      vi.mocked(useCurrentBlockModule.useCurrentBlock).mockReturnValue({
        currentBlock: 2500, // Past expiration
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      vi.mocked(useContractDataModule.useContractOwnership).mockReturnValue({
        ownership: {
          owner: currentOwnerAddress,
          pendingTransfer: {
            pendingOwner: pendingOwnerAddress,
            expirationBlock: 2000,
          },
        } as OwnershipInfo,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        hasOwner: true,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

      const { result } = renderHook(() => usePendingTransfers({ includeExpired: true }), {
        wrapper,
      });

      expect(result.current.transfers).toHaveLength(1);
      expect(result.current.transfers[0].isExpired).toBe(true);
    });
  });

  describe('loading state', () => {
    it('returns isLoading true when ownership is loading', () => {
      vi.mocked(useContractDataModule.useContractOwnership).mockReturnValue({
        ownership: null,
        isLoading: true,
        isFetching: true,
        error: null,
        refetch: vi.fn(),
        hasOwner: false,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

      const { result } = renderHook(() => usePendingTransfers(), { wrapper });

      expect(result.current.isLoading).toBe(true);
    });

    it('returns isLoading true when current block is loading and no transfers yet', () => {
      vi.mocked(useCurrentBlockModule.useCurrentBlock).mockReturnValue({
        currentBlock: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      });

      vi.mocked(useContractDataModule.useContractOwnership).mockReturnValue({
        ownership: null,
        isLoading: true,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        hasOwner: false,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

      const { result } = renderHook(() => usePendingTransfers(), { wrapper });

      // isLoading is true when ownership is loading
      expect(result.current.isLoading).toBe(true);
    });

    it('returns isRefreshing true when data is fetching', () => {
      vi.mocked(useContractDataModule.useContractOwnership).mockReturnValue({
        ownership: {
          owner: currentOwnerAddress,
        },
        isLoading: false,
        isFetching: true,
        error: null,
        refetch: vi.fn(),
        hasOwner: true,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

      const { result } = renderHook(() => usePendingTransfers(), { wrapper });

      expect(result.current.isRefreshing).toBe(true);
    });
  });

  describe('error state', () => {
    it('returns hasError and errorMessage when ownership fetch fails', () => {
      vi.mocked(useContractDataModule.useContractOwnership).mockReturnValue({
        ownership: null,
        isLoading: false,
        isFetching: false,
        error: new DataError('Network error', ErrorCategory.NETWORK_ERROR, { canRetry: true }),
        refetch: vi.fn(),
        hasOwner: false,
        canRetry: true,
        errorMessage: 'Failed to load ownership data',
        hasError: true,
      });

      const { result } = renderHook(() => usePendingTransfers(), { wrapper });

      expect(result.current.hasError).toBe(true);
      expect(result.current.errorMessage).toBe('Failed to load ownership data');
    });
  });

  describe('refetch', () => {
    it('calls ownership refetch when refetch is invoked', async () => {
      const mockOwnershipRefetch = vi.fn().mockResolvedValue(undefined);

      vi.mocked(useContractDataModule.useContractOwnership).mockReturnValue({
        ownership: { owner: currentOwnerAddress },
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: mockOwnershipRefetch,
        hasOwner: true,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

      const { result } = renderHook(() => usePendingTransfers(), { wrapper });

      await result.current.refetch();

      expect(mockOwnershipRefetch).toHaveBeenCalled();
    });
  });

  describe('no contract selected', () => {
    it('returns empty transfers when no contract selected', () => {
      vi.mocked(useSelectedContractModule.useSelectedContract).mockReturnValue({
        selectedContract: null,
        adapter: null,
        isContractRegistered: false,
        selectedNetwork: null,
        setSelectedContract: vi.fn(),
        setSelectedNetwork: vi.fn(),
        isAdapterLoading: false,
        contracts: [],
        isContractsLoading: false,
      });

      vi.mocked(useContractDataModule.useContractOwnership).mockReturnValue({
        ownership: null,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        hasOwner: false,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

      const { result } = renderHook(() => usePendingTransfers(), { wrapper });

      expect(result.current.transfers).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('unique ID generation', () => {
    it('generates unique ID for ownership transfer', () => {
      vi.mocked(useContractDataModule.useContractOwnership).mockReturnValue({
        ownership: {
          owner: currentOwnerAddress,
          pendingTransfer: {
            pendingOwner: pendingOwnerAddress,
            expirationBlock: 2000,
          },
        } as OwnershipInfo,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        hasOwner: true,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

      const { result } = renderHook(() => usePendingTransfers(), { wrapper });

      // ID should follow pattern: {type}-{contractAddress}
      expect(result.current.transfers[0].id).toMatch(/^ownership-/);
    });
  });
});
