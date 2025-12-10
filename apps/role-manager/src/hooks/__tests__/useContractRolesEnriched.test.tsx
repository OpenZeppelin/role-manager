/**
 * Tests for useContractRolesEnriched hook
 * Feature: 011-accounts-real-data
 *
 * TDD tests for the enriched roles fetching hook that:
 * - Fetches roles with timestamps from getCurrentRolesEnriched()
 * - Falls back to getCurrentRoles() when enriched API unavailable
 * - Handles errors gracefully
 *
 * Tasks: T019, T020, T021, T022
 */
import 'fake-indexeddb/auto';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContractAdapter } from '@openzeppelin/ui-builder-types';

import type { EnrichedRoleAssignment } from '../../types/authorized-accounts';
import { useContractRolesEnriched } from '../useContractRolesEnriched';

// =============================================================================
// Mock Setup
// =============================================================================

const mockEnrichedRoles: EnrichedRoleAssignment[] = [
  {
    role: { id: 'ADMIN_ROLE', label: 'Admin' },
    members: [
      {
        address: '0x1234567890123456789012345678901234567890',
        grantedAt: '2024-01-15T10:00:00Z',
        grantedTxId: '0xtx123',
        grantedLedger: 12345,
      },
    ],
  },
  {
    role: { id: 'MINTER_ROLE', label: 'Minter' },
    members: [
      {
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
        grantedAt: '2024-02-20T15:30:00Z',
      },
      {
        address: '0x9876543210987654321098765432109876543210',
      },
    ],
  },
];

const mockRegularRoles = [
  {
    role: { id: 'ADMIN_ROLE', label: 'Admin' },
    members: ['0x1234567890123456789012345678901234567890'],
  },
  {
    role: { id: 'MINTER_ROLE', label: 'Minter' },
    members: [
      '0xabcdef1234567890abcdef1234567890abcdef12',
      '0x9876543210987654321098765432109876543210',
    ],
  },
];

// Mock service
const mockService = {
  getCurrentRolesEnriched: vi.fn(),
  getCurrentRoles: vi.fn(),
};

const mockUseAccessControlService = vi.fn();

vi.mock('../useAccessControlService', () => ({
  useAccessControlService: () => mockUseAccessControlService(),
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
  mockService.getCurrentRolesEnriched.mockResolvedValue(mockEnrichedRoles);
  mockService.getCurrentRoles.mockResolvedValue(mockRegularRoles);

  mockUseAccessControlService.mockReturnValue({
    service: mockService,
    isReady: true,
  });
}

// =============================================================================
// T019: Test file creation for useContractRolesEnriched
// =============================================================================

describe('useContractRolesEnriched', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // T020: Test cases for successful enriched role fetch
  // ===========================================================================

  describe('successful enriched role fetch (T020)', () => {
    it('should return enriched roles when getCurrentRolesEnriched succeeds', async () => {
      const { result } = renderHook(
        () =>
          useContractRolesEnriched(
            { id: 'test' } as unknown as ContractAdapter,
            '0xcontract',
            true
          ),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.roles).toEqual(mockEnrichedRoles);
      expect(result.current.hasError).toBe(false);
      expect(result.current.isEmpty).toBe(false);
    });

    it('should call getCurrentRolesEnriched with contract address', async () => {
      renderHook(
        () =>
          useContractRolesEnriched(
            { id: 'test' } as unknown as ContractAdapter,
            '0xcontract123',
            true
          ),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => {
        expect(mockService.getCurrentRolesEnriched).toHaveBeenCalledWith('0xcontract123');
      });
    });

    it('should return isLoading=true during initial fetch', () => {
      // Make the service return a pending promise
      mockService.getCurrentRolesEnriched.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(
        () =>
          useContractRolesEnriched(
            { id: 'test' } as unknown as ContractAdapter,
            '0xcontract',
            true
          ),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);
    });

    it('should preserve member timestamps from enriched API', async () => {
      const { result } = renderHook(
        () =>
          useContractRolesEnriched(
            { id: 'test' } as unknown as ContractAdapter,
            '0xcontract',
            true
          ),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const adminRole = result.current.roles.find((r) => r.role.id === 'ADMIN_ROLE');
      expect(adminRole?.members[0].grantedAt).toBe('2024-01-15T10:00:00Z');
      expect(adminRole?.members[0].grantedTxId).toBe('0xtx123');
    });
  });

  // ===========================================================================
  // Note: Fallback tests removed (T021)
  // getCurrentRolesEnriched is now a required method in the AccessControlService
  // interface, so fallback behavior is no longer needed. The service itself
  // handles graceful degradation when indexer data is unavailable.
  // ===========================================================================

  // ===========================================================================
  // T022: Test cases for error handling
  // ===========================================================================

  describe('error handling (T022)', () => {
    it('should return hasError=true when service is unavailable', async () => {
      mockUseAccessControlService.mockReturnValue({
        service: null,
        isReady: true,
      });

      const { result } = renderHook(
        () =>
          useContractRolesEnriched(
            { id: 'test' } as unknown as ContractAdapter,
            '0xcontract',
            true
          ),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasError).toBe(true);
      expect(result.current.errorMessage).toBeTruthy();
      expect(result.current.canRetry).toBe(false);
    });

    it('should return hasError=true when API call fails', async () => {
      mockService.getCurrentRolesEnriched.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(
        () =>
          useContractRolesEnriched(
            { id: 'test' } as unknown as ContractAdapter,
            '0xcontract',
            true
          ),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasError).toBe(true);
      expect(result.current.errorMessage).toBeTruthy();
    });

    it('should not fetch when adapter is null', () => {
      // Mock service not ready when adapter is null
      mockUseAccessControlService.mockReturnValue({
        service: null,
        isReady: false,
      });

      const { result } = renderHook(() => useContractRolesEnriched(null, '0xcontract', true), {
        wrapper: createWrapper(),
      });

      // Should not start loading since service is not ready
      expect(result.current.roles).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('should not fetch when contract is not registered', () => {
      const { result } = renderHook(
        () =>
          useContractRolesEnriched(
            { id: 'test' } as unknown as ContractAdapter,
            '0xcontract',
            false
          ),
        { wrapper: createWrapper() }
      );

      expect(mockService.getCurrentRolesEnriched).not.toHaveBeenCalled();
      expect(result.current.roles).toEqual([]);
    });

    it('should not fetch when service is not ready', () => {
      mockUseAccessControlService.mockReturnValue({
        service: mockService,
        isReady: false,
      });

      const { result } = renderHook(
        () =>
          useContractRolesEnriched(
            { id: 'test' } as unknown as ContractAdapter,
            '0xcontract',
            true
          ),
        { wrapper: createWrapper() }
      );

      expect(mockService.getCurrentRolesEnriched).not.toHaveBeenCalled();
      expect(result.current.roles).toEqual([]);
    });
  });

  describe('refetch functionality', () => {
    it('should expose refetch function', async () => {
      const { result } = renderHook(
        () =>
          useContractRolesEnriched(
            { id: 'test' } as unknown as ContractAdapter,
            '0xcontract',
            true
          ),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.refetch).toBeDefined();
      expect(typeof result.current.refetch).toBe('function');
    });

    it('should refetch data when refetch is called', async () => {
      const { result } = renderHook(
        () =>
          useContractRolesEnriched(
            { id: 'test' } as unknown as ContractAdapter,
            '0xcontract',
            true
          ),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear call count
      mockService.getCurrentRolesEnriched.mockClear();

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockService.getCurrentRolesEnriched).toHaveBeenCalled();
    });
  });

  describe('isEmpty state', () => {
    it('should return isEmpty=true when no roles returned', async () => {
      mockService.getCurrentRolesEnriched.mockResolvedValue([]);

      const { result } = renderHook(
        () =>
          useContractRolesEnriched(
            { id: 'test' } as unknown as ContractAdapter,
            '0xcontract',
            true
          ),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isEmpty).toBe(true);
    });

    it('should return isEmpty=false when roles exist', async () => {
      const { result } = renderHook(
        () =>
          useContractRolesEnriched(
            { id: 'test' } as unknown as ContractAdapter,
            '0xcontract',
            true
          ),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isEmpty).toBe(false);
    });
  });
});
