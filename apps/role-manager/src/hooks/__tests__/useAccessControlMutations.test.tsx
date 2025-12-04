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
} from '@openzeppelin/ui-builder-types';

import { useGrantRole, useRevokeRole, useTransferOwnership } from '../useAccessControlMutations';

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

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['contractRoles', 'CONTRACT_ADDRESS'],
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

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['contractRoles', 'CONTRACT_ADDRESS'],
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
          executionConfig: mockExecutionConfig,
        });
      });

      expect(mockService.transferOwnership).toHaveBeenCalledWith(
        'CONTRACT_ADDRESS',
        '0x3333333333333333333333333333333333333333',
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
