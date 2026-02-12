/**
 * Tests for useManageRolesDialog hook
 * Feature: 014-role-grant-revoke
 *
 * TDD tests for the Manage Roles dialog hook.
 * Tasks: T007-T017
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
import { useManageRolesDialog } from '../useManageRolesDialog';

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
const MOCK_ACCOUNT_ADDRESS = '0xAccountAddress';
const MOCK_CONNECTED_ADDRESS = '0xConnectedWallet';

// Mock roles data
const mockRoles: RoleWithDescription[] = [
  {
    roleId: 'ADMIN_ROLE_ID',
    roleName: 'Admin',
    description: 'Administrator role',
    isCustomDescription: false,
    members: [MOCK_ACCOUNT_ADDRESS, MOCK_CONNECTED_ADDRESS],
    isOwnerRole: false,
    isAdminRole: true,
    isHashDisplay: false,
  },
  {
    roleId: 'MINTER_ROLE_ID',
    roleName: 'Minter',
    description: 'Can mint tokens',
    isCustomDescription: false,
    members: ['0xOtherAddress'],
    isOwnerRole: false,
    isAdminRole: false,
    isHashDisplay: false,
  },
  {
    roleId: 'PAUSER_ROLE_ID',
    roleName: 'Pauser',
    description: 'Can pause contract',
    isCustomDescription: false,
    members: [],
    isOwnerRole: false,
    isAdminRole: false,
    isHashDisplay: false,
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

// Mock useGrantRole and useRevokeRole
const mockGrantRoleMutateAsync = vi.fn();
const mockGrantRoleReset = vi.fn();
const mockRevokeRoleMutateAsync = vi.fn();
const mockRevokeRoleReset = vi.fn();

let mockGrantRoleState = {
  isPending: false,
  error: null as Error | null,
  status: 'idle' as TxStatus,
  statusDetails: null as TransactionStatusUpdate | null,
  isReady: true,
  isNetworkError: false,
  isUserRejection: false,
};

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
  useGrantRole: () => ({
    mutateAsync: mockGrantRoleMutateAsync,
    reset: mockGrantRoleReset,
    ...mockGrantRoleState,
  }),
  useRevokeRole: () => ({
    mutateAsync: mockRevokeRoleMutateAsync,
    reset: mockRevokeRoleReset,
    ...mockRevokeRoleState,
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

  // Reset mutation states
  mockGrantRoleState = {
    isPending: false,
    error: null,
    status: 'idle',
    statusDetails: null,
    isReady: true,
    isNetworkError: false,
    isUserRejection: false,
  };

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

describe('useManageRolesDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // T008: initializes with correct role states from data
  describe('initialization (T008)', () => {
    it('should initialize roleItems with correct checked states based on account membership', () => {
      const { result } = renderHook(
        () =>
          useManageRolesDialog({
            accountAddress: MOCK_ACCOUNT_ADDRESS,
          }),
        { wrapper: createWrapper() }
      );

      // Account is member of Admin role, not Minter or Pauser
      expect(result.current.roleItems).toHaveLength(3);

      const adminRole = result.current.roleItems.find((r) => r.roleId === 'ADMIN_ROLE_ID');
      const minterRole = result.current.roleItems.find((r) => r.roleId === 'MINTER_ROLE_ID');
      const pauserRole = result.current.roleItems.find((r) => r.roleId === 'PAUSER_ROLE_ID');

      expect(adminRole?.isChecked).toBe(true);
      expect(adminRole?.originallyAssigned).toBe(true);
      expect(minterRole?.isChecked).toBe(false);
      expect(minterRole?.originallyAssigned).toBe(false);
      expect(pauserRole?.isChecked).toBe(false);
      expect(pauserRole?.originallyAssigned).toBe(false);
    });

    it('should start with no pending change', () => {
      const { result } = renderHook(
        () =>
          useManageRolesDialog({
            accountAddress: MOCK_ACCOUNT_ADDRESS,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.pendingChange).toBeNull();
      expect(result.current.step).toBe('form');
    });

    it('should exclude Owner role from roleItems', () => {
      // Setup mock with Owner role included
      mockUseRolesPageData.mockReturnValue({
        ...mockUseRolesPageData(),
        roles: [
          ...mockRoles,
          {
            roleId: 'OWNER_ROLE_ID',
            roleName: 'Owner',
            description: 'Contract owner',
            isCustomDescription: false,
            members: [MOCK_CONNECTED_ADDRESS],
            isOwnerRole: true,
          },
        ],
      });

      const { result } = renderHook(
        () =>
          useManageRolesDialog({
            accountAddress: MOCK_ACCOUNT_ADDRESS,
          }),
        { wrapper: createWrapper() }
      );

      // Owner role should be excluded
      expect(result.current.roleItems.find((r) => r.roleId === 'OWNER_ROLE_ID')).toBeUndefined();
      expect(result.current.roleItems).toHaveLength(3);
    });
  });

  // T009: enforces single-change constraint via auto-revert
  describe('single-change constraint (T009)', () => {
    it('should allow toggling a single role', () => {
      const { result } = renderHook(
        () =>
          useManageRolesDialog({
            accountAddress: MOCK_ACCOUNT_ADDRESS,
          }),
        { wrapper: createWrapper() }
      );

      // Toggle Minter role (grant)
      act(() => {
        result.current.toggleRole('MINTER_ROLE_ID');
      });

      expect(result.current.pendingChange).toEqual({
        type: 'grant',
        roleId: 'MINTER_ROLE_ID',
        roleName: 'Minter',
      });

      const minterRole = result.current.roleItems.find((r) => r.roleId === 'MINTER_ROLE_ID');
      expect(minterRole?.isChecked).toBe(true);
      expect(minterRole?.isPendingChange).toBe(true);
    });

    it('should auto-revert previous toggle when toggling a second role', () => {
      const { result } = renderHook(
        () =>
          useManageRolesDialog({
            accountAddress: MOCK_ACCOUNT_ADDRESS,
          }),
        { wrapper: createWrapper() }
      );

      // First toggle: grant Minter
      act(() => {
        result.current.toggleRole('MINTER_ROLE_ID');
      });

      expect(result.current.pendingChange?.roleId).toBe('MINTER_ROLE_ID');

      // Second toggle: grant Pauser (should revert Minter)
      act(() => {
        result.current.toggleRole('PAUSER_ROLE_ID');
      });

      // Pending change should now be Pauser
      expect(result.current.pendingChange).toEqual({
        type: 'grant',
        roleId: 'PAUSER_ROLE_ID',
        roleName: 'Pauser',
      });

      // Minter should be reverted to original (unchecked)
      const minterRole = result.current.roleItems.find((r) => r.roleId === 'MINTER_ROLE_ID');
      expect(minterRole?.isChecked).toBe(false);
      expect(minterRole?.isPendingChange).toBe(false);

      // Pauser should be checked and pending
      const pauserRole = result.current.roleItems.find((r) => r.roleId === 'PAUSER_ROLE_ID');
      expect(pauserRole?.isChecked).toBe(true);
      expect(pauserRole?.isPendingChange).toBe(true);
    });

    it('should clear pending change when toggling back to original state', () => {
      const { result } = renderHook(
        () =>
          useManageRolesDialog({
            accountAddress: MOCK_ACCOUNT_ADDRESS,
          }),
        { wrapper: createWrapper() }
      );

      // Toggle Minter (grant)
      act(() => {
        result.current.toggleRole('MINTER_ROLE_ID');
      });

      expect(result.current.pendingChange).not.toBeNull();

      // Toggle Minter again (revert to original unchecked state)
      act(() => {
        result.current.toggleRole('MINTER_ROLE_ID');
      });

      expect(result.current.pendingChange).toBeNull();

      const minterRole = result.current.roleItems.find((r) => r.roleId === 'MINTER_ROLE_ID');
      expect(minterRole?.isChecked).toBe(false);
      expect(minterRole?.isPendingChange).toBe(false);
    });
  });

  // T010: detects self-revoke when connected wallet matches target account
  describe('self-revoke detection (T010)', () => {
    it('should detect self-revoke when revoking own role', () => {
      // Setup: connected wallet is the target account
      const { result } = renderHook(
        () =>
          useManageRolesDialog({
            accountAddress: MOCK_CONNECTED_ADDRESS,
          }),
        { wrapper: createWrapper() }
      );

      // Revoke Admin role (connected wallet has this role)
      act(() => {
        result.current.toggleRole('ADMIN_ROLE_ID');
      });

      expect(result.current.showSelfRevokeWarning).toBe(true);
      expect(result.current.isSelfAccount).toBe(true);
    });

    it('should not show self-revoke warning when granting a role to self', () => {
      const { result } = renderHook(
        () =>
          useManageRolesDialog({
            accountAddress: MOCK_CONNECTED_ADDRESS,
          }),
        { wrapper: createWrapper() }
      );

      // Grant Minter role (not self-revoke, it's self-grant)
      act(() => {
        result.current.toggleRole('MINTER_ROLE_ID');
      });

      expect(result.current.showSelfRevokeWarning).toBe(false);
    });

    it('should not show self-revoke warning when revoking from different account', () => {
      const { result } = renderHook(
        () =>
          useManageRolesDialog({
            accountAddress: MOCK_ACCOUNT_ADDRESS, // Different from connected
          }),
        { wrapper: createWrapper() }
      );

      // Revoke Admin role from different account
      act(() => {
        result.current.toggleRole('ADMIN_ROLE_ID');
      });

      expect(result.current.showSelfRevokeWarning).toBe(false);
      expect(result.current.isSelfAccount).toBe(false);
    });
  });

  // T011: canSubmit is false when no changes, true when pendingChange exists
  describe('canSubmit state (T011)', () => {
    it('should have canSubmit=false when no changes made', () => {
      const { result } = renderHook(
        () =>
          useManageRolesDialog({
            accountAddress: MOCK_ACCOUNT_ADDRESS,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.canSubmit).toBe(false);
    });

    it('should have canSubmit=true when pendingChange exists and wallet connected', () => {
      const { result } = renderHook(
        () =>
          useManageRolesDialog({
            accountAddress: MOCK_ACCOUNT_ADDRESS,
          }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.toggleRole('MINTER_ROLE_ID');
      });

      expect(result.current.canSubmit).toBe(true);
    });

    it('should have canSubmit=false when wallet not connected', () => {
      // Mock wallet as disconnected
      mockUseDerivedAccountStatus.mockReturnValue({
        address: null,
        isConnected: false,
      });

      const { result } = renderHook(
        () =>
          useManageRolesDialog({
            accountAddress: MOCK_ACCOUNT_ADDRESS,
          }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.toggleRole('MINTER_ROLE_ID');
      });

      // Even with pending change, canSubmit should be false when wallet disconnected
      expect(result.current.canSubmit).toBe(false);
    });

    it('should have canSubmit=false during pending transaction', () => {
      mockGrantRoleState.isPending = true;

      const { result } = renderHook(
        () =>
          useManageRolesDialog({
            accountAddress: MOCK_ACCOUNT_ADDRESS,
          }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.toggleRole('MINTER_ROLE_ID');
      });

      // Even with pending change, should be false during transaction
      expect(result.current.canSubmit).toBe(false);
    });
  });

  // T012: submitLabel reflects pending action
  describe('submitLabel (T012)', () => {
    it('should be empty string when no change (button hidden)', () => {
      const { result } = renderHook(
        () =>
          useManageRolesDialog({
            accountAddress: MOCK_ACCOUNT_ADDRESS,
          }),
        { wrapper: createWrapper() }
      );

      // Button is hidden when no pending change, so label is empty
      expect(result.current.submitLabel).toBe('');
    });

    it('should show "Grant {RoleName}" when granting', () => {
      const { result } = renderHook(
        () =>
          useManageRolesDialog({
            accountAddress: MOCK_ACCOUNT_ADDRESS,
          }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.toggleRole('MINTER_ROLE_ID');
      });

      expect(result.current.submitLabel).toBe('Grant Minter');
    });

    it('should show "Revoke {RoleName}" when revoking', () => {
      const { result } = renderHook(
        () =>
          useManageRolesDialog({
            accountAddress: MOCK_ACCOUNT_ADDRESS,
          }),
        { wrapper: createWrapper() }
      );

      // Revoke Admin (account has this role)
      act(() => {
        result.current.toggleRole('ADMIN_ROLE_ID');
      });

      expect(result.current.submitLabel).toBe('Revoke Admin');
    });
  });

  // T013: executes grant transaction via useGrantRole
  describe('grant transaction execution (T013)', () => {
    it('should call useGrantRole.mutateAsync with correct args when submitting grant', async () => {
      mockGrantRoleMutateAsync.mockResolvedValue(mockOperationResult);

      const { result } = renderHook(
        () =>
          useManageRolesDialog({
            accountAddress: MOCK_ACCOUNT_ADDRESS,
          }),
        { wrapper: createWrapper() }
      );

      // Toggle Minter (grant)
      act(() => {
        result.current.toggleRole('MINTER_ROLE_ID');
      });

      // Submit
      await act(async () => {
        await result.current.submit();
      });

      expect(mockGrantRoleMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          roleId: 'MINTER_ROLE_ID',
          account: MOCK_ACCOUNT_ADDRESS,
          executionConfig: { method: 'eoa' },
        })
      );
      expect(mockRevokeRoleMutateAsync).not.toHaveBeenCalled();
    });
  });

  // T014: executes revoke transaction via useRevokeRole
  describe('revoke transaction execution (T014)', () => {
    it('should call useRevokeRole.mutateAsync with correct args when submitting revoke', async () => {
      mockRevokeRoleMutateAsync.mockResolvedValue(mockOperationResult);

      const { result } = renderHook(
        () =>
          useManageRolesDialog({
            accountAddress: MOCK_ACCOUNT_ADDRESS,
          }),
        { wrapper: createWrapper() }
      );

      // Toggle Admin (revoke - account has this role)
      act(() => {
        result.current.toggleRole('ADMIN_ROLE_ID');
      });

      // Submit
      await act(async () => {
        await result.current.submit();
      });

      expect(mockRevokeRoleMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          roleId: 'ADMIN_ROLE_ID',
          account: MOCK_ACCOUNT_ADDRESS,
          executionConfig: { method: 'eoa' },
        })
      );
      expect(mockGrantRoleMutateAsync).not.toHaveBeenCalled();
    });
  });

  // T015: handles transaction rejection
  describe('transaction rejection handling (T015)', () => {
    it('should return to cancelled state with preserved inputs on rejection', async () => {
      // Setup mock to simulate rejection
      mockGrantRoleMutateAsync.mockRejectedValue(new Error('User rejected the transaction'));

      const { result } = renderHook(
        () =>
          useManageRolesDialog({
            accountAddress: MOCK_ACCOUNT_ADDRESS,
          }),
        { wrapper: createWrapper() }
      );

      // Toggle Minter
      act(() => {
        result.current.toggleRole('MINTER_ROLE_ID');
      });

      // Submit (will be rejected)
      await act(async () => {
        await result.current.submit();
      });

      // Should be in cancelled state
      expect(result.current.step).toBe('cancelled');

      // Pending change should still be preserved
      expect(result.current.pendingChange).not.toBeNull();
    });
  });

  // T016: handles transaction error with retry
  describe('transaction error handling (T016)', () => {
    it('should show error state and enable retry on network error', async () => {
      // Setup mock to simulate network error
      mockGrantRoleMutateAsync.mockRejectedValue(new Error('Network disconnected'));

      const { result } = renderHook(
        () =>
          useManageRolesDialog({
            accountAddress: MOCK_ACCOUNT_ADDRESS,
          }),
        { wrapper: createWrapper() }
      );

      // Toggle Minter
      act(() => {
        result.current.toggleRole('MINTER_ROLE_ID');
      });

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
      mockGrantRoleMutateAsync.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(
        () =>
          useManageRolesDialog({
            accountAddress: MOCK_ACCOUNT_ADDRESS,
          }),
        { wrapper: createWrapper() }
      );

      // Toggle and submit (will fail)
      act(() => {
        result.current.toggleRole('MINTER_ROLE_ID');
      });

      await act(async () => {
        await result.current.submit();
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

  // T017: auto-closes dialog after 1.5s success display
  describe('success auto-close (T017)', () => {
    it('should transition to success state and call onClose after 1.5s', async () => {
      const onClose = vi.fn();

      // Setup mock for successful transaction
      mockGrantRoleMutateAsync.mockResolvedValue(mockOperationResult);

      const { result } = renderHook(
        () =>
          useManageRolesDialog({
            accountAddress: MOCK_ACCOUNT_ADDRESS,
            onClose,
          }),
        { wrapper: createWrapper() }
      );

      // Toggle and submit
      act(() => {
        result.current.toggleRole('MINTER_ROLE_ID');
      });

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

      mockGrantRoleMutateAsync.mockResolvedValue(mockOperationResult);

      const { result } = renderHook(
        () =>
          useManageRolesDialog({
            accountAddress: MOCK_ACCOUNT_ADDRESS,
            onClose,
            onSuccess,
          }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.toggleRole('MINTER_ROLE_ID');
      });

      await act(async () => {
        await result.current.submit();
      });

      expect(onSuccess).toHaveBeenCalledWith(mockOperationResult);
    });
  });

  // Additional tests for step transitions
  describe('step transitions', () => {
    it('should transition to pending state when submit starts', async () => {
      // Create a promise that we can control
      let resolvePromise: (value: OperationResult) => void;
      const pendingPromise = new Promise<OperationResult>((resolve) => {
        resolvePromise = resolve;
      });
      mockGrantRoleMutateAsync.mockReturnValue(pendingPromise);

      const { result } = renderHook(
        () =>
          useManageRolesDialog({
            accountAddress: MOCK_ACCOUNT_ADDRESS,
          }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.toggleRole('MINTER_ROLE_ID');
      });

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

    it('should reset to form state when reset is called', () => {
      const { result } = renderHook(
        () =>
          useManageRolesDialog({
            accountAddress: MOCK_ACCOUNT_ADDRESS,
          }),
        { wrapper: createWrapper() }
      );

      // Make a change
      act(() => {
        result.current.toggleRole('MINTER_ROLE_ID');
      });

      expect(result.current.pendingChange).not.toBeNull();

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.pendingChange).toBeNull();
      expect(result.current.step).toBe('form');

      // All checkboxes should be back to original state
      result.current.roleItems.forEach((item) => {
        expect(item.isChecked).toBe(item.originallyAssigned);
        expect(item.isPendingChange).toBe(false);
      });
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
          useManageRolesDialog({
            accountAddress: MOCK_ACCOUNT_ADDRESS,
          }),
        { wrapper: createWrapper() }
      );

      act(() => {
        result.current.toggleRole('MINTER_ROLE_ID');
      });

      expect(result.current.txStatus).toBe('pendingConfirmation');
      expect(result.current.txStatusDetails?.txHash).toBe('0xabc123');
    });
  });
});
