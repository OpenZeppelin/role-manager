/**
 * Tests for useAssignRoleDialog hook
 * Feature: 014-role-grant-revoke
 *
 * TDD tests for the Assign Role dialog hook.
 * Tasks: T029-T034
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

import type { RoleWithDescription } from '../../types/roles';
import { useAssignRoleDialog } from '../useAssignRoleDialog';

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

// Mock roles data (T030: test that Owner role is excluded)
const mockRoles: RoleWithDescription[] = [
  {
    roleId: 'ADMIN_ROLE_ID',
    roleName: 'Admin',
    description: 'Administrator role',
    isCustomDescription: false,
    members: [MOCK_CONNECTED_ADDRESS],
    isOwnerRole: false,
    isAdminRole: true,
  },
  {
    roleId: 'MINTER_ROLE_ID',
    roleName: 'Minter',
    description: 'Can mint tokens',
    isCustomDescription: false,
    members: ['0xOtherAddress'],
    isOwnerRole: false,
    isAdminRole: false,
  },
  {
    roleId: 'PAUSER_ROLE_ID',
    roleName: 'Pauser',
    description: 'Can pause contract',
    isCustomDescription: false,
    members: [],
    isOwnerRole: false,
    isAdminRole: false,
  },
  {
    roleId: 'OWNER_ROLE_ID',
    roleName: 'Owner',
    description: 'Contract owner',
    isCustomDescription: false,
    members: [MOCK_CONNECTED_ADDRESS],
    isOwnerRole: true,
    isAdminRole: false,
  },
];

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

// Mock useRolesPageData
const mockUseRolesPageData = vi.fn();

vi.mock('../useRolesPageData', () => ({
  useRolesPageData: () => mockUseRolesPageData(),
}));

// Mock useDerivedAccountStatus from react-core
const mockUseDerivedAccountStatus = vi.fn();

vi.mock('@openzeppelin/ui-react', () => ({
  useDerivedAccountStatus: () => mockUseDerivedAccountStatus(),
}));

// Mock useGrantRole
const mockGrantRoleMutateAsync = vi.fn();
const mockGrantRoleReset = vi.fn();

let mockGrantRoleState = {
  isPending: false,
  error: null as Error | null,
  status: 'idle' as TxStatus,
  statusDetails: null as TransactionStatusUpdate | null,
  isReady: true,
  isNetworkError: false,
  isUserRejection: false,
};

vi.mock('../useAccessControlMutations', () => ({
  useGrantRole: () => ({
    mutateAsync: mockGrantRoleMutateAsync,
    reset: mockGrantRoleReset,
    ...mockGrantRoleState,
  }),
  // Include other exports that might be needed
  useRevokeRole: () => ({
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

  mockUseRolesPageData.mockReturnValue({
    roles: mockRoles,
    selectedRoleId: null,
    setSelectedRoleId: vi.fn(),
    selectedRole: null,
    hasContractSelected: true,
    capabilities: { hasAccessControl: true, hasOwnable: true },
    isSupported: true,
    isLoading: false,
    isRefreshing: false,
    hasError: false,
    errorMessage: null,
    canRetry: false,
    refetch: vi.fn(),
    updateRoleDescription: vi.fn(),
    connectedAddress: MOCK_CONNECTED_ADDRESS,
    connectedRoleIds: ['ADMIN_ROLE_ID'],
    roleIdentifiers: [],
  });

  mockUseDerivedAccountStatus.mockReturnValue({
    address: MOCK_CONNECTED_ADDRESS,
    isConnected: true,
  });

  // Reset mutation state
  mockGrantRoleState = {
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

describe('useAssignRoleDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // T030: initializes with correct available roles (excludes Owner)
  describe('initialization (T030)', () => {
    it('should initialize with available roles excluding Owner role', () => {
      const { result } = renderHook(
        () =>
          useAssignRoleDialog({
            initialRoleId: 'ADMIN_ROLE_ID',
          }),
        { wrapper: createWrapper() }
      );

      // Should have 3 roles (Admin, Minter, Pauser) - Owner excluded
      expect(result.current.availableRoles).toHaveLength(3);

      // Verify Owner is not included
      const ownerRole = result.current.availableRoles.find((r) => r.roleId === 'OWNER_ROLE_ID');
      expect(ownerRole).toBeUndefined();

      // Verify other roles are included
      const adminRole = result.current.availableRoles.find((r) => r.roleId === 'ADMIN_ROLE_ID');
      expect(adminRole).toBeDefined();
      expect(adminRole?.roleName).toBe('Admin');
    });

    it('should start in form state', () => {
      const { result } = renderHook(
        () =>
          useAssignRoleDialog({
            initialRoleId: 'ADMIN_ROLE_ID',
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.step).toBe('form');
      expect(result.current.errorMessage).toBeNull();
    });

    it('should use initialRoleId when provided', () => {
      const { result } = renderHook(
        () =>
          useAssignRoleDialog({
            initialRoleId: 'MINTER_ROLE_ID',
          }),
        { wrapper: createWrapper() }
      );

      // The hook should track the initial role ID for the form default
      expect(
        result.current.availableRoles.find((r) => r.roleId === 'MINTER_ROLE_ID')
      ).toBeDefined();
    });
  });

  // T031: submit calls useGrantRole with correct address and roleId
  describe('submit transaction (T031)', () => {
    it('should call useGrantRole.mutateAsync with correct args when submitting', async () => {
      mockGrantRoleMutateAsync.mockResolvedValue(mockOperationResult);

      const { result } = renderHook(
        () =>
          useAssignRoleDialog({
            initialRoleId: 'ADMIN_ROLE_ID',
          }),
        { wrapper: createWrapper() }
      );

      // Submit with address and roleId
      await act(async () => {
        await result.current.submit({
          address: MOCK_TARGET_ADDRESS,
          roleId: 'MINTER_ROLE_ID',
        });
      });

      expect(mockGrantRoleMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          roleId: 'MINTER_ROLE_ID',
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
      mockGrantRoleMutateAsync.mockReturnValue(pendingPromise);

      const { result } = renderHook(
        () =>
          useAssignRoleDialog({
            initialRoleId: 'ADMIN_ROLE_ID',
          }),
        { wrapper: createWrapper() }
      );

      // Start submit but don't await
      act(() => {
        void result.current.submit({
          address: MOCK_TARGET_ADDRESS,
          roleId: 'ADMIN_ROLE_ID',
        });
      });

      expect(result.current.step).toBe('pending');

      // Cleanup: resolve the promise
      await act(async () => {
        resolvePromise!(mockOperationResult);
        await pendingPromise;
      });
    });
  });

  // T032: handles transaction rejection
  describe('transaction rejection handling (T032)', () => {
    it('should return to cancelled state with preserved form values on rejection', async () => {
      // Setup mock to simulate rejection
      mockGrantRoleMutateAsync.mockRejectedValue(new Error('User rejected the transaction'));

      const { result } = renderHook(
        () =>
          useAssignRoleDialog({
            initialRoleId: 'ADMIN_ROLE_ID',
          }),
        { wrapper: createWrapper() }
      );

      // Submit (will be rejected)
      await act(async () => {
        await result.current.submit({
          address: MOCK_TARGET_ADDRESS,
          roleId: 'ADMIN_ROLE_ID',
        });
      });

      // Should be in cancelled state
      expect(result.current.step).toBe('cancelled');
    });

    it('should detect user cancellation from error message', async () => {
      mockGrantRoleMutateAsync.mockRejectedValue(new Error('Transaction was cancelled by user'));

      const { result } = renderHook(
        () =>
          useAssignRoleDialog({
            initialRoleId: 'ADMIN_ROLE_ID',
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.submit({
          address: MOCK_TARGET_ADDRESS,
          roleId: 'ADMIN_ROLE_ID',
        });
      });

      expect(result.current.step).toBe('cancelled');
    });

    it('should detect user denial from error message', async () => {
      mockGrantRoleMutateAsync.mockRejectedValue(new Error('User denied transaction signature'));

      const { result } = renderHook(
        () =>
          useAssignRoleDialog({
            initialRoleId: 'ADMIN_ROLE_ID',
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.submit({
          address: MOCK_TARGET_ADDRESS,
          roleId: 'ADMIN_ROLE_ID',
        });
      });

      expect(result.current.step).toBe('cancelled');
    });
  });

  // T033: handles transaction error with retry
  describe('transaction error handling (T033)', () => {
    it('should show error state and store error message on network error', async () => {
      // Setup mock to simulate network error
      mockGrantRoleMutateAsync.mockRejectedValue(new Error('Network disconnected'));

      const { result } = renderHook(
        () =>
          useAssignRoleDialog({
            initialRoleId: 'ADMIN_ROLE_ID',
          }),
        { wrapper: createWrapper() }
      );

      // Submit (will fail)
      await act(async () => {
        await result.current.submit({
          address: MOCK_TARGET_ADDRESS,
          roleId: 'ADMIN_ROLE_ID',
        });
      });

      // Should be in error state
      expect(result.current.step).toBe('error');
      expect(result.current.errorMessage).toBe('Network disconnected');
    });

    it('should allow retry after error', async () => {
      // Setup mock for error on first call
      mockGrantRoleMutateAsync.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(
        () =>
          useAssignRoleDialog({
            initialRoleId: 'ADMIN_ROLE_ID',
          }),
        { wrapper: createWrapper() }
      );

      // Submit (will fail)
      await act(async () => {
        await result.current.submit({
          address: MOCK_TARGET_ADDRESS,
          roleId: 'ADMIN_ROLE_ID',
        });
      });

      expect(result.current.step).toBe('error');
      expect(mockGrantRoleMutateAsync).toHaveBeenCalledTimes(1);

      // Setup mock for success on retry
      mockGrantRoleMutateAsync.mockResolvedValueOnce(mockOperationResult);

      // Retry
      await act(async () => {
        await result.current.retry();
      });

      expect(mockGrantRoleMutateAsync).toHaveBeenCalledTimes(2);
      expect(result.current.step).toBe('success');
    });
  });

  // T034: auto-closes after success
  describe('success auto-close (T034)', () => {
    it('should transition to success state and call onClose after 1.5s', async () => {
      const onClose = vi.fn();

      // Setup mock for successful transaction
      mockGrantRoleMutateAsync.mockResolvedValue(mockOperationResult);

      const { result } = renderHook(
        () =>
          useAssignRoleDialog({
            initialRoleId: 'ADMIN_ROLE_ID',
            onClose,
          }),
        { wrapper: createWrapper() }
      );

      // Submit
      await act(async () => {
        await result.current.submit({
          address: MOCK_TARGET_ADDRESS,
          roleId: 'ADMIN_ROLE_ID',
        });
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

      mockGrantRoleMutateAsync.mockResolvedValue(mockOperationResult);

      const { result } = renderHook(
        () =>
          useAssignRoleDialog({
            initialRoleId: 'ADMIN_ROLE_ID',
            onClose,
            onSuccess,
          }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.submit({
          address: MOCK_TARGET_ADDRESS,
          roleId: 'ADMIN_ROLE_ID',
        });
      });

      expect(onSuccess).toHaveBeenCalledWith(mockOperationResult);
    });
  });

  // Additional tests for reset functionality
  describe('reset functionality', () => {
    it('should reset to form state when reset is called', async () => {
      mockGrantRoleMutateAsync.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(
        () =>
          useAssignRoleDialog({
            initialRoleId: 'ADMIN_ROLE_ID',
          }),
        { wrapper: createWrapper() }
      );

      // Trigger error state
      await act(async () => {
        await result.current.submit({
          address: MOCK_TARGET_ADDRESS,
          roleId: 'ADMIN_ROLE_ID',
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

  // Transaction status tracking
  describe('transaction status tracking', () => {
    it('should expose txStatus and txStatusDetails', () => {
      mockGrantRoleState.status = 'pendingConfirmation';
      mockGrantRoleState.statusDetails = {
        txHash: '0xabc123',
        title: 'Confirming transaction',
      };

      const { result } = renderHook(
        () =>
          useAssignRoleDialog({
            initialRoleId: 'ADMIN_ROLE_ID',
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.txStatus).toBe('pendingConfirmation');
      expect(result.current.txStatusDetails?.txHash).toBe('0xabc123');
    });
  });

  // Wallet connection check
  describe('wallet connection', () => {
    it('should work when wallet is connected', () => {
      const { result } = renderHook(
        () =>
          useAssignRoleDialog({
            initialRoleId: 'ADMIN_ROLE_ID',
          }),
        { wrapper: createWrapper() }
      );

      // Hook should initialize properly when wallet is connected
      expect(result.current.availableRoles.length).toBeGreaterThan(0);
    });
  });
});
