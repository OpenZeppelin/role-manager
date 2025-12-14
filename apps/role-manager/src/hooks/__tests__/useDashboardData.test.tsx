/**
 * Unit tests for useDashboardData hook
 * Feature: 007-dashboard-real-data
 *
 * Tests the data aggregation hook that combines useContractRolesEnriched
 * and useContractOwnership for Dashboard display.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type ReactNode } from 'react';

import type { ContractAdapter, OwnershipInfo } from '@openzeppelin/ui-builder-types';

import type { EnrichedRoleAssignment } from '../../types/authorized-accounts';
import { DataError, ErrorCategory } from '../../utils/errors';
import * as useContractDataModule from '../useContractData';
import * as useContractRolesEnrichedModule from '../useContractRolesEnriched';
import { useDashboardData } from '../useDashboardData';

// Mock the hooks
vi.mock('../useContractData', () => ({
  useContractOwnership: vi.fn(),
}));

vi.mock('../useContractRolesEnriched', () => ({
  useContractRolesEnriched: vi.fn(),
}));

describe('useDashboardData', () => {
  let queryClient: QueryClient;
  let mockAdapter: ContractAdapter;
  const testAddress = '0x1234567890123456789012345678901234567890';

  // Default options for tests
  const defaultOptions = {
    networkId: 'stellar-testnet',
    networkName: 'Stellar Testnet',
    label: 'Test Contract',
    isContractRegistered: true,
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
  });

  describe('initial state', () => {
    it('returns loading state when data is being fetched', () => {
      vi.mocked(useContractRolesEnrichedModule.useContractRolesEnriched).mockReturnValue({
        roles: [],
        isLoading: true,
        isFetching: true,
        error: null,
        refetch: vi.fn(),
        isEmpty: true,
        totalMemberCount: 0,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

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

      const { result } = renderHook(
        () => useDashboardData(mockAdapter, testAddress, defaultOptions),
        { wrapper }
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.rolesCount).toBeNull();
      expect(result.current.uniqueAccountsCount).toBeNull();
    });
  });

  describe('with loaded data', () => {
    // Enriched roles have members as objects with address and optional grantedAt
    const mockEnrichedRoles: EnrichedRoleAssignment[] = [
      {
        role: { id: '0x1', label: 'ADMIN' },
        members: [{ address: '0xabc' }, { address: '0xdef' }],
      },
      {
        role: { id: '0x2', label: 'MINTER' },
        members: [{ address: '0xdef' }, { address: '0x123' }],
      },
    ];

    const mockOwnership: OwnershipInfo = {
      owner: '0xowner',
    };

    beforeEach(() => {
      vi.mocked(useContractRolesEnrichedModule.useContractRolesEnriched).mockReturnValue({
        roles: mockEnrichedRoles,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
        isEmpty: false,
        totalMemberCount: 4,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

      vi.mocked(useContractDataModule.useContractOwnership).mockReturnValue({
        ownership: mockOwnership,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn().mockResolvedValue(undefined),
        hasOwner: true,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });
    });

    it('returns correct roles count', () => {
      const { result } = renderHook(
        () => useDashboardData(mockAdapter, testAddress, defaultOptions),
        { wrapper }
      );

      expect(result.current.rolesCount).toBe(2);
    });

    it('returns correct unique accounts count (deduplicated)', () => {
      const { result } = renderHook(
        () => useDashboardData(mockAdapter, testAddress, defaultOptions),
        { wrapper }
      );

      // 0xabc, 0xdef, 0x123 = 3 unique accounts
      expect(result.current.uniqueAccountsCount).toBe(3);
    });

    it('returns isLoading as false when data is loaded', () => {
      const { result } = renderHook(
        () => useDashboardData(mockAdapter, testAddress, defaultOptions),
        { wrapper }
      );

      expect(result.current.isLoading).toBe(false);
    });

    it('returns hasError as false when no errors', () => {
      const { result } = renderHook(
        () => useDashboardData(mockAdapter, testAddress, defaultOptions),
        { wrapper }
      );

      expect(result.current.hasError).toBe(false);
      expect(result.current.errorMessage).toBeNull();
    });
  });

  describe('error states', () => {
    it('returns error state when roles fetch fails', () => {
      const mockError = new DataError('Failed to load roles', ErrorCategory.NETWORK_ERROR, {
        canRetry: true,
      });

      vi.mocked(useContractRolesEnrichedModule.useContractRolesEnriched).mockReturnValue({
        roles: [],
        isLoading: false,
        isFetching: false,
        error: mockError,
        refetch: vi.fn(),
        isEmpty: true,
        totalMemberCount: 0,
        canRetry: true,
        errorMessage: 'Failed to load roles',
        hasError: true,
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

      const { result } = renderHook(
        () => useDashboardData(mockAdapter, testAddress, defaultOptions),
        { wrapper }
      );

      expect(result.current.hasError).toBe(true);
      expect(result.current.errorMessage).toBe('Failed to load roles');
      expect(result.current.canRetry).toBe(true);
    });

    it('returns error state when ownership fetch fails', () => {
      const mockError = new DataError('Failed to load ownership', ErrorCategory.NETWORK_ERROR, {
        canRetry: true,
      });

      vi.mocked(useContractRolesEnrichedModule.useContractRolesEnriched).mockReturnValue({
        roles: [],
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        isEmpty: true,
        totalMemberCount: 0,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

      vi.mocked(useContractDataModule.useContractOwnership).mockReturnValue({
        ownership: null,
        isLoading: false,
        isFetching: false,
        error: mockError,
        refetch: vi.fn(),
        hasOwner: false,
        canRetry: true,
        errorMessage: 'Failed to load ownership',
        hasError: true,
      });

      const { result } = renderHook(
        () => useDashboardData(mockAdapter, testAddress, defaultOptions),
        { wrapper }
      );

      expect(result.current.hasError).toBe(true);
      expect(result.current.errorMessage).toBe('Failed to load ownership');
    });

    it('combines error messages when both fail', () => {
      const rolesError = new DataError('Failed to load roles', ErrorCategory.NETWORK_ERROR, {
        canRetry: true,
      });
      const ownershipError = new DataError(
        'Failed to load ownership',
        ErrorCategory.NETWORK_ERROR,
        {
          canRetry: true,
        }
      );

      vi.mocked(useContractRolesEnrichedModule.useContractRolesEnriched).mockReturnValue({
        roles: [],
        isLoading: false,
        isFetching: false,
        error: rolesError,
        refetch: vi.fn(),
        isEmpty: true,
        totalMemberCount: 0,
        canRetry: true,
        errorMessage: 'Failed to load roles',
        hasError: true,
      });

      vi.mocked(useContractDataModule.useContractOwnership).mockReturnValue({
        ownership: null,
        isLoading: false,
        isFetching: false,
        error: ownershipError,
        refetch: vi.fn(),
        hasOwner: false,
        canRetry: true,
        errorMessage: 'Failed to load ownership',
        hasError: true,
      });

      const { result } = renderHook(
        () => useDashboardData(mockAdapter, testAddress, defaultOptions),
        { wrapper }
      );

      expect(result.current.hasError).toBe(true);
      // Should show first error or combined message
      expect(result.current.errorMessage).toBeTruthy();
    });
  });

  describe('refetch functionality', () => {
    it('calls both refetch functions when refetch is invoked', async () => {
      const mockRolesRefetch = vi.fn().mockResolvedValue(undefined);
      const mockOwnershipRefetch = vi.fn().mockResolvedValue(undefined);

      vi.mocked(useContractRolesEnrichedModule.useContractRolesEnriched).mockReturnValue({
        roles: [],
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: mockRolesRefetch,
        isEmpty: true,
        totalMemberCount: 0,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

      vi.mocked(useContractDataModule.useContractOwnership).mockReturnValue({
        ownership: null,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: mockOwnershipRefetch,
        hasOwner: false,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

      const { result } = renderHook(
        () => useDashboardData(mockAdapter, testAddress, defaultOptions),
        { wrapper }
      );

      await result.current.refetch();

      expect(mockRolesRefetch).toHaveBeenCalledTimes(1);
      expect(mockOwnershipRefetch).toHaveBeenCalledTimes(1);
    });

    it('throws error when roles refetch fails', async () => {
      const mockRolesRefetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const mockOwnershipRefetch = vi.fn().mockResolvedValue(undefined);

      vi.mocked(useContractRolesEnrichedModule.useContractRolesEnriched).mockReturnValue({
        roles: [],
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: mockRolesRefetch,
        isEmpty: true,
        totalMemberCount: 0,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

      vi.mocked(useContractDataModule.useContractOwnership).mockReturnValue({
        ownership: null,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: mockOwnershipRefetch,
        hasOwner: false,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

      const { result } = renderHook(
        () => useDashboardData(mockAdapter, testAddress, defaultOptions),
        { wrapper }
      );

      await expect(result.current.refetch()).rejects.toThrow('Network error');
    });

    it('throws error when ownership refetch fails', async () => {
      const mockRolesRefetch = vi.fn().mockResolvedValue(undefined);
      const mockOwnershipRefetch = vi.fn().mockRejectedValue(new Error('Failed to load ownership'));

      vi.mocked(useContractRolesEnrichedModule.useContractRolesEnriched).mockReturnValue({
        roles: [],
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: mockRolesRefetch,
        isEmpty: true,
        totalMemberCount: 0,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

      vi.mocked(useContractDataModule.useContractOwnership).mockReturnValue({
        ownership: null,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: mockOwnershipRefetch,
        hasOwner: false,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

      const { result } = renderHook(
        () => useDashboardData(mockAdapter, testAddress, defaultOptions),
        { wrapper }
      );

      await expect(result.current.refetch()).rejects.toThrow('Failed to load ownership');
    });

    it('throws with generic message when error is not an Error instance', async () => {
      const mockRolesRefetch = vi.fn().mockRejectedValue('string error');
      const mockOwnershipRefetch = vi.fn().mockResolvedValue(undefined);

      vi.mocked(useContractRolesEnrichedModule.useContractRolesEnriched).mockReturnValue({
        roles: [],
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: mockRolesRefetch,
        isEmpty: true,
        totalMemberCount: 0,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

      vi.mocked(useContractDataModule.useContractOwnership).mockReturnValue({
        ownership: null,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: mockOwnershipRefetch,
        hasOwner: false,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

      const { result } = renderHook(
        () => useDashboardData(mockAdapter, testAddress, defaultOptions),
        { wrapper }
      );

      await expect(result.current.refetch()).rejects.toThrow('Failed to refresh data');
    });
  });

  describe('capability detection', () => {
    it('detects AccessControl capability from roles', () => {
      vi.mocked(useContractRolesEnrichedModule.useContractRolesEnriched).mockReturnValue({
        roles: [{ role: { id: '0x1', label: 'ADMIN' }, members: [{ address: '0xabc' }] }],
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        isEmpty: false,
        totalMemberCount: 1,
        canRetry: false,
        errorMessage: null,
        hasError: false,
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

      const { result } = renderHook(
        () => useDashboardData(mockAdapter, testAddress, defaultOptions),
        { wrapper }
      );

      expect(result.current.hasAccessControl).toBe(true);
    });

    it('detects Ownable capability from ownership', () => {
      vi.mocked(useContractRolesEnrichedModule.useContractRolesEnriched).mockReturnValue({
        roles: [],
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        isEmpty: true,
        totalMemberCount: 0,
        canRetry: false,
        errorMessage: null,
        hasError: false,
      });

      vi.mocked(useContractDataModule.useContractOwnership).mockReturnValue({
        ownership: { owner: '0xowner' },
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
        () => useDashboardData(mockAdapter, testAddress, defaultOptions),
        { wrapper }
      );

      expect(result.current.hasOwnable).toBe(true);
    });
  });

  describe('with null adapter', () => {
    it('handles null adapter gracefully', () => {
      vi.mocked(useContractRolesEnrichedModule.useContractRolesEnriched).mockReturnValue({
        roles: [],
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        isEmpty: true,
        totalMemberCount: 0,
        canRetry: false,
        errorMessage: null,
        hasError: false,
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

      const { result } = renderHook(() => useDashboardData(null, testAddress, defaultOptions), {
        wrapper,
      });

      expect(result.current.rolesCount).toBeNull();
      expect(result.current.uniqueAccountsCount).toBeNull();
    });
  });

  describe('with empty contract address', () => {
    it('handles empty contract address', () => {
      vi.mocked(useContractRolesEnrichedModule.useContractRolesEnriched).mockReturnValue({
        roles: [],
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: vi.fn(),
        isEmpty: true,
        totalMemberCount: 0,
        canRetry: false,
        errorMessage: null,
        hasError: false,
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

      const { result } = renderHook(() => useDashboardData(mockAdapter, '', defaultOptions), {
        wrapper,
      });

      expect(result.current.rolesCount).toBeNull();
    });
  });
});
