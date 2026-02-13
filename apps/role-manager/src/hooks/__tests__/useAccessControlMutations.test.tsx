/**
 * Tests for useAccessControlMutations hooks
 * Feature: 006-access-control-service
 *
 * Tests the mutation hooks for granting roles, revoking roles, and transferring ownership.
 * Covers network disconnection handling, user rejection handling, and query invalidation.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';

import type {
  AccessControlService,
  ContractAdapter,
  ExecutionConfig,
  NetworkConfig,
  OperationResult,
  TransactionStatusUpdate,
  TxStatus,
} from '@openzeppelin/ui-types';

import {
  useAcceptOwnership,
  useExportSnapshot,
  useGrantRole,
  useRevokeRole,
  useTransferOwnership,
  type AccessSnapshot,
} from '../useAccessControlMutations';

// Test fixtures
const mockNetworkConfig: NetworkConfig = {
  id: 'stellar-testnet',
  name: 'Stellar Testnet',
  ecosystem: 'stellar',
  network: 'stellar',
  type: 'testnet',
  isTestnet: true,
} as NetworkConfig;

const mockExecutionConfig: ExecutionConfig = {
  method: 'eoa',
} as ExecutionConfig;

const mockOperationResult: OperationResult = {
  id: 'tx-123456',
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
    getCurrentRoles: vi.fn().mockResolvedValue([]),
    getOwnership: vi
      .fn()
      .mockResolvedValue({ owner: '0x1111111111111111111111111111111111111111' }),
    grantRole: vi.fn().mockResolvedValue(mockOperationResult),
    revokeRole: vi.fn().mockResolvedValue(mockOperationResult),
    transferOwnership: vi.fn().mockResolvedValue(mockOperationResult),
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

// Error class for network disconnection
class NetworkDisconnectedError extends Error {
  constructor(message = 'Network disconnected') {
    super(message);
    this.name = 'NetworkDisconnectedError';
  }
}

// Error class for user rejection
class UserRejectedError extends Error {
  constructor(message = 'User rejected the transaction') {
    super(message);
    this.name = 'UserRejectedError';
  }
}

// React Query wrapper factory
const createWrapper = (queryClient?: QueryClient) => {
  const client =
    queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    });

  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
};

describe('useGrantRole', () => {
  let mockService: AccessControlService;
  let mockAdapter: ContractAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = createMockAccessControlService();
    mockAdapter = createMockAdapter(mockService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return idle state initially', () => {
      const { result } = renderHook(() => useGrantRole(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.status).toBe('idle');
      expect(result.current.statusDetails).toBeNull();
    });

    it('should not be ready when adapter is null', () => {
      const { result } = renderHook(() => useGrantRole(null, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isReady).toBe(false);
    });

    it('should not be ready when adapter does not support access control', () => {
      const adapterWithoutAC = createMockAdapter(null);
      const { result } = renderHook(() => useGrantRole(adapterWithoutAC, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isReady).toBe(false);
    });

    it('should be ready when adapter supports access control', () => {
      const { result } = renderHook(() => useGrantRole(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isReady).toBe(true);
    });
  });

  describe('successful grant role', () => {
    it('should call grantRole on the service with correct parameters', async () => {
      const { result } = renderHook(() => useGrantRole(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          roleId: 'MINTER_ROLE',
          account: '0x2222222222222222222222222222222222222222',
          executionConfig: mockExecutionConfig,
        });
      });

      expect(mockService.grantRole).toHaveBeenCalledWith(
        'CONTRACT_ADDRESS',
        'MINTER_ROLE',
        '0x2222222222222222222222222222222222222222',
        mockExecutionConfig,
        expect.any(Function),
        undefined
      );
    });

    it('should return operation result on success', async () => {
      const { result } = renderHook(() => useGrantRole(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      let operationResult: OperationResult | undefined;
      await act(async () => {
        operationResult = await result.current.mutateAsync({
          roleId: 'MINTER_ROLE',
          account: '0x2222222222222222222222222222222222222222',
          executionConfig: mockExecutionConfig,
        });
      });

      expect(operationResult).toEqual(mockOperationResult);
    });

    it('should track transaction status changes', async () => {
      const statusChanges: { status: TxStatus; details: TransactionStatusUpdate }[] = [];

      // Mock service that calls onStatusChange
      const mockServiceWithStatus = createMockAccessControlService({
        grantRole: vi
          .fn()
          .mockImplementation(
            async (
              _addr: string,
              _role: string,
              _account: string,
              _config: ExecutionConfig,
              onStatusChange?: (status: TxStatus, details: TransactionStatusUpdate) => void
            ) => {
              if (onStatusChange) {
                onStatusChange('pendingSignature', { title: 'Sign transaction' });
                onStatusChange('pendingConfirmation', {
                  txHash: '0xabc123',
                  title: 'Waiting for confirmation',
                });
                onStatusChange('success', { txHash: '0xabc123', title: 'Transaction confirmed' });
              }
              return mockOperationResult;
            }
          ),
      });
      const adapter = createMockAdapter(mockServiceWithStatus);

      const { result } = renderHook(
        () =>
          useGrantRole(adapter, 'CONTRACT_ADDRESS', {
            onStatusChange: (status, details) => {
              statusChanges.push({ status, details });
            },
          }),
        {
          wrapper: createWrapper(),
        }
      );

      await act(async () => {
        await result.current.mutateAsync({
          roleId: 'MINTER_ROLE',
          account: '0x2222222222222222222222222222222222222222',
          executionConfig: mockExecutionConfig,
        });
      });

      expect(statusChanges).toHaveLength(3);
      expect(statusChanges[0].status).toBe('pendingSignature');
      expect(statusChanges[1].status).toBe('pendingConfirmation');
      expect(statusChanges[2].status).toBe('success');
    });

    it('should support runtime API key', async () => {
      const { result } = renderHook(() => useGrantRole(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          roleId: 'MINTER_ROLE',
          account: '0x2222222222222222222222222222222222222222',
          executionConfig: mockExecutionConfig,
          runtimeApiKey: 'my-api-key',
        });
      });

      expect(mockService.grantRole).toHaveBeenCalledWith(
        'CONTRACT_ADDRESS',
        'MINTER_ROLE',
        '0x2222222222222222222222222222222222222222',
        mockExecutionConfig,
        expect.any(Function),
        'my-api-key'
      );
    });
  });

  describe('error handling', () => {
    it('should set error state when grantRole fails', async () => {
      const mockServiceWithError = createMockAccessControlService({
        grantRole: vi.fn().mockRejectedValue(new Error('Transaction failed')),
      });
      const adapter = createMockAdapter(mockServiceWithError);

      const { result } = renderHook(() => useGrantRole(adapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            roleId: 'MINTER_ROLE',
            account: '0x2222222222222222222222222222222222222222',
            executionConfig: mockExecutionConfig,
          });
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Transaction failed');
    });

    it('should handle network disconnection error (CHK018)', async () => {
      const mockServiceWithNetworkError = createMockAccessControlService({
        grantRole: vi.fn().mockRejectedValue(new NetworkDisconnectedError()),
      });
      const adapter = createMockAdapter(mockServiceWithNetworkError);

      const { result } = renderHook(() => useGrantRole(adapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            roleId: 'MINTER_ROLE',
            account: '0x2222222222222222222222222222222222222222',
            executionConfig: mockExecutionConfig,
          });
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain('Network disconnected');
      expect(result.current.isNetworkError).toBe(true);
    });

    it('should handle user rejection error (CHK019)', async () => {
      const mockServiceWithRejection = createMockAccessControlService({
        grantRole: vi.fn().mockRejectedValue(new UserRejectedError()),
      });
      const adapter = createMockAdapter(mockServiceWithRejection);

      const { result } = renderHook(() => useGrantRole(adapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            roleId: 'MINTER_ROLE',
            account: '0x2222222222222222222222222222222222222222',
            executionConfig: mockExecutionConfig,
          });
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain('rejected');
      expect(result.current.isUserRejection).toBe(true);
    });

    it('should throw error when service is not ready', async () => {
      const adapterWithoutAC = createMockAdapter(null);
      const { result } = renderHook(() => useGrantRole(adapterWithoutAC, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            roleId: 'MINTER_ROLE',
            account: '0x2222222222222222222222222222222222222222',
            executionConfig: mockExecutionConfig,
          });
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain('not available');
    });
  });

  describe('query invalidation (CHK022)', () => {
    it('should invalidate roles query on successful grant', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
          mutations: { retry: false },
        },
      });

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useGrantRole(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          roleId: 'MINTER_ROLE',
          account: '0x2222222222222222222222222222222222222222',
          executionConfig: mockExecutionConfig,
        });
      });

      // In test environment without active observers, both query keys are invalidated.
      // In production, smart invalidation may behave differently based on active observers.
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['contractRoles', 'CONTRACT_ADDRESS'],
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['contractRolesEnriched', 'CONTRACT_ADDRESS'],
      });
    });

    it('should not invalidate queries on failed mutation', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
          mutations: { retry: false },
        },
      });

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const mockServiceWithError = createMockAccessControlService({
        grantRole: vi.fn().mockRejectedValue(new Error('Failed')),
      });
      const adapter = createMockAdapter(mockServiceWithError);

      const { result } = renderHook(() => useGrantRole(adapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            roleId: 'MINTER_ROLE',
            account: '0x2222222222222222222222222222222222222222',
            executionConfig: mockExecutionConfig,
          });
        } catch {
          // Expected
        }
      });

      expect(invalidateQueriesSpy).not.toHaveBeenCalled();
    });

    it('should cancel and invalidate basic query when enriched has observers', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
          mutations: { retry: false },
        },
      });

      // Set up an enriched roles query with an observer count > 0
      // We mock the getQueryCache().find() to return a query with observers
      const cancelQueriesSpy = vi.spyOn(queryClient, 'cancelQueries');
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      // Mock the query cache to simulate having active observers on enriched query
      const mockQuery = { getObserversCount: () => 1 };
      vi.spyOn(queryClient.getQueryCache(), 'find').mockReturnValue(mockQuery as never);

      const { result } = renderHook(() => useGrantRole(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          roleId: 'MINTER_ROLE',
          account: '0x2222222222222222222222222222222222222222',
          executionConfig: mockExecutionConfig,
        });
      });

      // When enriched has observers, basic query is cancelled then invalidated
      expect(cancelQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['contractRoles', 'CONTRACT_ADDRESS'],
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['contractRoles', 'CONTRACT_ADDRESS'],
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['contractRolesEnriched', 'CONTRACT_ADDRESS'],
      });
    });

    it('should invalidate both queries without cancel when no enriched observers', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
          mutations: { retry: false },
        },
      });

      const cancelQueriesSpy = vi.spyOn(queryClient, 'cancelQueries');
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      // Mock the query cache to simulate NO active observers on enriched query
      const mockQuery = { getObserversCount: () => 0 };
      vi.spyOn(queryClient.getQueryCache(), 'find').mockReturnValue(mockQuery as never);

      const { result } = renderHook(() => useGrantRole(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          roleId: 'MINTER_ROLE',
          account: '0x2222222222222222222222222222222222222222',
          executionConfig: mockExecutionConfig,
        });
      });

      // When no enriched observers, both queries are invalidated without cancel
      expect(cancelQueriesSpy).not.toHaveBeenCalled();
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['contractRoles', 'CONTRACT_ADDRESS'],
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['contractRolesEnriched', 'CONTRACT_ADDRESS'],
      });
    });
  });

  describe('reset functionality', () => {
    it('should reset state after error', async () => {
      const mockServiceWithError = createMockAccessControlService({
        grantRole: vi.fn().mockRejectedValue(new Error('Transaction failed')),
      });
      const adapter = createMockAdapter(mockServiceWithError);

      const { result } = renderHook(() => useGrantRole(adapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            roleId: 'MINTER_ROLE',
            account: '0x2222222222222222222222222222222222222222',
            executionConfig: mockExecutionConfig,
          });
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.status).toBe('idle');
    });
  });
});

describe('useRevokeRole', () => {
  let mockService: AccessControlService;
  let mockAdapter: ContractAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = createMockAccessControlService();
    mockAdapter = createMockAdapter(mockService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return idle state initially', () => {
      const { result } = renderHook(() => useRevokeRole(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.status).toBe('idle');
    });

    it('should be ready when adapter supports access control', () => {
      const { result } = renderHook(() => useRevokeRole(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isReady).toBe(true);
    });
  });

  describe('successful revoke role', () => {
    it('should call revokeRole on the service with correct parameters', async () => {
      const { result } = renderHook(() => useRevokeRole(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          roleId: 'MINTER_ROLE',
          account: '0x2222222222222222222222222222222222222222',
          executionConfig: mockExecutionConfig,
        });
      });

      expect(mockService.revokeRole).toHaveBeenCalledWith(
        'CONTRACT_ADDRESS',
        'MINTER_ROLE',
        '0x2222222222222222222222222222222222222222',
        mockExecutionConfig,
        expect.any(Function),
        undefined
      );
    });

    it('should return operation result on success', async () => {
      const { result } = renderHook(() => useRevokeRole(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      let operationResult: OperationResult | undefined;
      await act(async () => {
        operationResult = await result.current.mutateAsync({
          roleId: 'MINTER_ROLE',
          account: '0x2222222222222222222222222222222222222222',
          executionConfig: mockExecutionConfig,
        });
      });

      expect(operationResult).toEqual(mockOperationResult);
    });
  });

  describe('error handling', () => {
    it('should handle network disconnection error', async () => {
      const mockServiceWithNetworkError = createMockAccessControlService({
        revokeRole: vi.fn().mockRejectedValue(new NetworkDisconnectedError()),
      });
      const adapter = createMockAdapter(mockServiceWithNetworkError);

      const { result } = renderHook(() => useRevokeRole(adapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            roleId: 'MINTER_ROLE',
            account: '0x2222222222222222222222222222222222222222',
            executionConfig: mockExecutionConfig,
          });
        } catch {
          // Expected
        }
      });

      expect(result.current.isNetworkError).toBe(true);
    });

    it('should handle user rejection error', async () => {
      const mockServiceWithRejection = createMockAccessControlService({
        revokeRole: vi.fn().mockRejectedValue(new UserRejectedError()),
      });
      const adapter = createMockAdapter(mockServiceWithRejection);

      const { result } = renderHook(() => useRevokeRole(adapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            roleId: 'MINTER_ROLE',
            account: '0x2222222222222222222222222222222222222222',
            executionConfig: mockExecutionConfig,
          });
        } catch {
          // Expected
        }
      });

      expect(result.current.isUserRejection).toBe(true);
    });
  });

  describe('query invalidation', () => {
    it('should invalidate roles query on successful revoke', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
          mutations: { retry: false },
        },
      });

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useRevokeRole(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          roleId: 'MINTER_ROLE',
          account: '0x2222222222222222222222222222222222222222',
          executionConfig: mockExecutionConfig,
        });
      });

      // In test environment without active observers, both query keys are invalidated.
      // In production, smart invalidation may behave differently based on active observers.
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['contractRoles', 'CONTRACT_ADDRESS'],
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['contractRolesEnriched', 'CONTRACT_ADDRESS'],
      });
    });
  });
});

describe('useTransferOwnership', () => {
  let mockService: AccessControlService;
  let mockAdapter: ContractAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = createMockAccessControlService();
    mockAdapter = createMockAdapter(mockService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return idle state initially', () => {
      const { result } = renderHook(() => useTransferOwnership(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.status).toBe('idle');
    });

    it('should be ready when adapter supports access control', () => {
      const { result } = renderHook(() => useTransferOwnership(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isReady).toBe(true);
    });
  });

  describe('successful transfer ownership', () => {
    it('should call transferOwnership on the service with correct parameters', async () => {
      const { result } = renderHook(() => useTransferOwnership(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          newOwner: '0x3333333333333333333333333333333333333333',
          expirationBlock: 12345,
          executionConfig: mockExecutionConfig,
        });
      });

      expect(mockService.transferOwnership).toHaveBeenCalledWith(
        'CONTRACT_ADDRESS',
        '0x3333333333333333333333333333333333333333',
        12345,
        mockExecutionConfig,
        expect.any(Function),
        undefined
      );
    });

    it('should return operation result on success', async () => {
      const { result } = renderHook(() => useTransferOwnership(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      let operationResult: OperationResult | undefined;
      await act(async () => {
        operationResult = await result.current.mutateAsync({
          newOwner: '0x3333333333333333333333333333333333333333',
          expirationBlock: 12345,
          executionConfig: mockExecutionConfig,
        });
      });

      expect(operationResult).toEqual(mockOperationResult);
    });

    it('should track transaction status changes', async () => {
      const statusChanges: { status: TxStatus; details: TransactionStatusUpdate }[] = [];

      const mockServiceWithStatus = createMockAccessControlService({
        transferOwnership: vi
          .fn()
          .mockImplementation(
            async (
              _addr: string,
              _newOwner: string,
              _expirationBlock: number,
              _config: ExecutionConfig,
              onStatusChange?: (status: TxStatus, details: TransactionStatusUpdate) => void
            ) => {
              if (onStatusChange) {
                onStatusChange('pendingSignature', { title: 'Sign transfer' });
                onStatusChange('success', { txHash: '0xdef456' });
              }
              return mockOperationResult;
            }
          ),
      });
      const adapter = createMockAdapter(mockServiceWithStatus);

      const { result } = renderHook(
        () =>
          useTransferOwnership(adapter, 'CONTRACT_ADDRESS', {
            onStatusChange: (status, details) => {
              statusChanges.push({ status, details });
            },
          }),
        {
          wrapper: createWrapper(),
        }
      );

      await act(async () => {
        await result.current.mutateAsync({
          newOwner: '0x3333333333333333333333333333333333333333',
          expirationBlock: 12345,
          executionConfig: mockExecutionConfig,
        });
      });

      expect(statusChanges).toHaveLength(2);
      expect(statusChanges[0].status).toBe('pendingSignature');
      expect(statusChanges[1].status).toBe('success');
    });
  });

  describe('error handling', () => {
    it('should handle network disconnection error', async () => {
      const mockServiceWithNetworkError = createMockAccessControlService({
        transferOwnership: vi.fn().mockRejectedValue(new NetworkDisconnectedError()),
      });
      const adapter = createMockAdapter(mockServiceWithNetworkError);

      const { result } = renderHook(() => useTransferOwnership(adapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            newOwner: '0x3333333333333333333333333333333333333333',
            expirationBlock: 12345,
            executionConfig: mockExecutionConfig,
          });
        } catch {
          // Expected
        }
      });

      expect(result.current.isNetworkError).toBe(true);
    });

    it('should handle user rejection error', async () => {
      const mockServiceWithRejection = createMockAccessControlService({
        transferOwnership: vi.fn().mockRejectedValue(new UserRejectedError()),
      });
      const adapter = createMockAdapter(mockServiceWithRejection);

      const { result } = renderHook(() => useTransferOwnership(adapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            newOwner: '0x3333333333333333333333333333333333333333',
            expirationBlock: 12345,
            executionConfig: mockExecutionConfig,
          });
        } catch {
          // Expected
        }
      });

      expect(result.current.isUserRejection).toBe(true);
    });
  });

  describe('query invalidation', () => {
    it('should invalidate ownership query on successful transfer', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
          mutations: { retry: false },
        },
      });

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useTransferOwnership(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          newOwner: '0x3333333333333333333333333333333333333333',
          expirationBlock: 12345,
          executionConfig: mockExecutionConfig,
        });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['contractOwnership', 'CONTRACT_ADDRESS'],
      });
    });
  });
});

describe('mutation hook integration', () => {
  it('should allow multiple mutations on the same contract', async () => {
    const mockService = createMockAccessControlService();
    const mockAdapter = createMockAdapter(mockService);

    const { result: grantResult } = renderHook(
      () => useGrantRole(mockAdapter, 'CONTRACT_ADDRESS'),
      { wrapper: createWrapper() }
    );

    const { result: revokeResult } = renderHook(
      () => useRevokeRole(mockAdapter, 'CONTRACT_ADDRESS'),
      { wrapper: createWrapper() }
    );

    // Grant a role
    await act(async () => {
      await grantResult.current.mutateAsync({
        roleId: 'MINTER_ROLE',
        account: '0x1111111111111111111111111111111111111111',
        executionConfig: mockExecutionConfig,
      });
    });

    // Revoke the same role
    await act(async () => {
      await revokeResult.current.mutateAsync({
        roleId: 'MINTER_ROLE',
        account: '0x1111111111111111111111111111111111111111',
        executionConfig: mockExecutionConfig,
      });
    });

    expect(mockService.grantRole).toHaveBeenCalledTimes(1);
    expect(mockService.revokeRole).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// useExportSnapshot Tests
// ============================================================================

describe('useExportSnapshot', () => {
  let mockService: AccessControlService;
  let mockAdapter: ContractAdapter;

  const mockCapabilities = {
    hasOwnable: true,
    hasAccessControl: true,
    hasEnumerableRoles: true,
    supportsHistory: false,
    verifiedAgainstOZInterfaces: true,
    notes: [],
  };

  const mockOwnership = { owner: '0x1111111111111111111111111111111111111111' };

  const mockRoles = [
    {
      role: { id: 'DEFAULT_ADMIN_ROLE', label: 'DEFAULT_ADMIN_ROLE' },
      members: ['0x1111111111111111111111111111111111111111'],
    },
    {
      role: { id: 'MINTER_ROLE', label: 'MINTER_ROLE' },
      members: ['0x2222222222222222222222222222222222222222'],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = createMockAccessControlService({
      getCapabilities: vi.fn().mockResolvedValue(mockCapabilities),
      getOwnership: vi.fn().mockResolvedValue(mockOwnership),
      getCurrentRoles: vi.fn().mockResolvedValue(mockRoles),
    });
    mockAdapter = createMockAdapter(mockService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return initial state correctly', () => {
      const { result } = renderHook(
        () =>
          useExportSnapshot(mockAdapter, 'CONTRACT_ADDRESS', {
            networkId: 'stellar-testnet',
            networkName: 'Stellar Testnet',
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isExporting).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isReady).toBe(true);
    });

    it('should not be ready when adapter is null', () => {
      const { result } = renderHook(
        () =>
          useExportSnapshot(null, 'CONTRACT_ADDRESS', {
            networkId: 'stellar-testnet',
            networkName: 'Stellar Testnet',
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isReady).toBe(false);
    });

    it('should not be ready when adapter lacks access control service', () => {
      const adapterWithoutService = createMockAdapter(null);

      const { result } = renderHook(
        () =>
          useExportSnapshot(adapterWithoutService, 'CONTRACT_ADDRESS', {
            networkId: 'stellar-testnet',
            networkName: 'Stellar Testnet',
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isReady).toBe(false);
    });
  });

  describe('successful export', () => {
    it('should export snapshot with all data', async () => {
      const onSuccess = vi.fn();

      const { result } = renderHook(
        () =>
          useExportSnapshot(mockAdapter, 'CONTRACT_ADDRESS', {
            networkId: 'stellar-testnet',
            networkName: 'Stellar Testnet',
            onSuccess,
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.exportSnapshot();
      });

      // Verify service methods were called
      expect(mockService.getCapabilities).toHaveBeenCalledWith('CONTRACT_ADDRESS');
      expect(mockService.getOwnership).toHaveBeenCalledWith('CONTRACT_ADDRESS');
      expect(mockService.getCurrentRoles).toHaveBeenCalledWith('CONTRACT_ADDRESS');

      // Verify onSuccess was called with correct snapshot structure
      expect(onSuccess).toHaveBeenCalledTimes(1);
      const snapshot: AccessSnapshot = onSuccess.mock.calls[0][0];

      // Verify schema-compliant structure
      expect(snapshot.version).toBe('1.0');
      expect(snapshot.exportedAt).toBeDefined();
      expect(snapshot.contract).toEqual({
        address: 'CONTRACT_ADDRESS',
        label: null,
        networkId: 'stellar-testnet',
        networkName: 'Stellar Testnet',
      });
      expect(snapshot.capabilities).toEqual({
        hasAccessControl: mockCapabilities.hasAccessControl,
        hasOwnable: mockCapabilities.hasOwnable,
        hasEnumerableRoles: mockCapabilities.hasEnumerableRoles,
      });
      // pendingOwner is not currently provided by the adapter's OwnershipInfo
      expect(snapshot.ownership).toEqual({
        owner: mockOwnership.owner,
      });
      // Roles should be transformed to roleId/roleName format
      expect(snapshot.roles).toEqual([
        {
          roleId: 'DEFAULT_ADMIN_ROLE',
          roleName: 'DEFAULT_ADMIN_ROLE',
          members: ['0x1111111111111111111111111111111111111111'],
        },
        {
          roleId: 'MINTER_ROLE',
          roleName: 'MINTER_ROLE',
          members: ['0x2222222222222222222222222222222222222222'],
        },
      ]);
    });

    it('should fetch all data in parallel', async () => {
      const onSuccess = vi.fn();

      const { result } = renderHook(
        () =>
          useExportSnapshot(mockAdapter, 'CONTRACT_ADDRESS', {
            networkId: 'stellar-testnet',
            networkName: 'Stellar Testnet',
            onSuccess,
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.exportSnapshot();
      });

      // All three service methods should be called
      expect(mockService.getCapabilities).toHaveBeenCalledTimes(1);
      expect(mockService.getOwnership).toHaveBeenCalledTimes(1);
      expect(mockService.getCurrentRoles).toHaveBeenCalledTimes(1);
    });

    it('should set isExporting to true during export', async () => {
      let resolveCapabilities: (value: unknown) => void;
      const capabilitiesPromise = new Promise((resolve) => {
        resolveCapabilities = resolve;
      });

      const slowService = createMockAccessControlService({
        getCapabilities: vi.fn().mockReturnValue(capabilitiesPromise),
      });
      const slowAdapter = createMockAdapter(slowService);

      const { result } = renderHook(
        () =>
          useExportSnapshot(slowAdapter, 'CONTRACT_ADDRESS', {
            networkId: 'stellar-testnet',
            networkName: 'Stellar Testnet',
          }),
        { wrapper: createWrapper() }
      );

      // Start export but don't await
      let exportPromise: Promise<void>;
      act(() => {
        exportPromise = result.current.exportSnapshot();
      });

      // Should be exporting
      expect(result.current.isExporting).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolveCapabilities!(mockCapabilities);
        await exportPromise;
      });

      // Should no longer be exporting
      expect(result.current.isExporting).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should set error when service is not available', async () => {
      const adapterWithoutService = createMockAdapter(null);
      const onError = vi.fn();

      const { result } = renderHook(
        () =>
          useExportSnapshot(adapterWithoutService, 'CONTRACT_ADDRESS', {
            networkId: 'stellar-testnet',
            networkName: 'Stellar Testnet',
            onError,
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.exportSnapshot();
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Access control service not available');
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should set error when contract address is empty', async () => {
      const onError = vi.fn();

      const { result } = renderHook(
        () =>
          useExportSnapshot(mockAdapter, '', {
            networkId: 'stellar-testnet',
            networkName: 'Stellar Testnet',
            onError,
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.exportSnapshot();
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Contract address is required');
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle service method failures', async () => {
      const errorService = createMockAccessControlService({
        getCapabilities: vi.fn().mockRejectedValue(new Error('Failed to fetch capabilities')),
      });
      const errorAdapter = createMockAdapter(errorService);
      const onError = vi.fn();

      const { result } = renderHook(
        () =>
          useExportSnapshot(errorAdapter, 'CONTRACT_ADDRESS', {
            networkId: 'stellar-testnet',
            networkName: 'Stellar Testnet',
            onError,
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.exportSnapshot();
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to fetch capabilities');
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      expect(result.current.isExporting).toBe(false);
    });

    it('should handle non-Error exceptions', async () => {
      const errorService = createMockAccessControlService({
        getCapabilities: vi.fn().mockRejectedValue('String error'),
      });
      const errorAdapter = createMockAdapter(errorService);

      const { result } = renderHook(
        () =>
          useExportSnapshot(errorAdapter, 'CONTRACT_ADDRESS', {
            networkId: 'stellar-testnet',
            networkName: 'Stellar Testnet',
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.exportSnapshot();
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('String error');
    });
  });

  describe('reset functionality', () => {
    it('should reset error state', async () => {
      const adapterWithoutService = createMockAdapter(null);

      const { result } = renderHook(
        () =>
          useExportSnapshot(adapterWithoutService, 'CONTRACT_ADDRESS', {
            networkId: 'stellar-testnet',
            networkName: 'Stellar Testnet',
          }),
        { wrapper: createWrapper() }
      );

      // Trigger an error
      await act(async () => {
        await result.current.exportSnapshot();
      });

      expect(result.current.error).not.toBeNull();

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isExporting).toBe(false);
    });
  });

  describe('snapshot data structure', () => {
    it('should include valid ISO timestamp', async () => {
      const onSuccess = vi.fn();

      const { result } = renderHook(
        () =>
          useExportSnapshot(mockAdapter, 'CONTRACT_ADDRESS', {
            networkId: 'stellar-testnet',
            networkName: 'Stellar Testnet',
            onSuccess,
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.exportSnapshot();
      });

      const snapshot: AccessSnapshot = onSuccess.mock.calls[0][0];
      const parsedDate = new Date(snapshot.exportedAt);
      expect(parsedDate.toString()).not.toBe('Invalid Date');
    });

    it('should include correct version', async () => {
      const onSuccess = vi.fn();

      const { result } = renderHook(
        () =>
          useExportSnapshot(mockAdapter, 'CONTRACT_ADDRESS', {
            networkId: 'stellar-testnet',
            networkName: 'Stellar Testnet',
            onSuccess,
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.exportSnapshot();
      });

      const snapshot: AccessSnapshot = onSuccess.mock.calls[0][0];
      expect(snapshot.version).toBe('1.0');
    });
  });
});

// ============================================================================
// useAcceptOwnership Tests (Feature: 015-ownership-transfer)
// ============================================================================

describe('useAcceptOwnership', () => {
  let mockService: AccessControlService;
  let mockAdapter: ContractAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = createMockAccessControlService({
      acceptOwnership: vi.fn().mockResolvedValue(mockOperationResult),
    });
    mockAdapter = createMockAdapter(mockService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return idle state initially', () => {
      const { result } = renderHook(() => useAcceptOwnership(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isPending).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.status).toBe('idle');
      expect(result.current.statusDetails).toBeNull();
    });

    it('should not be ready when adapter is null', () => {
      const { result } = renderHook(() => useAcceptOwnership(null, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isReady).toBe(false);
    });

    it('should not be ready when adapter does not support access control', () => {
      const adapterWithoutAC = createMockAdapter(null);
      const { result } = renderHook(
        () => useAcceptOwnership(adapterWithoutAC, 'CONTRACT_ADDRESS'),
        {
          wrapper: createWrapper(),
        }
      );

      expect(result.current.isReady).toBe(false);
    });

    it('should be ready when adapter supports access control', () => {
      const { result } = renderHook(() => useAcceptOwnership(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      expect(result.current.isReady).toBe(true);
    });
  });

  describe('successful accept ownership', () => {
    it('should call acceptOwnership on the service with correct parameters', async () => {
      const { result } = renderHook(() => useAcceptOwnership(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          executionConfig: mockExecutionConfig,
        });
      });

      expect(mockService.acceptOwnership).toHaveBeenCalledWith(
        'CONTRACT_ADDRESS',
        mockExecutionConfig,
        expect.any(Function),
        undefined
      );
    });

    it('should return operation result on success', async () => {
      const { result } = renderHook(() => useAcceptOwnership(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      let operationResult: OperationResult | undefined;
      await act(async () => {
        operationResult = await result.current.mutateAsync({
          executionConfig: mockExecutionConfig,
        });
      });

      expect(operationResult).toEqual(mockOperationResult);
    });

    it('should track transaction status changes', async () => {
      const statusChanges: { status: TxStatus; details: TransactionStatusUpdate }[] = [];

      // Mock service that calls onStatusChange
      const mockServiceWithStatus = createMockAccessControlService({
        acceptOwnership: vi
          .fn()
          .mockImplementation(
            async (
              _addr: string,
              _config: ExecutionConfig,
              onStatusChange?: (status: TxStatus, details: TransactionStatusUpdate) => void
            ) => {
              if (onStatusChange) {
                onStatusChange('pendingSignature', { title: 'Sign acceptance' });
                onStatusChange('pendingConfirmation', {
                  txHash: '0xaccept123',
                  title: 'Waiting for confirmation',
                });
                onStatusChange('success', { txHash: '0xaccept123', title: 'Ownership accepted' });
              }
              return mockOperationResult;
            }
          ),
      });
      const adapter = createMockAdapter(mockServiceWithStatus);

      const { result } = renderHook(
        () =>
          useAcceptOwnership(adapter, 'CONTRACT_ADDRESS', {
            onStatusChange: (status, details) => {
              statusChanges.push({ status, details });
            },
          }),
        {
          wrapper: createWrapper(),
        }
      );

      await act(async () => {
        await result.current.mutateAsync({
          executionConfig: mockExecutionConfig,
        });
      });

      expect(statusChanges).toHaveLength(3);
      expect(statusChanges[0].status).toBe('pendingSignature');
      expect(statusChanges[1].status).toBe('pendingConfirmation');
      expect(statusChanges[2].status).toBe('success');
    });

    it('should support runtime API key', async () => {
      const { result } = renderHook(() => useAcceptOwnership(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          executionConfig: mockExecutionConfig,
          runtimeApiKey: 'my-api-key',
        });
      });

      expect(mockService.acceptOwnership).toHaveBeenCalledWith(
        'CONTRACT_ADDRESS',
        mockExecutionConfig,
        expect.any(Function),
        'my-api-key'
      );
    });
  });

  describe('error handling', () => {
    it('should set error state when acceptOwnership fails', async () => {
      const mockServiceWithError = createMockAccessControlService({
        acceptOwnership: vi.fn().mockRejectedValue(new Error('Acceptance failed')),
      });
      const adapter = createMockAdapter(mockServiceWithError);

      const { result } = renderHook(() => useAcceptOwnership(adapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            executionConfig: mockExecutionConfig,
          });
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Acceptance failed');
    });

    it('should handle network disconnection error', async () => {
      const mockServiceWithNetworkError = createMockAccessControlService({
        acceptOwnership: vi.fn().mockRejectedValue(new NetworkDisconnectedError()),
      });
      const adapter = createMockAdapter(mockServiceWithNetworkError);

      const { result } = renderHook(() => useAcceptOwnership(adapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            executionConfig: mockExecutionConfig,
          });
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.isNetworkError).toBe(true);
    });

    it('should handle user rejection error', async () => {
      const mockServiceWithRejection = createMockAccessControlService({
        acceptOwnership: vi.fn().mockRejectedValue(new UserRejectedError()),
      });
      const adapter = createMockAdapter(mockServiceWithRejection);

      const { result } = renderHook(() => useAcceptOwnership(adapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            executionConfig: mockExecutionConfig,
          });
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.isUserRejection).toBe(true);
    });

    it('should throw error when service is not ready', async () => {
      const adapterWithoutAC = createMockAdapter(null);
      const { result } = renderHook(
        () => useAcceptOwnership(adapterWithoutAC, 'CONTRACT_ADDRESS'),
        {
          wrapper: createWrapper(),
        }
      );

      await act(async () => {
        try {
          await result.current.mutateAsync({
            executionConfig: mockExecutionConfig,
          });
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain('not available');
    });
  });

  describe('query invalidation', () => {
    it('should invalidate ownership query on successful acceptance', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
          mutations: { retry: false },
        },
      });

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useAcceptOwnership(mockAdapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          executionConfig: mockExecutionConfig,
        });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['contractOwnership', 'CONTRACT_ADDRESS'],
      });
    });

    it('should not invalidate queries on failed mutation', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
          mutations: { retry: false },
        },
      });

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const mockServiceWithError = createMockAccessControlService({
        acceptOwnership: vi.fn().mockRejectedValue(new Error('Failed')),
      });
      const adapter = createMockAdapter(mockServiceWithError);

      const { result } = renderHook(() => useAcceptOwnership(adapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            executionConfig: mockExecutionConfig,
          });
        } catch {
          // Expected
        }
      });

      expect(invalidateQueriesSpy).not.toHaveBeenCalled();
    });
  });

  describe('reset functionality', () => {
    it('should reset state after error', async () => {
      const mockServiceWithError = createMockAccessControlService({
        acceptOwnership: vi.fn().mockRejectedValue(new Error('Acceptance failed')),
      });
      const adapter = createMockAdapter(mockServiceWithError);

      const { result } = renderHook(() => useAcceptOwnership(adapter, 'CONTRACT_ADDRESS'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            executionConfig: mockExecutionConfig,
          });
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.status).toBe('idle');
    });
  });
});

// ============================================================================
// EVM Adapter Mock Tests (Feature: 017-evm-access-control, T025)
// ============================================================================

/**
 * Tests that useGrantRole and useRevokeRole work correctly with EVM-style
 * adapter mocks, including EVM addresses, bytes32 role hashes, and
 * EVM transaction status flow.
 */
describe('EVM Adapter: useGrantRole', () => {
  // EVM-specific test fixtures
  const evmNetworkConfig: NetworkConfig = {
    id: 'evm-sepolia',
    name: 'Sepolia',
    ecosystem: 'evm',
    network: 'sepolia',
    type: 'testnet',
    isTestnet: true,
  } as NetworkConfig;

  // Well-known EVM role hashes (keccak256)
  const EVM_MINTER_ROLE = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6';
  const EVM_DEFAULT_ADMIN_ROLE =
    '0x0000000000000000000000000000000000000000000000000000000000000000';
  const EVM_ACCOUNT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  const EVM_CONTRACT = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

  const createEvmMockService = (overrides?: Partial<AccessControlService>): AccessControlService =>
    ({
      getCapabilities: vi.fn().mockResolvedValue({
        hasOwnable: true,
        hasAccessControl: true,
        hasEnumerableRoles: true,
        supportsHistory: false,
        verifiedAgainstOZInterfaces: true,
        notes: [],
        hasTwoStepOwnable: true,
      }),
      getCurrentRoles: vi.fn().mockResolvedValue([]),
      getOwnership: vi.fn().mockResolvedValue({ owner: EVM_ACCOUNT }),
      grantRole: vi.fn().mockResolvedValue(mockOperationResult),
      revokeRole: vi.fn().mockResolvedValue(mockOperationResult),
      transferOwnership: vi.fn().mockResolvedValue(mockOperationResult),
      ...overrides,
    }) as AccessControlService;

  const createEvmAdapter = (service?: AccessControlService | null): ContractAdapter => {
    const mockService = service === null ? undefined : (service ?? createEvmMockService());

    return {
      networkConfig: evmNetworkConfig,
      isValidAddress: vi.fn().mockImplementation((addr: string) => {
        // EVM address validation: 0x-prefixed, 42 chars, hex
        return /^0x[0-9a-fA-F]{40}$/.test(addr);
      }),
      getAccessControlService: mockService ? vi.fn().mockReturnValue(mockService) : undefined,
    } as unknown as ContractAdapter;
  };

  let evmService: AccessControlService;
  let evmAdapter: ContractAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    evmService = createEvmMockService();
    evmAdapter = createEvmAdapter(evmService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization with EVM adapter', () => {
    it('should be ready when EVM adapter supports access control', () => {
      const { result } = renderHook(() => useGrantRole(evmAdapter, EVM_CONTRACT), {
        wrapper: createWrapper(),
      });

      expect(result.current.isReady).toBe(true);
      expect(result.current.isPending).toBe(false);
      expect(result.current.status).toBe('idle');
    });

    it('should validate EVM addresses via adapter.isValidAddress', () => {
      expect(evmAdapter.isValidAddress!(EVM_ACCOUNT)).toBe(true);
      expect(evmAdapter.isValidAddress!('0xinvalid')).toBe(false);
      expect(evmAdapter.isValidAddress!('not-an-address')).toBe(false);
    });
  });

  describe('grant role with EVM bytes32 role hash', () => {
    it('should pass EVM bytes32 role hash to service.grantRole', async () => {
      const { result } = renderHook(() => useGrantRole(evmAdapter, EVM_CONTRACT), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          roleId: EVM_MINTER_ROLE,
          account: EVM_ACCOUNT,
          executionConfig: mockExecutionConfig,
        });
      });

      expect(evmService.grantRole).toHaveBeenCalledWith(
        EVM_CONTRACT,
        EVM_MINTER_ROLE,
        EVM_ACCOUNT,
        mockExecutionConfig,
        expect.any(Function),
        undefined
      );
    });

    it('should pass DEFAULT_ADMIN_ROLE (zero hash) correctly', async () => {
      const { result } = renderHook(() => useGrantRole(evmAdapter, EVM_CONTRACT), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          roleId: EVM_DEFAULT_ADMIN_ROLE,
          account: EVM_ACCOUNT,
          executionConfig: mockExecutionConfig,
        });
      });

      expect(evmService.grantRole).toHaveBeenCalledWith(
        EVM_CONTRACT,
        EVM_DEFAULT_ADMIN_ROLE,
        EVM_ACCOUNT,
        mockExecutionConfig,
        expect.any(Function),
        undefined
      );
    });

    it('should return operation result on EVM grant success', async () => {
      const { result } = renderHook(() => useGrantRole(evmAdapter, EVM_CONTRACT), {
        wrapper: createWrapper(),
      });

      let operationResult: OperationResult | undefined;
      await act(async () => {
        operationResult = await result.current.mutateAsync({
          roleId: EVM_MINTER_ROLE,
          account: EVM_ACCOUNT,
          executionConfig: mockExecutionConfig,
        });
      });

      expect(operationResult).toEqual(mockOperationResult);
    });
  });

  describe('EVM transaction status flow', () => {
    it('should track EVM signing → broadcasting → confirming → confirmed flow', async () => {
      const statusChanges: { status: TxStatus; details: TransactionStatusUpdate }[] = [];

      const evmServiceWithStatus = createEvmMockService({
        grantRole: vi
          .fn()
          .mockImplementation(
            async (
              _addr: string,
              _role: string,
              _account: string,
              _config: ExecutionConfig,
              onStatusChange?: (status: TxStatus, details: TransactionStatusUpdate) => void
            ) => {
              if (onStatusChange) {
                onStatusChange('pendingSignature', { title: 'Sign in MetaMask' });
                onStatusChange('pendingRelayer', {
                  txHash: '0xabc123def456',
                  title: 'Broadcasting to Sepolia',
                });
                onStatusChange('pendingConfirmation', {
                  txHash: '0xabc123def456',
                  title: 'Waiting for block confirmation',
                });
                onStatusChange('success', {
                  txHash: '0xabc123def456',
                  title: 'Transaction confirmed',
                });
              }
              return mockOperationResult;
            }
          ),
      });
      const adapter = createEvmAdapter(evmServiceWithStatus);

      const { result } = renderHook(
        () =>
          useGrantRole(adapter, EVM_CONTRACT, {
            onStatusChange: (status, details) => {
              statusChanges.push({ status, details });
            },
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.mutateAsync({
          roleId: EVM_MINTER_ROLE,
          account: EVM_ACCOUNT,
          executionConfig: mockExecutionConfig,
        });
      });

      expect(statusChanges).toHaveLength(4);
      expect(statusChanges[0].status).toBe('pendingSignature');
      expect(statusChanges[0].details.title).toBe('Sign in MetaMask');
      expect(statusChanges[1].status).toBe('pendingRelayer');
      expect(statusChanges[2].status).toBe('pendingConfirmation');
      expect(statusChanges[3].status).toBe('success');
      expect(statusChanges[3].details.txHash).toBe('0xabc123def456');
    });
  });

  describe('EVM error handling', () => {
    it('should handle EVM execution revert errors', async () => {
      const evmServiceWithRevert = createEvmMockService({
        grantRole: vi
          .fn()
          .mockRejectedValue(
            new Error('execution reverted: AccessControl: account is missing role')
          ),
      });
      const adapter = createEvmAdapter(evmServiceWithRevert);

      const { result } = renderHook(() => useGrantRole(adapter, EVM_CONTRACT), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            roleId: EVM_MINTER_ROLE,
            account: EVM_ACCOUNT,
            executionConfig: mockExecutionConfig,
          });
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain('execution reverted');
      // Should not be classified as network or user rejection error
      expect(result.current.isNetworkError).toBe(false);
      expect(result.current.isUserRejection).toBe(false);
    });

    it('should detect MetaMask user rejection', async () => {
      const evmServiceWithRejection = createEvmMockService({
        grantRole: vi.fn().mockRejectedValue(new Error('user rejected transaction')),
      });
      const adapter = createEvmAdapter(evmServiceWithRejection);

      const { result } = renderHook(() => useGrantRole(adapter, EVM_CONTRACT), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            roleId: EVM_MINTER_ROLE,
            account: EVM_ACCOUNT,
            executionConfig: mockExecutionConfig,
          });
        } catch {
          // Expected
        }
      });

      expect(result.current.isUserRejection).toBe(true);
      expect(result.current.isNetworkError).toBe(false);
    });

    it('should detect EVM network connection errors', async () => {
      const evmServiceWithNetworkError = createEvmMockService({
        grantRole: vi
          .fn()
          .mockRejectedValue(
            new Error('could not detect network (event="noNetwork", code=NETWORK_ERROR)')
          ),
      });
      const adapter = createEvmAdapter(evmServiceWithNetworkError);

      const { result } = renderHook(() => useGrantRole(adapter, EVM_CONTRACT), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            roleId: EVM_MINTER_ROLE,
            account: EVM_ACCOUNT,
            executionConfig: mockExecutionConfig,
          });
        } catch {
          // Expected
        }
      });

      expect(result.current.isNetworkError).toBe(true);
      expect(result.current.isUserRejection).toBe(false);
    });
  });

  describe('EVM query invalidation', () => {
    it('should invalidate roles queries on successful EVM grant', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
          mutations: { retry: false },
        },
      });

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useGrantRole(evmAdapter, EVM_CONTRACT), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          roleId: EVM_MINTER_ROLE,
          account: EVM_ACCOUNT,
          executionConfig: mockExecutionConfig,
        });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['contractRoles', EVM_CONTRACT],
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['contractRolesEnriched', EVM_CONTRACT],
      });
    });
  });
});

describe('EVM Adapter: useRevokeRole', () => {
  const evmNetworkConfig: NetworkConfig = {
    id: 'evm-sepolia',
    name: 'Sepolia',
    ecosystem: 'evm',
    network: 'sepolia',
    type: 'testnet',
    isTestnet: true,
  } as NetworkConfig;

  const EVM_MINTER_ROLE = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6';
  const EVM_ACCOUNT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  const EVM_CONTRACT = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

  const createEvmMockService = (overrides?: Partial<AccessControlService>): AccessControlService =>
    ({
      getCapabilities: vi.fn().mockResolvedValue({
        hasOwnable: true,
        hasAccessControl: true,
        hasEnumerableRoles: true,
        supportsHistory: false,
        verifiedAgainstOZInterfaces: true,
        notes: [],
      }),
      getCurrentRoles: vi.fn().mockResolvedValue([]),
      getOwnership: vi.fn().mockResolvedValue({ owner: EVM_ACCOUNT }),
      grantRole: vi.fn().mockResolvedValue(mockOperationResult),
      revokeRole: vi.fn().mockResolvedValue(mockOperationResult),
      transferOwnership: vi.fn().mockResolvedValue(mockOperationResult),
      ...overrides,
    }) as AccessControlService;

  const createEvmAdapter = (service?: AccessControlService | null): ContractAdapter => {
    const mockService = service === null ? undefined : (service ?? createEvmMockService());

    return {
      networkConfig: evmNetworkConfig,
      isValidAddress: vi.fn().mockImplementation((addr: string) => {
        return /^0x[0-9a-fA-F]{40}$/.test(addr);
      }),
      getAccessControlService: mockService ? vi.fn().mockReturnValue(mockService) : undefined,
    } as unknown as ContractAdapter;
  };

  let evmService: AccessControlService;
  let evmAdapter: ContractAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    evmService = createEvmMockService();
    evmAdapter = createEvmAdapter(evmService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('revoke role with EVM adapter', () => {
    it('should call revokeRole with EVM addresses and bytes32 role hash', async () => {
      const { result } = renderHook(() => useRevokeRole(evmAdapter, EVM_CONTRACT), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          roleId: EVM_MINTER_ROLE,
          account: EVM_ACCOUNT,
          executionConfig: mockExecutionConfig,
        });
      });

      expect(evmService.revokeRole).toHaveBeenCalledWith(
        EVM_CONTRACT,
        EVM_MINTER_ROLE,
        EVM_ACCOUNT,
        mockExecutionConfig,
        expect.any(Function),
        undefined
      );
    });

    it('should return operation result on EVM revoke success', async () => {
      const { result } = renderHook(() => useRevokeRole(evmAdapter, EVM_CONTRACT), {
        wrapper: createWrapper(),
      });

      let operationResult: OperationResult | undefined;
      await act(async () => {
        operationResult = await result.current.mutateAsync({
          roleId: EVM_MINTER_ROLE,
          account: EVM_ACCOUNT,
          executionConfig: mockExecutionConfig,
        });
      });

      expect(operationResult).toEqual(mockOperationResult);
    });
  });

  describe('EVM revoke error handling', () => {
    it('should handle EVM execution revert on revoke', async () => {
      const evmServiceWithRevert = createEvmMockService({
        revokeRole: vi
          .fn()
          .mockRejectedValue(
            new Error('execution reverted: AccessControl: can only renounce roles for self')
          ),
      });
      const adapter = createEvmAdapter(evmServiceWithRevert);

      const { result } = renderHook(() => useRevokeRole(adapter, EVM_CONTRACT), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            roleId: EVM_MINTER_ROLE,
            account: EVM_ACCOUNT,
            executionConfig: mockExecutionConfig,
          });
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toContain('execution reverted');
      expect(result.current.isNetworkError).toBe(false);
      expect(result.current.isUserRejection).toBe(false);
    });

    it('should detect MetaMask user rejection on revoke', async () => {
      const evmServiceWithRejection = createEvmMockService({
        revokeRole: vi.fn().mockRejectedValue(new UserRejectedError()),
      });
      const adapter = createEvmAdapter(evmServiceWithRejection);

      const { result } = renderHook(() => useRevokeRole(adapter, EVM_CONTRACT), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            roleId: EVM_MINTER_ROLE,
            account: EVM_ACCOUNT,
            executionConfig: mockExecutionConfig,
          });
        } catch {
          // Expected
        }
      });

      expect(result.current.isUserRejection).toBe(true);
    });

    it('should detect EVM network errors on revoke', async () => {
      const evmServiceWithNetworkError = createEvmMockService({
        revokeRole: vi.fn().mockRejectedValue(new NetworkDisconnectedError()),
      });
      const adapter = createEvmAdapter(evmServiceWithNetworkError);

      const { result } = renderHook(() => useRevokeRole(adapter, EVM_CONTRACT), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            roleId: EVM_MINTER_ROLE,
            account: EVM_ACCOUNT,
            executionConfig: mockExecutionConfig,
          });
        } catch {
          // Expected
        }
      });

      expect(result.current.isNetworkError).toBe(true);
    });
  });

  describe('EVM revoke query invalidation', () => {
    it('should invalidate roles queries on successful EVM revoke', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
          mutations: { retry: false },
        },
      });

      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useRevokeRole(evmAdapter, EVM_CONTRACT), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync({
          roleId: EVM_MINTER_ROLE,
          account: EVM_ACCOUNT,
          executionConfig: mockExecutionConfig,
        });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['contractRoles', EVM_CONTRACT],
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['contractRolesEnriched', EVM_CONTRACT],
      });
    });
  });

  describe('EVM revoke reset and retry', () => {
    it('should reset state after EVM revoke error', async () => {
      const evmServiceWithError = createEvmMockService({
        revokeRole: vi.fn().mockRejectedValue(new Error('EVM revert')),
      });
      const adapter = createEvmAdapter(evmServiceWithError);

      const { result } = renderHook(() => useRevokeRole(adapter, EVM_CONTRACT), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            roleId: EVM_MINTER_ROLE,
            account: EVM_ACCOUNT,
            executionConfig: mockExecutionConfig,
          });
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.status).toBe('idle');
    });
  });
});

describe('Cross-ecosystem: EVM and Stellar interoperability', () => {
  const evmNetworkConfig: NetworkConfig = {
    id: 'evm-sepolia',
    name: 'Sepolia',
    ecosystem: 'evm',
    network: 'sepolia',
    type: 'testnet',
    isTestnet: true,
  } as NetworkConfig;

  const stellarNetworkConfig: NetworkConfig = {
    id: 'stellar-testnet',
    name: 'Stellar Testnet',
    ecosystem: 'stellar',
    network: 'stellar',
    type: 'testnet',
    isTestnet: true,
  } as NetworkConfig;

  const createCrossEcosystemService = (
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
      getCurrentRoles: vi.fn().mockResolvedValue([]),
      getOwnership: vi.fn().mockResolvedValue({ owner: '0xOwner' }),
      grantRole: vi.fn().mockResolvedValue(mockOperationResult),
      revokeRole: vi.fn().mockResolvedValue(mockOperationResult),
      transferOwnership: vi.fn().mockResolvedValue(mockOperationResult),
      ...overrides,
    }) as AccessControlService;

  const createCrossEcosystemAdapter = (
    networkConfig: NetworkConfig,
    service?: AccessControlService
  ): ContractAdapter => {
    const mockService = service ?? createCrossEcosystemService();
    return {
      networkConfig,
      isValidAddress: vi.fn().mockReturnValue(true),
      getAccessControlService: vi.fn().mockReturnValue(mockService),
    } as unknown as ContractAdapter;
  };

  it('should use the same hook interface for both EVM and Stellar grants', async () => {
    const evmService = createCrossEcosystemService();
    const stellarService = createCrossEcosystemService();
    const evmAdapter = createCrossEcosystemAdapter(evmNetworkConfig, evmService);
    const stellarAdapter = createCrossEcosystemAdapter(stellarNetworkConfig, stellarService);

    // Grant on EVM
    const { result: evmResult } = renderHook(
      () => useGrantRole(evmAdapter, '0x5FbDB2315678afecb367f032d93F642f64180aa3'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await evmResult.current.mutateAsync({
        roleId: '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6',
        account: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        executionConfig: mockExecutionConfig,
      });
    });

    // Grant on Stellar
    const { result: stellarResult } = renderHook(
      () => useGrantRole(stellarAdapter, 'STELLAR_CONTRACT_ADDRESS'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await stellarResult.current.mutateAsync({
        roleId: 'MINTER_ROLE',
        account: 'STELLAR_ACCOUNT_ADDRESS',
        executionConfig: mockExecutionConfig,
      });
    });

    // Both should succeed with the same interface
    expect(evmService.grantRole).toHaveBeenCalledTimes(1);
    expect(stellarService.grantRole).toHaveBeenCalledTimes(1);

    // EVM uses 0x-prefixed addresses and bytes32 hashes
    expect(evmService.grantRole).toHaveBeenCalledWith(
      '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6',
      '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      mockExecutionConfig,
      expect.any(Function),
      undefined
    );

    // Stellar uses its own address/role format
    expect(stellarService.grantRole).toHaveBeenCalledWith(
      'STELLAR_CONTRACT_ADDRESS',
      'MINTER_ROLE',
      'STELLAR_ACCOUNT_ADDRESS',
      mockExecutionConfig,
      expect.any(Function),
      undefined
    );
  });

  it('should use the same hook interface for both EVM and Stellar revokes', async () => {
    const evmService = createCrossEcosystemService();
    const stellarService = createCrossEcosystemService();
    const evmAdapter = createCrossEcosystemAdapter(evmNetworkConfig, evmService);
    const stellarAdapter = createCrossEcosystemAdapter(stellarNetworkConfig, stellarService);

    // Revoke on EVM
    const { result: evmResult } = renderHook(
      () => useRevokeRole(evmAdapter, '0x5FbDB2315678afecb367f032d93F642f64180aa3'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await evmResult.current.mutateAsync({
        roleId: '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6',
        account: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        executionConfig: mockExecutionConfig,
      });
    });

    // Revoke on Stellar
    const { result: stellarResult } = renderHook(
      () => useRevokeRole(stellarAdapter, 'STELLAR_CONTRACT_ADDRESS'),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await stellarResult.current.mutateAsync({
        roleId: 'MINTER_ROLE',
        account: 'STELLAR_ACCOUNT_ADDRESS',
        executionConfig: mockExecutionConfig,
      });
    });

    // Both should succeed
    expect(evmService.revokeRole).toHaveBeenCalledTimes(1);
    expect(stellarService.revokeRole).toHaveBeenCalledTimes(1);
  });
});
