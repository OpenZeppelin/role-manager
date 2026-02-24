/**
 * useRevokeRoleDialog hook
 * Feature: 014-role-grant-revoke
 *
 * Hook that manages the state and logic for the Revoke Role dialog.
 * Implements:
 * - Self-revoke detection (T044)
 * - Transaction execution via useRevokeRole (T049)
 * - Success auto-close with 1.5s timeout (T048)
 *
 * Refactored to use useTransactionExecution for common transaction logic.
 */
import { useCallback, useMemo } from 'react';

import { useDerivedAccountStatus } from '@openzeppelin/ui-react';
import type {
  ExecutionConfig,
  OperationResult,
  TransactionStatusUpdate,
  TxStatus,
} from '@openzeppelin/ui-types';

import type { DialogTransactionStep } from '../types/role-dialogs';
import { useRevokeRole, type RevokeRoleArgs } from './useAccessControlMutations';
import { useSelectedContract } from './useSelectedContract';
import { useTransactionExecution } from './useTransactionExecution';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for useRevokeRoleDialog hook
 */
export interface UseRevokeRoleDialogOptions {
  /** Account to revoke from */
  accountAddress: string;
  /** Role to revoke */
  roleId: string;
  /** Role name for display */
  roleName: string;
  /** Callback when dialog should close */
  onClose?: () => void;
  /** Callback on successful transaction */
  onSuccess?: (result: OperationResult) => void;
}

/**
 * Return type for useRevokeRoleDialog hook
 */
export interface UseRevokeRoleDialogReturn {
  // State
  /** Current transaction step */
  step: DialogTransactionStep;
  /** Error message if step is 'error' */
  errorMessage: string | null;
  /** Whether this is a self-revoke */
  isSelfRevoke: boolean;
  /** Transaction status */
  txStatus: TxStatus;
  /** Detailed transaction status */
  txStatusDetails: TransactionStatusUpdate | null;
  /** Whether wallet is connected (required for transaction) */
  isWalletConnected: boolean;

  // Actions
  /** Submit the revoke transaction */
  submit: () => Promise<void>;
  /** Retry after error */
  retry: () => Promise<void>;
  /** Reset dialog to form state */
  reset: () => void;

  // Derived
  /** Whether showing self-revoke warning */
  showSelfRevokeWarning: boolean;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook that manages state and logic for the Revoke Role dialog.
 *
 * Features:
 * - Detects self-revoke when connected wallet matches target account
 * - Handles transaction execution with proper state transitions
 * - Auto-closes dialog 1.5s after successful transaction
 *
 * @param options - Configuration including accountAddress, roleId, roleName, and callbacks
 * @returns Dialog state, actions, and derived values
 *
 * @example
 * ```tsx
 * const {
 *   step,
 *   isSelfRevoke,
 *   showSelfRevokeWarning,
 *   submit,
 *   retry,
 *   reset,
 * } = useRevokeRoleDialog({
 *   accountAddress: '0x...',
 *   roleId: 'MINTER_ROLE_ID',
 *   roleName: 'Minter',
 *   onClose: () => setDialogOpen(false),
 *   onSuccess: () => refetch(),
 * });
 * ```
 */
export function useRevokeRoleDialog(
  options: UseRevokeRoleDialogOptions
): UseRevokeRoleDialogReturn {
  const { accountAddress, roleId, onClose, onSuccess } = options;

  // =============================================================================
  // Context & External Data
  // =============================================================================

  const { selectedContract, adapter } = useSelectedContract();
  const contractAddress = selectedContract?.address ?? '';

  const { address: connectedAddress } = useDerivedAccountStatus();

  // Mutation hook for revoke
  const revokeRole = useRevokeRole(adapter, contractAddress);

  // =============================================================================
  // Transaction Execution (using shared hook)
  // =============================================================================

  const { step, errorMessage, execute, retry, reset } = useTransactionExecution<RevokeRoleArgs>(
    revokeRole,
    {
      onClose,
      onSuccess,
    }
  );

  // =============================================================================
  // Self-Revoke Detection (T044)
  // =============================================================================

  const isSelfRevoke = useMemo(() => {
    if (!connectedAddress || !accountAddress) {
      return false;
    }
    return connectedAddress.toLowerCase() === accountAddress.toLowerCase();
  }, [connectedAddress, accountAddress]);

  // Show warning when it's a self-revoke
  const showSelfRevokeWarning = isSelfRevoke;

  // =============================================================================
  // Submit Handler
  // =============================================================================

  const submit = useCallback(async () => {
    await execute({
      roleId,
      account: accountAddress,
      executionConfig: { method: 'eoa', allowAny: true } as ExecutionConfig,
    });
  }, [execute, roleId, accountAddress]);

  // =============================================================================
  // Transaction Status
  // =============================================================================

  const txStatus = revokeRole.status;
  const txStatusDetails = revokeRole.statusDetails;

  // =============================================================================
  // Derived State
  // =============================================================================

  const isWalletConnected = !!connectedAddress;

  // =============================================================================
  // Return
  // =============================================================================

  return {
    // State
    step,
    errorMessage,
    isSelfRevoke,
    txStatus,
    txStatusDetails,
    isWalletConnected,

    // Actions
    submit,
    retry,
    reset,

    // Derived
    showSelfRevokeWarning,
  };
}
