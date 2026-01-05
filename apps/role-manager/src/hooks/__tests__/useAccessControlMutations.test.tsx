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
