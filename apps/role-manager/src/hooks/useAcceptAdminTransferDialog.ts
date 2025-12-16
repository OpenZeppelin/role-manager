/**
 * useAcceptAdminTransferDialog hook
 * Feature: 016-two-step-admin-assignment
 *
 * Hook that manages the state and logic for the Accept Admin Transfer dialog.
 * Implements:
 * - Transaction execution via useAcceptAdminTransfer
 * - Dialog step transitions
 * - Error handling and retry
 *
 * Used when a pending admin needs to accept a two-step admin transfer.
 * Pattern: Mirrors useAcceptOwnershipDialog from spec 015.
 */
import { useCallback, useState } from 'react';

import { useDerivedAccountStatus } from '@openzeppelin/ui-builder-react-core';
import type { ExecutionConfig, OperationResult, TxStatus } from '@openzeppelin/ui-builder-types';

import type { DialogTransactionStep } from '../types/role-dialogs';
import { useAcceptAdminTransfer, type AcceptAdminTransferArgs } from './useAccessControlMutations';
import { useSelectedContract } from './useSelectedContract';
import { isUserRejectionError } from './useTransactionExecution';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for useAcceptAdminTransferDialog hook
 */
export interface UseAcceptAdminTransferDialogOptions {
  /** Callback when dialog should close */
  onClose: () => void;
  /** Callback on successful acceptance (can be async for data refresh) */
  onSuccess?: () => void | Promise<void>;
}

/**
 * Return type for useAcceptAdminTransferDialog hook
 */
export interface UseAcceptAdminTransferDialogReturn {
  /** Current dialog step */
  step: DialogTransactionStep;
  /** Error message if step is 'error' */
  errorMessage: string | null;
  /** Current transaction status */
  txStatus: TxStatus;
  /** Whether wallet is connected */
  isWalletConnected: boolean;
  /** Whether the error is a network disconnection error (FR-026) */
  isNetworkError: boolean;
  /** Submit the acceptance */
  submit: () => Promise<void>;
  /** Retry after error */
  retry: () => Promise<void>;
  /** Reset to initial state */
  reset: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook that manages state and logic for the Accept Admin Transfer dialog.
 *
 * Features:
 * - Handles transaction execution with proper state transitions
 * - Auto-closes dialog 1.5s after successful transaction
 * - Supports retry after errors
 *
 * @param options - Configuration including callbacks
 * @returns Dialog state, actions, and derived values
 *
 * @example
 * ```tsx
 * const {
 *   step,
 *   submit,
 *   retry,
 *   reset,
 * } = useAcceptAdminTransferDialog({
 *   onClose: () => setDialogOpen(false),
 *   onSuccess: () => refetch(),
 * });
 * ```
 */
export function useAcceptAdminTransferDialog(
  options: UseAcceptAdminTransferDialogOptions
): UseAcceptAdminTransferDialogReturn {
  const { onClose, onSuccess } = options;

  // =============================================================================
  // Context & External Data
  // =============================================================================

  const { selectedContract, adapter } = useSelectedContract();
  const contractAddress = selectedContract?.address ?? '';

  const { address: connectedAddress } = useDerivedAccountStatus();

  // Mutation hook for accept admin transfer
  const acceptAdminTransfer = useAcceptAdminTransfer(adapter, contractAddress);

  // =============================================================================
  // Internal State
  // =============================================================================

  const [step, setStep] = useState<DialogTransactionStep>('form');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // =============================================================================
  // Custom onSuccess wrapper to call user's onSuccess
  // =============================================================================

  const handleSuccess = useCallback(
    async (_result: OperationResult) => {
      setStep('success');
      // Await onSuccess to ensure data is refetched before auto-close
      // Silently catch errors - transaction already succeeded, don't block dialog close
      try {
        await onSuccess?.();
      } catch {
        // Error in callback shouldn't block dialog close since transaction succeeded
      }

      // Auto-close after delay
      setTimeout(() => {
        onClose();
      }, 1500);
    },
    [onSuccess, onClose]
  );

  // =============================================================================
  // Transaction Execution Helper
  // =============================================================================

  const executeTransaction = useCallback(
    async (args: AcceptAdminTransferArgs) => {
      setStep('pending');
      setErrorMessage(null);

      try {
        const result = await acceptAdminTransfer.mutateAsync(args);
        handleSuccess(result);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        if (isUserRejectionError(err)) {
          setStep('cancelled');
        } else {
          setStep('error');
          setErrorMessage(err.message);
        }
      }
    },
    [acceptAdminTransfer, handleSuccess]
  );

  // =============================================================================
  // Submit Handler
  // =============================================================================

  const submit = useCallback(async () => {
    // Execute the transaction with EOA execution
    await executeTransaction({
      executionConfig: { method: 'eoa' } as ExecutionConfig,
    });
  }, [executeTransaction]);

  // =============================================================================
  // Retry
  // =============================================================================

  const retry = useCallback(async () => {
    // Re-execute the transaction
    await executeTransaction({
      executionConfig: { method: 'eoa' } as ExecutionConfig,
    });
  }, [executeTransaction]);

  // =============================================================================
  // Reset Function
  // =============================================================================

  const reset = useCallback(() => {
    setStep('form');
    setErrorMessage(null);
    acceptAdminTransfer.reset();
  }, [acceptAdminTransfer]);

  // =============================================================================
  // Transaction Status
  // =============================================================================

  const txStatus = acceptAdminTransfer.status;

  // =============================================================================
  // Derived State
  // =============================================================================

  const isWalletConnected = !!connectedAddress;

  // Network error detection (FR-026)
  // Uses the isNetworkError flag from the underlying mutation hook
  const isNetworkError = acceptAdminTransfer.isNetworkError;

  // =============================================================================
  // Return
  // =============================================================================

  return {
    // State
    step,
    errorMessage,
    txStatus,
    isWalletConnected,
    isNetworkError,

    // Actions
    submit,
    retry,
    reset,
  };
}
