/**
 * Tests for useAcceptOwnershipDialog hook
 * Feature: 015-ownership-transfer
 *
 * TDD tests for the Accept Ownership dialog hook.
 * Tasks: T015
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';

import type {
  AccessControlService,
  ContractAdapter,
  NetworkConfig,
  OperationResult,
  TransactionStatusUpdate,
  TxStatus,
} from '@openzeppelin/ui-types';

import { useAcceptOwnershipDialog } from '../useAcceptOwnershipDialog';

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

const mockOperationResult: OperationResult = {
  id: 'tx-123456',
};

const MOCK_CONTRACT_ADDRESS = '0xContractAddress';
const MOCK_CONNECTED_ADDRESS = '0xConnectedWallet';

// =============================================================================
// Mocks
// =============================================================================

// Create mock AccessControlService factory
const createMockAccessControlService = (
  overrides?: Partial<AccessControlService>
): AccessControlService =>
  ({
    getCapabilities: vi.fn().mockResolvedValue({
      hasOwnable: true,
      hasAccessControl: true,
      hasTwoStepOwnable: true,
      hasEnumerableRoles: true,
      supportsHistory: false,
      verifiedAgainstOZInterfaces: true,
      notes: [],
    }),
    getCurrentRoles: vi.fn().mockResolvedValue([]),
    getOwnership: vi.fn().mockResolvedValue({ owner: MOCK_CONNECTED_ADDRESS }),
    grantRole: vi.fn().mockResolvedValue(mockOperationResult),
    revokeRole: vi.fn().mockResolvedValue(mockOperationResult),
    transferOwnership: vi.fn().mockResolvedValue(mockOperationResult),
    acceptOwnership: vi.fn().mockResolvedValue(mockOperationResult),
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
    getCurrentBlock: vi.fn().mockResolvedValue(1000),
  } as unknown as ContractAdapter;
};

// Mock useSelectedContract
const mockUseSelectedContract = vi.fn();

vi.mock('../useSelectedContract', () => ({
  useSelectedContract: () => mockUseSelectedContract(),
}));

// Mock useDerivedAccountStatus from react-core
const mockUseDerivedAccountStatus = vi.fn();

vi.mock('@openzeppelin/ui-react', () => ({
  useDerivedAccountStatus: () => mockUseDerivedAccountStatus(),
}));

// Mock useAcceptOwnership
const mockAcceptOwnershipMutateAsync = vi.fn();
const mockAcceptOwnershipReset = vi.fn();

let mockAcceptOwnershipState = {
  isPending: false,
  error: null as Error | null,
  status: 'idle' as TxStatus,
  statusDetails: null as TransactionStatusUpdate | null,
  isReady: true,
  isNetworkError: false,
  isUserRejection: false,
};

vi.mock('../useAccessControlMutations', () => ({
  useAcceptOwnership: () => ({
    mutateAsync: mockAcceptOwnershipMutateAsync,
    reset: mockAcceptOwnershipReset,
    ...mockAcceptOwnershipState,
  }),
}));

// =============================================================================
// Test Utilities
// =============================================================================

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

// Setup default mock returns
const setupDefaultMocks = () => {
  mockUseSelectedContract.mockReturnValue({
    selectedContract: {
      id: 'contract-1',
      address: MOCK_CONTRACT_ADDRESS,
      label: 'Test Contract',
      networkId: 'stellar-testnet',
    },
    adapter: createMockAdapter(),
    isContractRegistered: true,
  });

  mockUseDerivedAccountStatus.mockReturnValue({
    address: MOCK_CONNECTED_ADDRESS,
    isConnected: true,
  });

  // Reset mutation state
  mockAcceptOwnershipState = {
    isPending: false,
    error: null,
    status: 'idle',
    statusDetails: null,
    isReady: true,
    isNetworkError: false,
    isUserRejection: false,
  };
};

// =============================================================================
// Tests
// =============================================================================

describe('useAcceptOwnershipDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // T015: initialization tests
  describe('initialization', () => {
    it('should initialize with form step', () => {
      const onClose = vi.fn();

      const { result } = renderHook(
        () =>
          useAcceptOwnershipDialog({
            onClose,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.step).toBe('form');
      expect(result.current.errorMessage).toBeNull();
    });

    it('should indicate wallet connection status', () => {
      const { result } = renderHook(
        () =>
          useAcceptOwnershipDialog({
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isWalletConnected).toBe(true);
    });

    it('should indicate wallet is not connected when disconnected', () => {
      mockUseDerivedAccountStatus.mockReturnValue({
        address: null,
        isConnected: false,
      });

      const { result } = renderHook(
        () =>
          useAcceptOwnershipDialog({
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isWalletConnected).toBe(false);
    });
  });

  // T015: submit flow tests
  describe('submit flow', () => {
    it('should transition to pending state on submit', async () => {
      // Create a promise we can control
      let resolvePromise: (value: OperationResult) => void;
      const pendingPromise = new Promise<OperationResult>((resolve) => {
        resolvePromise = resolve;
      });
      mockAcceptOwnershipMutateAsync.mockReturnValue(pendingPromise);

      const { result } = renderHook(
        () =>
          useAcceptOwnershipDialog({
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      // Start submit but don't await
      act(() => {
        void result.current.submit();
      });

      expect(result.current.step).toBe('pending');

      // Cleanup
      await act(async () => {
        resolvePromise!(mockOperationResult);
        await pendingPromise;
      });
    });

    it('should transition to success state after successful transaction', async () => {
      mockAcceptOwnershipMutateAsync.mockResolvedValue(mockOperationResult);
      const onSuccess = vi.fn();

      const { result } = renderHook(
        () =>
          useAcceptOwnershipDialog({
            onClose: vi.fn(),
            onSuccess,
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.submit();
      });

      expect(result.current.step).toBe('success');
      expect(onSuccess).toHaveBeenCalled();
    });

    it('should call onClose after success delay', async () => {
      mockAcceptOwnershipMutateAsync.mockResolvedValue(mockOperationResult);
      const onClose = vi.fn();

      const { result } = renderHook(
        () =>
          useAcceptOwnershipDialog({
            onClose,
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.submit();
      });

      expect(onClose).not.toHaveBeenCalled();

      // Advance time
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should pass correct args to useAcceptOwnership mutation', async () => {
      mockAcceptOwnershipMutateAsync.mockResolvedValue(mockOperationResult);

      const { result } = renderHook(
        () =>
          useAcceptOwnershipDialog({
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.submit();
      });

      expect(mockAcceptOwnershipMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          executionConfig: { method: 'eoa' },
        })
      );
    });
  });

  // T015: error handling tests
  describe('error handling', () => {
    it('should transition to error state on network error', async () => {
      mockAcceptOwnershipMutateAsync.mockRejectedValue(new Error('Network disconnected'));

      const { result } = renderHook(
        () =>
          useAcceptOwnershipDialog({
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.submit();
      });

      expect(result.current.step).toBe('error');
      expect(result.current.errorMessage).toBe('Network disconnected');
    });

    it('should transition to cancelled state on user rejection', async () => {
      mockAcceptOwnershipMutateAsync.mockRejectedValue(new Error('User rejected the transaction'));

      const { result } = renderHook(
        () =>
          useAcceptOwnershipDialog({
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.submit();
      });

      expect(result.current.step).toBe('cancelled');
    });

    it('should detect user denial from error message', async () => {
      mockAcceptOwnershipMutateAsync.mockRejectedValue(
        new Error('User denied transaction signature')
      );

      const { result } = renderHook(
        () =>
          useAcceptOwnershipDialog({
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.submit();
      });

      expect(result.current.step).toBe('cancelled');
    });
  });

  // T015: retry functionality tests
  describe('retry functionality', () => {
    it('should allow retry after error', async () => {
      // First call fails
      mockAcceptOwnershipMutateAsync.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(
        () =>
          useAcceptOwnershipDialog({
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      // Submit (will fail)
      await act(async () => {
        await result.current.submit();
      });

      expect(result.current.step).toBe('error');
      expect(mockAcceptOwnershipMutateAsync).toHaveBeenCalledTimes(1);

      // Setup success for retry
      mockAcceptOwnershipMutateAsync.mockResolvedValueOnce(mockOperationResult);

      // Retry
      await act(async () => {
        await result.current.retry();
      });

      expect(mockAcceptOwnershipMutateAsync).toHaveBeenCalledTimes(2);
      expect(result.current.step).toBe('success');
    });
  });

  // T015: reset functionality tests
  describe('reset functionality', () => {
    it('should reset to form state', async () => {
      mockAcceptOwnershipMutateAsync.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(
        () =>
          useAcceptOwnershipDialog({
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      // Trigger error state
      await act(async () => {
        await result.current.submit();
      });

      expect(result.current.step).toBe('error');

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.step).toBe('form');
      expect(result.current.errorMessage).toBeNull();
    });
  });

  // T015: transaction status tracking
  describe('transaction status tracking', () => {
    it('should expose txStatus from mutation', () => {
      mockAcceptOwnershipState.status = 'pendingConfirmation';

      const { result } = renderHook(
        () =>
          useAcceptOwnershipDialog({
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.txStatus).toBe('pendingConfirmation');
    });
  });
});
