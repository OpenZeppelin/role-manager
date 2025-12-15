/**
 * Tests for useOwnershipTransferDialog hook
 * Feature: 015-ownership-transfer
 *
 * TDD tests for the Transfer Ownership dialog hook.
 * Tasks: T008
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
} from '@openzeppelin/ui-builder-types';

import { useOwnershipTransferDialog } from '../useOwnershipTransferDialog';

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
const MOCK_NEW_OWNER_ADDRESS = '0xNewOwnerAddress';

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

vi.mock('@openzeppelin/ui-builder-react-core', () => ({
  useDerivedAccountStatus: () => mockUseDerivedAccountStatus(),
}));

// Mock useTransferOwnership
const mockTransferOwnershipMutateAsync = vi.fn();
const mockTransferOwnershipReset = vi.fn();

let mockTransferOwnershipState = {
  isPending: false,
  error: null as Error | null,
  status: 'idle' as TxStatus,
  statusDetails: null as TransactionStatusUpdate | null,
  isReady: true,
  isNetworkError: false,
  isUserRejection: false,
};

vi.mock('../useAccessControlMutations', () => ({
  useTransferOwnership: () => ({
    mutateAsync: mockTransferOwnershipMutateAsync,
    reset: mockTransferOwnershipReset,
    ...mockTransferOwnershipState,
  }),
}));

// Mock useCurrentBlock
let mockCurrentBlock: number | null = 1000;
let mockCurrentBlockLoading = false;

vi.mock('../useCurrentBlock', () => ({
  useCurrentBlock: () => ({
    currentBlock: mockCurrentBlock,
    isLoading: mockCurrentBlockLoading,
    error: null,
    refetch: vi.fn(),
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
  mockTransferOwnershipState = {
    isPending: false,
    error: null,
    status: 'idle',
    statusDetails: null,
    isReady: true,
    isNetworkError: false,
    isUserRejection: false,
  };

  mockCurrentBlock = 1000;
  mockCurrentBlockLoading = false;
};

// =============================================================================
// Tests
// =============================================================================

describe('useOwnershipTransferDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // T008: initialization tests
  describe('initialization', () => {
    it('should initialize with form step', () => {
      const onClose = vi.fn();

      const { result } = renderHook(
        () =>
          useOwnershipTransferDialog({
            currentOwner: MOCK_CONNECTED_ADDRESS,
            hasTwoStepOwnable: true,
            onClose,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.step).toBe('form');
      expect(result.current.errorMessage).toBeNull();
    });

    it('should indicate expiration is required for two-step ownable', () => {
      const { result } = renderHook(
        () =>
          useOwnershipTransferDialog({
            currentOwner: MOCK_CONNECTED_ADDRESS,
            hasTwoStepOwnable: true,
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.requiresExpiration).toBe(true);
    });

    it('should indicate expiration is not required for single-step ownable', () => {
      const { result } = renderHook(
        () =>
          useOwnershipTransferDialog({
            currentOwner: MOCK_CONNECTED_ADDRESS,
            hasTwoStepOwnable: false,
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.requiresExpiration).toBe(false);
    });

    it('should expose current ledger for two-step ownable', () => {
      const { result } = renderHook(
        () =>
          useOwnershipTransferDialog({
            currentOwner: MOCK_CONNECTED_ADDRESS,
            hasTwoStepOwnable: true,
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.currentBlock).toBe(1000);
    });

    it('should return null for current ledger when single-step ownable', () => {
      const { result } = renderHook(
        () =>
          useOwnershipTransferDialog({
            currentOwner: MOCK_CONNECTED_ADDRESS,
            hasTwoStepOwnable: false,
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.currentBlock).toBeNull();
    });
  });

  // T008: form validation tests
  describe('form validation', () => {
    it('should reject self-transfer (same address as current owner)', async () => {
      const { result } = renderHook(
        () =>
          useOwnershipTransferDialog({
            currentOwner: MOCK_CONNECTED_ADDRESS,
            hasTwoStepOwnable: true,
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      // Submit with same address as current owner
      await act(async () => {
        await result.current.submit({
          newOwnerAddress: MOCK_CONNECTED_ADDRESS, // Same as current owner
          expirationBlock: '2000',
        });
      });

      expect(result.current.step).toBe('error');
      expect(result.current.errorMessage).toContain('Cannot transfer to yourself');
      expect(mockTransferOwnershipMutateAsync).not.toHaveBeenCalled();
    });

    it('should reject expiration in the past (less than current ledger)', async () => {
      const { result } = renderHook(
        () =>
          useOwnershipTransferDialog({
            currentOwner: MOCK_CONNECTED_ADDRESS,
            hasTwoStepOwnable: true,
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      // Submit with expired ledger (less than current = 1000)
      await act(async () => {
        await result.current.submit({
          newOwnerAddress: MOCK_NEW_OWNER_ADDRESS,
          expirationBlock: '500', // Past ledger
        });
      });

      expect(result.current.step).toBe('error');
      expect(result.current.errorMessage).toContain('Expiration must be greater than current');
      expect(mockTransferOwnershipMutateAsync).not.toHaveBeenCalled();
    });

    it('should reject expiration equal to current ledger', async () => {
      const { result } = renderHook(
        () =>
          useOwnershipTransferDialog({
            currentOwner: MOCK_CONNECTED_ADDRESS,
            hasTwoStepOwnable: true,
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      // Submit with same ledger as current
      await act(async () => {
        await result.current.submit({
          newOwnerAddress: MOCK_NEW_OWNER_ADDRESS,
          expirationBlock: '1000', // Same as current
        });
      });

      expect(result.current.step).toBe('error');
      expect(result.current.errorMessage).toContain('Expiration must be greater than current');
      expect(mockTransferOwnershipMutateAsync).not.toHaveBeenCalled();
    });

    it('should accept valid expiration in the future', async () => {
      mockTransferOwnershipMutateAsync.mockResolvedValue(mockOperationResult);

      const { result } = renderHook(
        () =>
          useOwnershipTransferDialog({
            currentOwner: MOCK_CONNECTED_ADDRESS,
            hasTwoStepOwnable: true,
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      // Submit with valid future expiration
      await act(async () => {
        await result.current.submit({
          newOwnerAddress: MOCK_NEW_OWNER_ADDRESS,
          expirationBlock: '2000', // Greater than current = 1000
        });
      });

      expect(mockTransferOwnershipMutateAsync).toHaveBeenCalled();
    });

    it('should not require expiration validation for single-step ownable', async () => {
      mockTransferOwnershipMutateAsync.mockResolvedValue(mockOperationResult);

      const { result } = renderHook(
        () =>
          useOwnershipTransferDialog({
            currentOwner: MOCK_CONNECTED_ADDRESS,
            hasTwoStepOwnable: false, // Single-step
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      // Submit with empty expiration (should be fine for single-step)
      await act(async () => {
        await result.current.submit({
          newOwnerAddress: MOCK_NEW_OWNER_ADDRESS,
          expirationBlock: '', // Empty for single-step
        });
      });

      expect(result.current.step).not.toBe('error');
      expect(mockTransferOwnershipMutateAsync).toHaveBeenCalled();
    });

    it('should reject submission when current block is not available for two-step', async () => {
      // Set currentBlock to null to simulate not-yet-loaded state
      mockCurrentBlock = null;

      const { result } = renderHook(
        () =>
          useOwnershipTransferDialog({
            currentOwner: MOCK_CONNECTED_ADDRESS,
            hasTwoStepOwnable: true,
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.submit({
          newOwnerAddress: MOCK_NEW_OWNER_ADDRESS,
          expirationBlock: '2000',
        });
      });

      expect(result.current.step).toBe('error');
      expect(result.current.errorMessage).toContain('current block not available');
      expect(mockTransferOwnershipMutateAsync).not.toHaveBeenCalled();

      // Reset for other tests
      mockCurrentBlock = 1000;
    });
  });

  // T008: submit flow tests
  describe('submit flow', () => {
    it('should transition to pending state on submit', async () => {
      // Create a promise we can control
      let resolvePromise: (value: OperationResult) => void;
      const pendingPromise = new Promise<OperationResult>((resolve) => {
        resolvePromise = resolve;
      });
      mockTransferOwnershipMutateAsync.mockReturnValue(pendingPromise);

      const { result } = renderHook(
        () =>
          useOwnershipTransferDialog({
            currentOwner: MOCK_CONNECTED_ADDRESS,
            hasTwoStepOwnable: true,
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      // Start submit but don't await
      act(() => {
        void result.current.submit({
          newOwnerAddress: MOCK_NEW_OWNER_ADDRESS,
          expirationBlock: '2000',
        });
      });

      expect(result.current.step).toBe('pending');

      // Cleanup
      await act(async () => {
        resolvePromise!(mockOperationResult);
        await pendingPromise;
      });
    });

    it('should transition to success state after successful transaction', async () => {
      mockTransferOwnershipMutateAsync.mockResolvedValue(mockOperationResult);
      const onSuccess = vi.fn();

      const { result } = renderHook(
        () =>
          useOwnershipTransferDialog({
            currentOwner: MOCK_CONNECTED_ADDRESS,
            hasTwoStepOwnable: true,
            onClose: vi.fn(),
            onSuccess,
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.submit({
          newOwnerAddress: MOCK_NEW_OWNER_ADDRESS,
          expirationBlock: '2000',
        });
      });

      expect(result.current.step).toBe('success');
      expect(onSuccess).toHaveBeenCalled();
    });

    it('should call onClose after success delay', async () => {
      mockTransferOwnershipMutateAsync.mockResolvedValue(mockOperationResult);
      const onClose = vi.fn();

      const { result } = renderHook(
        () =>
          useOwnershipTransferDialog({
            currentOwner: MOCK_CONNECTED_ADDRESS,
            hasTwoStepOwnable: true,
            onClose,
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.submit({
          newOwnerAddress: MOCK_NEW_OWNER_ADDRESS,
          expirationBlock: '2000',
        });
      });

      expect(onClose).not.toHaveBeenCalled();

      // Advance time
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should pass correct args to useTransferOwnership mutation', async () => {
      mockTransferOwnershipMutateAsync.mockResolvedValue(mockOperationResult);

      const { result } = renderHook(
        () =>
          useOwnershipTransferDialog({
            currentOwner: MOCK_CONNECTED_ADDRESS,
            hasTwoStepOwnable: true,
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.submit({
          newOwnerAddress: MOCK_NEW_OWNER_ADDRESS,
          expirationBlock: '2000',
        });
      });

      expect(mockTransferOwnershipMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          newOwner: MOCK_NEW_OWNER_ADDRESS,
          expirationBlock: 2000,
          executionConfig: { method: 'eoa' },
        })
      );
    });

    it('should use default expiration for single-step transfer', async () => {
      mockTransferOwnershipMutateAsync.mockResolvedValue(mockOperationResult);

      const { result } = renderHook(
        () =>
          useOwnershipTransferDialog({
            currentOwner: MOCK_CONNECTED_ADDRESS,
            hasTwoStepOwnable: false, // Single-step
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.submit({
          newOwnerAddress: MOCK_NEW_OWNER_ADDRESS,
          expirationBlock: '', // Empty for single-step
        });
      });

      expect(mockTransferOwnershipMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          newOwner: MOCK_NEW_OWNER_ADDRESS,
          expirationBlock: 0, // Default for single-step
        })
      );
    });
  });

  // T008: error handling tests
  describe('error handling', () => {
    it('should transition to error state on network error', async () => {
      mockTransferOwnershipMutateAsync.mockRejectedValue(new Error('Network disconnected'));

      const { result } = renderHook(
        () =>
          useOwnershipTransferDialog({
            currentOwner: MOCK_CONNECTED_ADDRESS,
            hasTwoStepOwnable: true,
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.submit({
          newOwnerAddress: MOCK_NEW_OWNER_ADDRESS,
          expirationBlock: '2000',
        });
      });

      expect(result.current.step).toBe('error');
      expect(result.current.errorMessage).toBe('Network disconnected');
    });

    it('should transition to cancelled state on user rejection', async () => {
      mockTransferOwnershipMutateAsync.mockRejectedValue(
        new Error('User rejected the transaction')
      );

      const { result } = renderHook(
        () =>
          useOwnershipTransferDialog({
            currentOwner: MOCK_CONNECTED_ADDRESS,
            hasTwoStepOwnable: true,
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.submit({
          newOwnerAddress: MOCK_NEW_OWNER_ADDRESS,
          expirationBlock: '2000',
        });
      });

      expect(result.current.step).toBe('cancelled');
    });

    it('should detect user denial from error message', async () => {
      mockTransferOwnershipMutateAsync.mockRejectedValue(
        new Error('User denied transaction signature')
      );

      const { result } = renderHook(
        () =>
          useOwnershipTransferDialog({
            currentOwner: MOCK_CONNECTED_ADDRESS,
            hasTwoStepOwnable: true,
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.submit({
          newOwnerAddress: MOCK_NEW_OWNER_ADDRESS,
          expirationBlock: '2000',
        });
      });

      expect(result.current.step).toBe('cancelled');
    });
  });

  // T008: retry functionality tests
  describe('retry functionality', () => {
    it('should allow retry after error', async () => {
      // First call fails
      mockTransferOwnershipMutateAsync.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(
        () =>
          useOwnershipTransferDialog({
            currentOwner: MOCK_CONNECTED_ADDRESS,
            hasTwoStepOwnable: true,
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      // Submit (will fail)
      await act(async () => {
        await result.current.submit({
          newOwnerAddress: MOCK_NEW_OWNER_ADDRESS,
          expirationBlock: '2000',
        });
      });

      expect(result.current.step).toBe('error');
      expect(mockTransferOwnershipMutateAsync).toHaveBeenCalledTimes(1);

      // Setup success for retry
      mockTransferOwnershipMutateAsync.mockResolvedValueOnce(mockOperationResult);

      // Retry
      await act(async () => {
        await result.current.retry();
      });

      expect(mockTransferOwnershipMutateAsync).toHaveBeenCalledTimes(2);
      expect(result.current.step).toBe('success');
    });

    it('should use stored form data for retry', async () => {
      mockTransferOwnershipMutateAsync.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(
        () =>
          useOwnershipTransferDialog({
            currentOwner: MOCK_CONNECTED_ADDRESS,
            hasTwoStepOwnable: true,
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      // Submit with specific data
      await act(async () => {
        await result.current.submit({
          newOwnerAddress: MOCK_NEW_OWNER_ADDRESS,
          expirationBlock: '2000',
        });
      });

      expect(result.current.step).toBe('error');

      // Setup success for retry
      mockTransferOwnershipMutateAsync.mockResolvedValueOnce(mockOperationResult);

      // Retry - should use same data
      await act(async () => {
        await result.current.retry();
      });

      // Verify both calls used the same data
      expect(mockTransferOwnershipMutateAsync).toHaveBeenCalledTimes(2);
      expect(mockTransferOwnershipMutateAsync).toHaveBeenLastCalledWith(
        expect.objectContaining({
          newOwner: MOCK_NEW_OWNER_ADDRESS,
          expirationBlock: 2000,
        })
      );
    });
  });

  // T008: reset functionality tests
  describe('reset functionality', () => {
    it('should reset to form state', async () => {
      mockTransferOwnershipMutateAsync.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(
        () =>
          useOwnershipTransferDialog({
            currentOwner: MOCK_CONNECTED_ADDRESS,
            hasTwoStepOwnable: true,
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      // Trigger error state
      await act(async () => {
        await result.current.submit({
          newOwnerAddress: MOCK_NEW_OWNER_ADDRESS,
          expirationBlock: '2000',
        });
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

  // T008: wallet connection tests
  describe('wallet connection', () => {
    it('should indicate wallet is connected', () => {
      const { result } = renderHook(
        () =>
          useOwnershipTransferDialog({
            currentOwner: MOCK_CONNECTED_ADDRESS,
            hasTwoStepOwnable: true,
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isWalletConnected).toBe(true);
    });

    it('should indicate wallet is not connected', () => {
      mockUseDerivedAccountStatus.mockReturnValue({
        address: null,
        isConnected: false,
      });

      const { result } = renderHook(
        () =>
          useOwnershipTransferDialog({
            currentOwner: MOCK_CONNECTED_ADDRESS,
            hasTwoStepOwnable: true,
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isWalletConnected).toBe(false);
    });
  });

  // T008: transaction status tracking
  describe('transaction status tracking', () => {
    it('should expose txStatus from mutation', () => {
      mockTransferOwnershipState.status = 'pendingConfirmation';

      const { result } = renderHook(
        () =>
          useOwnershipTransferDialog({
            currentOwner: MOCK_CONNECTED_ADDRESS,
            hasTwoStepOwnable: true,
            onClose: vi.fn(),
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.txStatus).toBe('pendingConfirmation');
    });
  });
});
