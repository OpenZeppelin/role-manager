/**
 * useAssignRoleDialog hook
 * Feature: 014-role-grant-revoke
 *
 * Hook that manages the state and logic for the Assign Role dialog.
 * Implements:
 * - Available roles filtering (excludes Owner role) (T035)
 * - Transaction execution via useGrantRole (T035)
 * - Success auto-close with 1.5s timeout (T035)
 *
 * Refactored to use useTransactionExecution for common transaction logic.
 */
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useDerivedAccountStatus } from '@openzeppelin/ui-react';
import type {
  ExecutionConfig,
  OperationResult,
  TransactionStatusUpdate,
  TxStatus,
} from '@openzeppelin/ui-types';

import type { DialogTransactionStep } from '../types/role-dialogs';
import { useGrantRole, type GrantRoleArgs } from './useAccessControlMutations';
import { useRolesPageData } from './useRolesPageData';
import { useSelectedContract } from './useSelectedContract';
import { useTransactionExecution } from './useTransactionExecution';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for useAssignRoleDialog hook
 */
export interface UseAssignRoleDialogOptions {
  /** Pre-selected role ID (from Roles page context) */
  initialRoleId: string;
  /** Callback when dialog should close */
  onClose?: () => void;
  /** Callback on successful transaction */
  onSuccess?: (result: OperationResult) => void;
}

/**
 * Form data submitted to the hook
 */
export interface AssignRoleFormData {
  /** Target address to grant role to */
  address: string;
  /** Role ID to grant */
  roleId: string;
}

/**
 * Return type for useAssignRoleDialog hook
 */
export interface UseAssignRoleDialogReturn {
  // State
  /** Available roles (excluding Owner) */
  availableRoles: Array<{ roleId: string; roleName: string }>;
  /** Current transaction step */
  step: DialogTransactionStep;
  /** Error message if step is 'error' */
  errorMessage: string | null;
  /** Transaction status */
  txStatus: TxStatus;
  /** Detailed transaction status */
  txStatusDetails: TransactionStatusUpdate | null;
  /** Whether wallet is connected (required for transaction) */
  isWalletConnected: boolean;

  // Actions
  /** Submit the grant transaction (receives form values from react-hook-form) */
  submit: (data: AssignRoleFormData) => Promise<void>;
  /** Retry after error */
  retry: () => Promise<void>;
  /** Reset dialog to form state */
  reset: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook that manages state and logic for the Assign Role dialog.
 *
 * Features:
 * - Filters available roles to exclude Owner role
 * - Handles transaction execution with proper state transitions
 * - Auto-closes dialog 1.5s after successful transaction
 *
 * @param options - Configuration including initialRoleId and callbacks
 * @returns Dialog state, actions, and derived values
 *
 * @example
 * ```tsx
 * const {
 *   availableRoles,
 *   step,
 *   submit,
 *   retry,
 *   reset,
 * } = useAssignRoleDialog({
 *   initialRoleId: 'MINTER_ROLE_ID',
 *   onClose: () => setDialogOpen(false),
 *   onSuccess: () => refetch(),
 * });
 * ```
 */
export function useAssignRoleDialog(
  options: UseAssignRoleDialogOptions
): UseAssignRoleDialogReturn {
  const { initialRoleId, onClose, onSuccess } = options;

  // =============================================================================
  // Context & External Data
  // =============================================================================

  const { selectedContract, adapter } = useSelectedContract();
  const contractAddress = selectedContract?.address ?? '';

  const { roles } = useRolesPageData();
  const { address: connectedAddress } = useDerivedAccountStatus();

  // Mutation hook for grant
  const grantRole = useGrantRole(adapter, contractAddress);

  // =============================================================================
  // Transaction Execution (using shared hook)
  // =============================================================================

  const { step, errorMessage, execute, retry, reset } = useTransactionExecution<GrantRoleArgs>(
    grantRole,
    {
      onClose,
      onSuccess,
    }
  );

  // =============================================================================
  // Reset State on Role Change
  // =============================================================================

  // Track the last initialRoleId to detect changes
  const lastInitialRoleIdRef = useRef<string | null>(null);

  // Reset transaction state when initialRoleId changes (dialog opened for different role)
  useEffect(() => {
    if (lastInitialRoleIdRef.current !== null && lastInitialRoleIdRef.current !== initialRoleId) {
      // Role changed, reset the transaction state
      reset();
    }
    lastInitialRoleIdRef.current = initialRoleId;
  }, [initialRoleId, reset]);

  // =============================================================================
  // Available Roles (T035)
  // =============================================================================

  // Filter out Owner role
  const availableRoles = useMemo(() => {
    return roles
      .filter((role) => !role.isOwnerRole)
      .map((role) => ({
        roleId: role.roleId,
        roleName: role.roleName,
      }));
  }, [roles]);

  // =============================================================================
  // Submit Handler
  // =============================================================================

  const submit = useCallback(
    async (data: AssignRoleFormData) => {
      await execute({
        roleId: data.roleId,
        account: data.address,
        executionConfig: { method: 'eoa' } as ExecutionConfig,
      });
    },
    [execute]
  );

  // =============================================================================
  // Transaction Status
  // =============================================================================

  const txStatus = grantRole.status;
  const txStatusDetails = grantRole.statusDetails;

  // =============================================================================
  // Derived State
  // =============================================================================

  const isWalletConnected = !!connectedAddress;

  // =============================================================================
  // Return
  // =============================================================================

  return {
    // State
    availableRoles,
    step,
    errorMessage,
    txStatus,
    txStatusDetails,
    isWalletConnected,

    // Actions
    submit,
    retry,
    reset,
  };
}
