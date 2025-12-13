/**
 * Tests for useRevokeRoleDialog hook
 * Feature: 014-role-grant-revoke
 *
 * TDD tests for the Revoke Role dialog hook.
 * Tasks: T043-T048
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

import { useRevokeRoleDialog } from '../useRevokeRoleDialog';

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
const MOCK_TARGET_ADDRESS = '0xTargetAddress';
const MOCK_ROLE_ID = 'ADMIN_ROLE_ID';
const MOCK_ROLE_NAME = 'Admin';

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

// Mock useRevokeRole
const mockRevokeRoleMutateAsync = vi.fn();
const mockRevokeRoleReset = vi.fn();

let mockRevokeRoleState = {
  isPending: false,
  error: null as Error | null,
  status: 'idle' as TxStatus,
  statusDetails: null as TransactionStatusUpdate | null,
  isReady: true,
  isNetworkError: false,
  isUserRejection: false,
};

vi.mock('../useAccessControlMutations', () => ({
  useRevokeRole: () => ({
    mutateAsync: mockRevokeRoleMutateAsync,
    reset: mockRevokeRoleReset,
    ...mockRevokeRoleState,
  }),
  // Include other exports that might be needed
  useGrantRole: () => ({
    mutateAsync: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    error: null,
    status: 'idle',
    statusDetails: null,
    isReady: true,
    isNetworkError: false,
    isUserRejection: false,
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
  mockRevokeRoleState = {
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

describe('useRevokeRoleDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // T043: Test setup and initialization
  describe('initialization (T043)', () => {
    it('should initialize in form state', () => {
      const { result } = renderHook(
        () =>
          useRevokeRoleDialog({
            accountAddress: MOCK_TARGET_ADDRESS,
            roleId: MOCK_ROLE_ID,
            roleName: MOCK_ROLE_NAME,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.step).toBe('form');
      expect(result.current.errorMessage).toBeNull();
    });

    it('should expose wallet connection status', () => {
      const { result } = renderHook(
        () =>
          useRevokeRoleDialog({
            accountAddress: MOCK_TARGET_ADDRESS,
            roleId: MOCK_ROLE_ID,
            roleName: MOCK_ROLE_NAME,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isWalletConnected).toBe(true);
    });
  });

  // T044: Detects self-revoke when connected wallet matches target
  describe('self-revoke detection (T044)', () => {
    it('should detect self-revoke when connected wallet matches target account', () => {
      // Setup: connected address matches target address
      mockUseDerivedAccountStatus.mockReturnValue({
        address: MOCK_TARGET_ADDRESS, // Same as accountAddress
        isConnected: true,
      });

      const { result } = renderHook(
        () =>
          useRevokeRoleDialog({
            accountAddress: MOCK_TARGET_ADDRESS,
            roleId: MOCK_ROLE_ID,
            roleName: MOCK_ROLE_NAME,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isSelfRevoke).toBe(true);
      expect(result.current.showSelfRevokeWarning).toBe(true);
    });

    it('should not show self-revoke warning when addresses differ', () => {
      // Default setup: connected address is MOCK_CONNECTED_ADDRESS, target is MOCK_TARGET_ADDRESS
      const { result } = renderHook(
        () =>
          useRevokeRoleDialog({
            accountAddress: MOCK_TARGET_ADDRESS,
            roleId: MOCK_ROLE_ID,
            roleName: MOCK_ROLE_NAME,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isSelfRevoke).toBe(false);
      expect(result.current.showSelfRevokeWarning).toBe(false);
    });

    it('should detect self-revoke case-insensitively', () => {
      // Setup with different casing
      mockUseDerivedAccountStatus.mockReturnValue({
        address: MOCK_TARGET_ADDRESS.toLowerCase(), // lowercase
        isConnected: true,
      });

      const { result } = renderHook(
        () =>
          useRevokeRoleDialog({
            accountAddress: MOCK_TARGET_ADDRESS.toUpperCase(), // uppercase
            roleId: MOCK_ROLE_ID,
            roleName: MOCK_ROLE_NAME,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isSelfRevoke).toBe(true);
    });

    it('should not detect self-revoke when wallet is not connected', () => {
      mockUseDerivedAccountStatus.mockReturnValue({
        address: null,
        isConnected: false,
      });

      const { result } = renderHook(
        () =>
          useRevokeRoleDialog({
            accountAddress: MOCK_TARGET_ADDRESS,
            roleId: MOCK_ROLE_ID,
            roleName: MOCK_ROLE_NAME,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isSelfRevoke).toBe(false);
      expect(result.current.showSelfRevokeWarning).toBe(false);
    });
  });

  // T045: Submit calls useRevokeRole with correct address and roleId
  describe('submit transaction (T045)', () => {
    it('should call useRevokeRole.mutateAsync with correct args when submitting', async () => {
      mockRevokeRoleMutateAsync.mockResolvedValue(mockOperationResult);

      const { result } = renderHook(
        () =>
          useRevokeRoleDialog({
            accountAddress: MOCK_TARGET_ADDRESS,
            roleId: MOCK_ROLE_ID,
            roleName: MOCK_ROLE_NAME,
          }),
        { wrapper: createWrapper() }
      );

      // Submit
      await act(async () => {
        await result.current.submit();
      });

      expect(mockRevokeRoleMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          roleId: MOCK_ROLE_ID,
          account: MOCK_TARGET_ADDRESS,
          executionConfig: { method: 'eoa' },
        })
      );
    });

    it('should transition to pending state when submit starts', async () => {
      // Create a promise that we can control
      let resolvePromise: (value: OperationResult) => void;
      const pendingPromise = new Promise<OperationResult>((resolve) => {
        resolvePromise = resolve;
      });
      mockRevokeRoleMutateAsync.mockReturnValue(pendingPromise);

      const { result } = renderHook(
        () =>
          useRevokeRoleDialog({
            accountAddress: MOCK_TARGET_ADDRESS,
            roleId: MOCK_ROLE_ID,
            roleName: MOCK_ROLE_NAME,
          }),
        { wrapper: createWrapper() }
      );

      // Start submit but don't await
      act(() => {
        void result.current.submit();
      });

      expect(result.current.step).toBe('pending');

      // Cleanup: resolve the promise
      await act(async () => {
        resolvePromise!(mockOperationResult);
        await pendingPromise;
      });
    });
  });

  // T046: Handles transaction rejection
  describe('transaction rejection handling (T046)', () => {
    it('should return to cancelled state on user rejection', async () => {
      // Setup mock to simulate rejection
      mockRevokeRoleMutateAsync.mockRejectedValue(new Error('User rejected the transaction'));

      const { result } = renderHook(
        () =>
          useRevokeRoleDialog({
            accountAddress: MOCK_TARGET_ADDRESS,
            roleId: MOCK_ROLE_ID,
            roleName: MOCK_ROLE_NAME,
          }),
        { wrapper: createWrapper() }
      );

      // Submit (will be rejected)
      await act(async () => {
        await result.current.submit();
      });

      // Should be in cancelled state
      expect(result.current.step).toBe('cancelled');
    });

    it('should detect user cancellation from error message', async () => {
      mockRevokeRoleMutateAsync.mockRejectedValue(new Error('Transaction was cancelled by user'));

      const { result } = renderHook(
        () =>
          useRevokeRoleDialog({
            accountAddress: MOCK_TARGET_ADDRESS,
            roleId: MOCK_ROLE_ID,
            roleName: MOCK_ROLE_NAME,
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.submit();
      });

      expect(result.current.step).toBe('cancelled');
    });

    it('should detect user denial from error message', async () => {
      mockRevokeRoleMutateAsync.mockRejectedValue(new Error('User denied transaction signature'));

      const { result } = renderHook(
        () =>
          useRevokeRoleDialog({
            accountAddress: MOCK_TARGET_ADDRESS,
            roleId: MOCK_ROLE_ID,
            roleName: MOCK_ROLE_NAME,
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.submit();
      });

      expect(result.current.step).toBe('cancelled');
    });
  });

  // T047: Handles transaction error with retry
  describe('transaction error handling (T047)', () => {
    it('should show error state and store error message on network error', async () => {
      // Setup mock to simulate network error
      mockRevokeRoleMutateAsync.mockRejectedValue(new Error('Network disconnected'));

      const { result } = renderHook(
        () =>
          useRevokeRoleDialog({
            accountAddress: MOCK_TARGET_ADDRESS,
            roleId: MOCK_ROLE_ID,
            roleName: MOCK_ROLE_NAME,
          }),
        { wrapper: createWrapper() }
      );

      // Submit (will fail)
      await act(async () => {
        await result.current.submit();
      });

      // Should be in error state
      expect(result.current.step).toBe('error');
      expect(result.current.errorMessage).toBe('Network disconnected');
    });

    it('should allow retry after error', async () => {
      // Setup mock for error on first call
      mockRevokeRoleMutateAsync.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(
        () =>
          useRevokeRoleDialog({
            accountAddress: MOCK_TARGET_ADDRESS,
            roleId: MOCK_ROLE_ID,
            roleName: MOCK_ROLE_NAME,
          }),
        { wrapper: createWrapper() }
      );

      // Submit (will fail)
      await act(async () => {
        await result.current.submit();
      });

      expect(result.current.step).toBe('error');
      expect(mockRevokeRoleMutateAsync).toHaveBeenCalledTimes(1);

      // Setup mock for success on retry
      mockRevokeRoleMutateAsync.mockResolvedValueOnce(mockOperationResult);

      // Retry
      await act(async () => {
        await result.current.retry();
      });

      expect(mockRevokeRoleMutateAsync).toHaveBeenCalledTimes(2);
      expect(result.current.step).toBe('success');
    });
  });

  // T048: Auto-closes after success
  describe('success auto-close (T048)', () => {
    it('should transition to success state and call onClose after 1.5s', async () => {
      const onClose = vi.fn();

      // Setup mock for successful transaction
      mockRevokeRoleMutateAsync.mockResolvedValue(mockOperationResult);

      const { result } = renderHook(
        () =>
          useRevokeRoleDialog({
            accountAddress: MOCK_TARGET_ADDRESS,
            roleId: MOCK_ROLE_ID,
            roleName: MOCK_ROLE_NAME,
            onClose,
          }),
        { wrapper: createWrapper() }
      );

      // Submit
      await act(async () => {
        await result.current.submit();
      });

      // Should be in success state
      expect(result.current.step).toBe('success');

      // onClose should not be called yet
      expect(onClose).not.toHaveBeenCalled();

      // Advance time by 1.5 seconds
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      // onClose should now be called
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onSuccess callback on successful transaction', async () => {
      const onSuccess = vi.fn();
      const onClose = vi.fn();

      mockRevokeRoleMutateAsync.mockResolvedValue(mockOperationResult);

      const { result } = renderHook(
        () =>
          useRevokeRoleDialog({
            accountAddress: MOCK_TARGET_ADDRESS,
            roleId: MOCK_ROLE_ID,
            roleName: MOCK_ROLE_NAME,
            onClose,
            onSuccess,
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.submit();
      });

      expect(onSuccess).toHaveBeenCalledWith(mockOperationResult);
    });
  });

  // Additional tests for reset functionality
  describe('reset functionality', () => {
    it('should reset to form state when reset is called', async () => {
      mockRevokeRoleMutateAsync.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(
        () =>
          useRevokeRoleDialog({
            accountAddress: MOCK_TARGET_ADDRESS,
            roleId: MOCK_ROLE_ID,
            roleName: MOCK_ROLE_NAME,
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

  // Transaction status tracking
  describe('transaction status tracking', () => {
    it('should expose txStatus and txStatusDetails', () => {
      mockRevokeRoleState.status = 'pendingConfirmation';
      mockRevokeRoleState.statusDetails = {
        txHash: '0xabc123',
        title: 'Confirming transaction',
      };

      const { result } = renderHook(
        () =>
          useRevokeRoleDialog({
            accountAddress: MOCK_TARGET_ADDRESS,
            roleId: MOCK_ROLE_ID,
            roleName: MOCK_ROLE_NAME,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.txStatus).toBe('pendingConfirmation');
      expect(result.current.txStatusDetails?.txHash).toBe('0xabc123');
    });
  });

  // Wallet connection check
  describe('wallet connection', () => {
    it('should indicate when wallet is not connected', () => {
      mockUseDerivedAccountStatus.mockReturnValue({
        address: null,
        isConnected: false,
      });

      const { result } = renderHook(
        () =>
          useRevokeRoleDialog({
            accountAddress: MOCK_TARGET_ADDRESS,
            roleId: MOCK_ROLE_ID,
            roleName: MOCK_ROLE_NAME,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isWalletConnected).toBe(false);
    });
  });
});
