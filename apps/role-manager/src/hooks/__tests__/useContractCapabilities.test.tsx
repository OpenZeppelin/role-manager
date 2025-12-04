/**
 * Tests for useContractCapabilities hook
 * Feature: 006-access-control-service
 *
 * Tests the feature detection hook that determines what access control
 * interfaces a contract supports (AccessControl, Ownable, etc.)
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';

import type {
  AccessControlCapabilities,
  AccessControlService,
  ContractAdapter,
  NetworkConfig,
} from '@openzeppelin/ui-builder-types';

import { useContractCapabilities } from '../useContractCapabilities';

// Test fixtures
const mockNetworkConfig: NetworkConfig = {
  id: 'stellar-testnet',
  name: 'Stellar Testnet',
  ecosystem: 'stellar',
  network: 'stellar',
  type: 'testnet',
  isTestnet: true,
} as NetworkConfig;

const mockCapabilitiesWithBoth: AccessControlCapabilities = {
  hasOwnable: true,
  hasAccessControl: true,
  hasEnumerableRoles: true,
  supportsHistory: false,
  verifiedAgainstOZInterfaces: true,
  notes: [],
};

const mockCapabilitiesOwnableOnly: AccessControlCapabilities = {
  hasOwnable: true,
  hasAccessControl: false,
  hasEnumerableRoles: false,
  supportsHistory: false,
  verifiedAgainstOZInterfaces: true,
  notes: [],
};

const mockCapabilitiesAccessControlOnly: AccessControlCapabilities = {
  hasOwnable: false,
  hasAccessControl: true,
  hasEnumerableRoles: true,
  supportsHistory: false,
  verifiedAgainstOZInterfaces: true,
  notes: [],
};

const mockCapabilitiesNone: AccessControlCapabilities = {
  hasOwnable: false,
  hasAccessControl: false,
  hasEnumerableRoles: false,
  supportsHistory: false,
  verifiedAgainstOZInterfaces: false,
  notes: ['Contract does not implement standard access control interfaces'],
};

// Create mock AccessControlService factory
const createMockAccessControlService = (
  overrides?: Partial<AccessControlService>
): AccessControlService =>
  ({
    getCapabilities: vi.fn().mockResolvedValue(mockCapabilitiesWithBoth),
    getCurrentRoles: vi.fn().mockResolvedValue([]),
    getOwnership: vi.fn().mockResolvedValue({ owner: null }),
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

describe('useContractCapabilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return null capabilities and not loading when adapter is null', () => {
      const { result } = renderHook(() => useContractCapabilities(null, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      expect(result.current.capabilities).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should return null capabilities when address is empty', () => {
      const mockAdapter = createMockAdapter();
      const { result } = renderHook(() => useContractCapabilities(mockAdapter, ''), {
        wrapper: createWrapper(),
      });

      expect(result.current.capabilities).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    it('should return null capabilities when adapter does not support access control', () => {
      const mockAdapter = createMockAdapter(null);
      const { result } = renderHook(
        () => useContractCapabilities(mockAdapter, 'CONTRACT_ADDRESS'),
        { wrapper: createWrapper() }
      );

      expect(result.current.capabilities).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('successful capability detection', () => {
    it('should fetch capabilities for valid contract with both interfaces', async () => {
      const mockService = createMockAccessControlService();
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(
        () => useContractCapabilities(mockAdapter, 'CONTRACT_ADDRESS'),
        { wrapper: createWrapper() }
      );

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.capabilities).toEqual(mockCapabilitiesWithBoth);
      expect(result.current.error).toBeNull();
      expect(mockService.getCapabilities).toHaveBeenCalledWith('CONTRACT_ADDRESS');
    });

    it('should detect Ownable-only contract', async () => {
      const mockService = createMockAccessControlService({
        getCapabilities: vi.fn().mockResolvedValue(mockCapabilitiesOwnableOnly),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(
        () => useContractCapabilities(mockAdapter, 'CONTRACT_ADDRESS'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.capabilities?.hasOwnable).toBe(true);
      expect(result.current.capabilities?.hasAccessControl).toBe(false);
    });

    it('should detect AccessControl-only contract', async () => {
      const mockService = createMockAccessControlService({
        getCapabilities: vi.fn().mockResolvedValue(mockCapabilitiesAccessControlOnly),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(
        () => useContractCapabilities(mockAdapter, 'CONTRACT_ADDRESS'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.capabilities?.hasOwnable).toBe(false);
      expect(result.current.capabilities?.hasAccessControl).toBe(true);
    });

    it('should detect unsupported contract (neither interface)', async () => {
      const mockService = createMockAccessControlService({
        getCapabilities: vi.fn().mockResolvedValue(mockCapabilitiesNone),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(
        () => useContractCapabilities(mockAdapter, 'CONTRACT_ADDRESS'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.capabilities?.hasOwnable).toBe(false);
      expect(result.current.capabilities?.hasAccessControl).toBe(false);
    });
  });

  describe('isSupported helper', () => {
    it('should return true when contract has AccessControl', async () => {
      const mockService = createMockAccessControlService({
        getCapabilities: vi.fn().mockResolvedValue(mockCapabilitiesAccessControlOnly),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(
        () => useContractCapabilities(mockAdapter, 'CONTRACT_ADDRESS'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isSupported).toBe(true);
    });

    it('should return true when contract has Ownable', async () => {
      const mockService = createMockAccessControlService({
        getCapabilities: vi.fn().mockResolvedValue(mockCapabilitiesOwnableOnly),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(
        () => useContractCapabilities(mockAdapter, 'CONTRACT_ADDRESS'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isSupported).toBe(true);
    });

    it('should return false when contract has neither interface', async () => {
      const mockService = createMockAccessControlService({
        getCapabilities: vi.fn().mockResolvedValue(mockCapabilitiesNone),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(
        () => useContractCapabilities(mockAdapter, 'CONTRACT_ADDRESS'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isSupported).toBe(false);
    });

    it('should return false when capabilities are null', () => {
      const { result } = renderHook(() => useContractCapabilities(null, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isSupported).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should set error state when getCapabilities fails', async () => {
      const mockService = createMockAccessControlService({
        getCapabilities: vi.fn().mockRejectedValue(new Error('Network error')),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(
        () => useContractCapabilities(mockAdapter, 'CONTRACT_ADDRESS'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Network error');
      expect(result.current.capabilities).toBeNull();
    });

    it('should handle non-Error exceptions', async () => {
      const mockService = createMockAccessControlService({
        getCapabilities: vi.fn().mockRejectedValue('string error'),
      });
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(
        () => useContractCapabilities(mockAdapter, 'CONTRACT_ADDRESS'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe('refetch functionality', () => {
    it('should provide refetch function', async () => {
      const mockService = createMockAccessControlService();
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(
        () => useContractCapabilities(mockAdapter, 'CONTRACT_ADDRESS'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');

      // Trigger refetch
      await act(async () => {
        await result.current.refetch();
      });

      // Should have been called twice (initial + refetch)
      expect(mockService.getCapabilities).toHaveBeenCalledTimes(2);
    });
  });

  describe('query key management', () => {
    it('should refetch when contract address changes', async () => {
      const mockService = createMockAccessControlService();
      const mockAdapter = createMockAdapter(mockService);

      const { result, rerender } = renderHook(
        ({ address }) => useContractCapabilities(mockAdapter, address),
        {
          wrapper: createWrapper(),
          initialProps: { address: 'CONTRACT_A' },
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockService.getCapabilities).toHaveBeenCalledWith('CONTRACT_A');

      // Change address
      rerender({ address: 'CONTRACT_B' });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockService.getCapabilities).toHaveBeenCalledWith('CONTRACT_B');
    });
  });

  describe('return type interface', () => {
    it('should match UseContractCapabilitiesReturn interface', async () => {
      const mockService = createMockAccessControlService();
      const mockAdapter = createMockAdapter(mockService);

      const { result } = renderHook(
        () => useContractCapabilities(mockAdapter, 'CONTRACT_ADDRESS'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current).toHaveProperty('capabilities');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('refetch');
      expect(result.current).toHaveProperty('isSupported');

      expect(typeof result.current.refetch).toBe('function');
      expect(typeof result.current.isSupported).toBe('boolean');
    });
  });
});
