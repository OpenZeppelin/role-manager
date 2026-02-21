/**
 * useRenounceDialog hook
 * Feature: 017-evm-access-control (T051)
 *
 * Hook that manages the state and logic for renounce confirmation dialogs.
 * Used for both "Renounce Ownership" and "Renounce Role" operations.
 *
 * Implements:
 * - Dialog open/close state management
 * - Transaction execution via useRenounceOwnership or useRenounceRole
 * - Success auto-close with 1.5s timeout
 * - Contextual configuration for ownership vs. role renounce
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
import {
  useRenounceOwnership,
  useRenounceRole,
  type RenounceOwnershipArgs,
  type RenounceRoleArgs,
} from './useAccessControlMutations';
import { useSelectedContract } from './useSelectedContract';
import { useTransactionExecution } from './useTransactionExecution';

// =============================================================================
// Types
// =============================================================================

/** Renounce operation type */
export type RenounceType = 'ownership' | 'role';

/**
 * Options for useRenounceDialog hook
 */
export interface UseRenounceDialogOptions {
  /** Type of renounce operation */
  type: RenounceType;
  /** Role ID (required for role renounce) */
  roleId?: string;
  /** Role name for display (required for role renounce) */
  roleName?: string;
  /** Callback when dialog should close */
  onClose?: () => void;
  /** Callback on successful transaction */
  onSuccess?: (result: OperationResult) => void;
}

/**
 * Return type for useRenounceDialog hook
 */
export interface UseRenounceDialogReturn {
  // State
  /** Current transaction step */
  step: DialogTransactionStep;
  /** Error message if step is 'error' */
  errorMessage: string | null;
  /** Transaction status */
  txStatus: TxStatus;
  /** Detailed transaction status */
  txStatusDetails: TransactionStatusUpdate | null;
  /** Whether wallet is connected */
  isWalletConnected: boolean;
  /** Whether the mutation is pending */
  isPending: boolean;

  // Actions
  /** Submit the renounce transaction */
  submit: () => Promise<void>;
  /** Retry after error */
  retry: () => Promise<void>;
  /** Reset dialog to form state */
  reset: () => void;

  // Configuration
  /** Dialog title */
  title: string;
  /** Warning text for the dialog */
  warningText: string;
  /** Confirmation keyword */
  confirmKeyword: string;
  /** Submit button label */
  submitLabel: string;
  /** Success message */
  successMessage: string;
}

// =============================================================================
// Constants
// =============================================================================

const CONFIRM_KEYWORD = 'RENOUNCE';

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook that manages state and logic for renounce confirmation dialogs.
 *
 * Supports two modes:
 * - **Ownership renounce**: Calls `service.renounceOwnership()`, sets owner to null
 * - **Role renounce**: Calls `service.renounceRole()` for connected wallet address
 *
 * @param options - Configuration including type, roleId/roleName, and callbacks
 * @returns Dialog state, actions, and configuration
 */
export function useRenounceDialog(options: UseRenounceDialogOptions): UseRenounceDialogReturn {
  const { type, roleId, roleName, onClose, onSuccess } = options;

  // =============================================================================
  // Context & External Data
  // =============================================================================

  const { selectedContract, adapter } = useSelectedContract();
  const contractAddress = selectedContract?.address ?? '';

  const { address: connectedAddress } = useDerivedAccountStatus();

  // Mutation hooks
  const renounceOwnership = useRenounceOwnership(adapter, contractAddress);
  const renounceRole = useRenounceRole(adapter, contractAddress);

  // Select the appropriate mutation based on type
  const mutation = type === 'ownership' ? renounceOwnership : renounceRole;

  // =============================================================================
  // Transaction Execution
  // =============================================================================

  const ownershipExecution = useTransactionExecution<RenounceOwnershipArgs>(renounceOwnership, {
    onClose,
    onSuccess,
  });

  const roleExecution = useTransactionExecution<RenounceRoleArgs>(renounceRole, {
    onClose,
    onSuccess,
  });

  // Select execution context based on type
  const step = type === 'ownership' ? ownershipExecution.step : roleExecution.step;
  const errorMessage =
    type === 'ownership' ? ownershipExecution.errorMessage : roleExecution.errorMessage;
  const retry = type === 'ownership' ? ownershipExecution.retry : roleExecution.retry;
  const reset = type === 'ownership' ? ownershipExecution.reset : roleExecution.reset;

  // =============================================================================
  // Submit Handler
  // =============================================================================

  const submit = useCallback(async () => {
    const executionConfig = { method: 'eoa', allowAny: true } as ExecutionConfig;

    if (type === 'ownership') {
      await ownershipExecution.execute({
        executionConfig,
      });
    } else {
      if (!roleId || !connectedAddress) {
        return;
      }
      await roleExecution.execute({
        roleId,
        account: connectedAddress,
        executionConfig,
      });
    }
  }, [type, ownershipExecution, roleExecution, roleId, connectedAddress]);

  // =============================================================================
  // Configuration
  // =============================================================================

  const config = useMemo(() => {
    if (type === 'ownership') {
      return {
        title: 'Renounce Ownership',
        warningText:
          'This action is irreversible. Once ownership is renounced, the contract will have no owner and owner-only functions will be permanently inaccessible.',
        confirmKeyword: CONFIRM_KEYWORD,
        submitLabel: 'Renounce Ownership',
        successMessage: 'Ownership has been renounced successfully.',
      };
    }
    return {
      title: `Renounce Role: ${roleName ?? roleId ?? 'Unknown'}`,
      warningText: `This will remove your account from the "${roleName ?? roleId ?? 'Unknown'}" role. You will lose all permissions associated with this role. This action cannot be undone by yourself.`,
      confirmKeyword: CONFIRM_KEYWORD,
      submitLabel: 'Renounce Role',
      successMessage: `You have renounced the "${roleName ?? roleId ?? 'Unknown'}" role.`,
    };
  }, [type, roleName, roleId]);

  // =============================================================================
  // Derived State
  // =============================================================================

  const isWalletConnected = !!connectedAddress;

  return {
    // State
    step,
    errorMessage,
    txStatus: mutation.status,
    txStatusDetails: mutation.statusDetails,
    isWalletConnected,
    isPending: mutation.isPending,

    // Actions
    submit,
    retry,
    reset,

    // Configuration
    ...config,
  };
}
