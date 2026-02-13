/**
 * useManageRolesDialog hook
 * Feature: 014-role-grant-revoke
 *
 * Hook that manages the state and logic for the Manage Roles dialog.
 * Implements:
 * - Role state initialization from current assignments (T018)
 * - Single-change constraint with auto-revert (T019)
 * - Transaction execution via useGrantRole/useRevokeRole (T020)
 * - Derived state for UI (canSubmit, submitLabel, showSelfRevokeWarning) (T021)
 * - Success auto-close with 1.5s timeout (T022)
 *
 * Refactored to use useMultiMutationExecution for common transaction logic.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useDerivedAccountStatus } from '@openzeppelin/ui-react';
import type {
  ExecutionConfig,
  OperationResult,
  TransactionStatusUpdate,
  TxStatus,
} from '@openzeppelin/ui-types';

import type {
  DialogTransactionStep,
  PendingRoleChange,
  RoleCheckboxItem,
} from '../types/role-dialogs';
import { useGrantRole, useRevokeRole } from './useAccessControlMutations';
import { useRolesPageData } from './useRolesPageData';
import { useSelectedContract } from './useSelectedContract';
import { useMultiMutationExecution } from './useTransactionExecution';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for useManageRolesDialog hook
 */
export interface UseManageRolesDialogOptions {
  /** Target account address to manage roles for */
  accountAddress: string;
  /** Callback when dialog should close (after success or cancel) */
  onClose?: () => void;
  /** Callback on successful transaction */
  onSuccess?: (result: OperationResult) => void;
}

/**
 * Return type for useManageRolesDialog hook
 */
export interface UseManageRolesDialogReturn {
  // State
  /** Role checkbox items with current/original state */
  roleItems: RoleCheckboxItem[];
  /** The single pending change, if any */
  pendingChange: PendingRoleChange | null;
  /** Current transaction step */
  step: DialogTransactionStep;
  /** Error message if step is 'error' */
  errorMessage: string | null;
  /** Whether target account is the connected wallet */
  isSelfAccount: boolean;
  /** Transaction status for progress display */
  txStatus: TxStatus;
  /** Detailed transaction status */
  txStatusDetails: TransactionStatusUpdate | null;

  // Actions
  /** Toggle a role checkbox (handles single-change constraint) */
  toggleRole: (roleId: string) => void;
  /** Submit the pending change */
  submit: () => void;
  /** Retry after error */
  retry: () => void;
  /** Reset dialog to form state */
  reset: () => void;

  // Derived
  /** Whether submit button should be enabled */
  canSubmit: boolean;
  /** Label for submit button (e.g., "Grant Viewer" or "Revoke Pauser") */
  submitLabel: string;
  /** Whether showing self-revoke warning */
  showSelfRevokeWarning: boolean;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook that manages state and logic for the Manage Roles dialog.
 *
 * Features:
 * - Initializes checkbox states from account's current role assignments
 * - Enforces single-change constraint via auto-revert
 * - Detects self-revoke scenarios for warning display
 * - Handles transaction execution with proper state transitions
 * - Auto-closes dialog 1.5s after successful transaction
 *
 * @param options - Configuration including accountAddress and callbacks
 * @returns Dialog state, actions, and derived values
 *
 * @example
 * ```tsx
 * const {
 *   roleItems,
 *   pendingChange,
 *   step,
 *   toggleRole,
 *   submit,
 *   canSubmit,
 *   submitLabel,
 *   showSelfRevokeWarning,
 * } = useManageRolesDialog({
 *   accountAddress: '0x...',
 *   onClose: () => setDialogOpen(false),
 *   onSuccess: () => refetch(),
 * });
 * ```
 */
export function useManageRolesDialog(
  options: UseManageRolesDialogOptions
): UseManageRolesDialogReturn {
  const { accountAddress, onClose, onSuccess } = options;

  // =============================================================================
  // Context & External Data
  // =============================================================================

  const { selectedContract, adapter } = useSelectedContract();
  const contractAddress = selectedContract?.address ?? '';

  const { roles } = useRolesPageData();
  const { address: connectedAddress } = useDerivedAccountStatus();

  // Mutation hooks for grant/revoke
  const grantRole = useGrantRole(adapter, contractAddress);
  const revokeRole = useRevokeRole(adapter, contractAddress);

  // =============================================================================
  // Transaction Execution (using shared hook)
  // =============================================================================

  const {
    step,
    errorMessage,
    execute,
    retry,
    reset: resetTransaction,
  } = useMultiMutationExecution({
    onClose,
    onSuccess,
    resetMutations: [grantRole.reset, revokeRole.reset],
  });

  // =============================================================================
  // Internal State
  // =============================================================================

  const [pendingChange, setPendingChange] = useState<PendingRoleChange | null>(null);

  // Store original assignments snapshot (taken once when dialog opens)
  const [originalAssignments, setOriginalAssignments] = useState<Map<string, boolean>>(new Map());
  const [initializedForAccount, setInitializedForAccount] = useState<string | null>(null);

  // =============================================================================
  // Role Items Initialization (T018)
  // =============================================================================

  // Filter out Owner role and compute initial assignments
  const availableRoles = useMemo(() => {
    return roles.filter((role) => !role.isOwnerRole);
  }, [roles]);

  // Initialize original assignments when dialog opens or account changes (snapshot)
  useEffect(() => {
    // Re-initialize when account changes or when opening for the first time
    if (accountAddress && availableRoles.length > 0 && initializedForAccount !== accountAddress) {
      const assignments = new Map<string, boolean>();
      availableRoles.forEach((role) => {
        const isAssigned = role.members.some(
          (member) => member.toLowerCase() === accountAddress.toLowerCase()
        );
        assignments.set(role.roleId, isAssigned);
      });
      setOriginalAssignments(assignments);
      setInitializedForAccount(accountAddress);
      // Also clear any pending change from a previous account
      setPendingChange(null);
      // Reset transaction state (clears any leftover success/error state)
      resetTransaction();
    }
  }, [availableRoles, accountAddress, initializedForAccount, resetTransaction]);

  // Compute current checkbox states
  const roleItems = useMemo((): RoleCheckboxItem[] => {
    return availableRoles.map((role) => {
      const originallyAssigned = originalAssignments.get(role.roleId) ?? false;

      // Determine current checked state based on pending change
      let isChecked = originallyAssigned;
      let isPendingChange = false;

      if (pendingChange?.roleId === role.roleId) {
        // This role has the pending change
        isChecked = pendingChange.type === 'grant';
        isPendingChange = true;
      }

      return {
        roleId: role.roleId,
        roleName: role.roleName,
        originallyAssigned,
        isChecked,
        isPendingChange,
      };
    });
  }, [availableRoles, originalAssignments, pendingChange]);

  // =============================================================================
  // Self-Account Detection
  // =============================================================================

  const isSelfAccount = useMemo(() => {
    if (!connectedAddress || !accountAddress) return false;
    return connectedAddress.toLowerCase() === accountAddress.toLowerCase();
  }, [connectedAddress, accountAddress]);

  // =============================================================================
  // Toggle Role with Single-Change Constraint (T019)
  // =============================================================================

  const toggleRole = useCallback(
    (roleId: string) => {
      const role = availableRoles.find((r) => r.roleId === roleId);
      if (!role) return;

      const originallyAssigned = originalAssignments.get(roleId) ?? false;

      // Determine the new state after toggle
      let newCheckedState: boolean;
      if (pendingChange?.roleId === roleId) {
        // Toggling the currently pending role - revert to original
        newCheckedState = originallyAssigned;
      } else {
        // Toggling a different role - set to opposite of original
        newCheckedState = !originallyAssigned;
      }

      // If new state matches original, clear pending change
      if (newCheckedState === originallyAssigned) {
        setPendingChange(null);
      } else {
        // Set this as the new pending change (auto-reverts any previous)
        setPendingChange({
          type: newCheckedState ? 'grant' : 'revoke',
          roleId,
          roleName: role.roleName,
        });
      }
    },
    [availableRoles, originalAssignments, pendingChange]
  );

  // =============================================================================
  // Transaction Execution (T020)
  // =============================================================================

  const submit = useCallback(async () => {
    if (!pendingChange) return;

    const mutationArgs = {
      roleId: pendingChange.roleId,
      account: accountAddress,
      executionConfig: { method: 'eoa', allowAny: true } as ExecutionConfig,
    };

    await execute(() =>
      pendingChange.type === 'grant'
        ? grantRole.mutateAsync(mutationArgs)
        : revokeRole.mutateAsync(mutationArgs)
    );
  }, [pendingChange, accountAddress, grantRole, revokeRole, execute]);

  // =============================================================================
  // Reset (combines transaction reset with local state reset)
  // =============================================================================

  const reset = useCallback(() => {
    resetTransaction();
    setPendingChange(null);
    // Reset initialization so fresh data is loaded next time
    setInitializedForAccount(null);
    setOriginalAssignments(new Map());
  }, [resetTransaction]);

  // =============================================================================
  // Derived State (T021)
  // =============================================================================

  const canSubmit = useMemo(() => {
    if (!pendingChange) return false;
    if (!connectedAddress) return false; // Wallet must be connected
    if (grantRole.isPending || revokeRole.isPending) return false;
    if (step !== 'form') return false;
    return true;
  }, [pendingChange, connectedAddress, grantRole.isPending, revokeRole.isPending, step]);

  const submitLabel = useMemo(() => {
    if (!pendingChange) return '';
    const action = pendingChange.type === 'grant' ? 'Grant' : 'Revoke';
    return `${action} ${pendingChange.roleName}`;
  }, [pendingChange]);

  const showSelfRevokeWarning = useMemo(() => {
    if (!isSelfAccount) return false;
    if (!pendingChange) return false;
    return pendingChange.type === 'revoke';
  }, [isSelfAccount, pendingChange]);

  // Transaction status from active mutation
  const txStatus = useMemo((): TxStatus => {
    if (pendingChange?.type === 'grant') {
      return grantRole.status;
    } else if (pendingChange?.type === 'revoke') {
      return revokeRole.status;
    }
    return 'idle';
  }, [pendingChange, grantRole.status, revokeRole.status]);

  const txStatusDetails = useMemo((): TransactionStatusUpdate | null => {
    if (pendingChange?.type === 'grant') {
      return grantRole.statusDetails;
    } else if (pendingChange?.type === 'revoke') {
      return revokeRole.statusDetails;
    }
    return null;
  }, [pendingChange, grantRole.statusDetails, revokeRole.statusDetails]);

  // =============================================================================
  // Return
  // =============================================================================

  return {
    // State
    roleItems,
    pendingChange,
    step,
    errorMessage,
    isSelfAccount,
    txStatus,
    txStatusDetails,

    // Actions
    toggleRole,
    submit,
    retry,
    reset,

    // Derived
    canSubmit,
    submitLabel,
    showSelfRevokeWarning,
  };
}
