/**
 * useAcceptOwnershipDialog hook
 * Feature: 015-ownership-transfer
 *
 * Hook that manages the state and logic for the Accept Ownership dialog.
 * Implements:
 * - Transaction execution via useAcceptOwnership
 * - Dialog step transitions
 * - Error handling and retry
 *
 * Used when a pending owner needs to accept a two-step ownership transfer.
 */
import { useCallback, useState } from 'react';

import { useDerivedAccountStatus } from '@openzeppelin/ui-react';
import type { ExecutionConfig, OperationResult, TxStatus } from '@openzeppelin/ui-types';

import type { DialogTransactionStep } from '../types/role-dialogs';
import { useAcceptOwnership, type AcceptOwnershipArgs } from './useAccessControlMutations';
import { useSelectedContract } from './useSelectedContract';
import { isUserRejectionError } from './useTransactionExecution';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for useAcceptOwnershipDialog hook
 */
export interface UseAcceptOwnershipDialogOptions {
  /** Callback when dialog should close */
  onClose: () => void;
  /** Callback on successful acceptance (can be async for data refresh) */
  onSuccess?: () => void | Promise<void>;
}

/**
 * Return type for useAcceptOwnershipDialog hook
 */
export interface UseAcceptOwnershipDialogReturn {
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
 * Hook that manages state and logic for the Accept Ownership dialog.
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
 * } = useAcceptOwnershipDialog({
 *   onClose: () => setDialogOpen(false),
 *   onSuccess: () => refetch(),
 * });
 * ```
 */
export function useAcceptOwnershipDialog(
  options: UseAcceptOwnershipDialogOptions
): UseAcceptOwnershipDialogReturn {
  const { onClose, onSuccess } = options;

  // =============================================================================
  // Context & External Data
  // =============================================================================

  const { selectedContract, adapter } = useSelectedContract();
  const contractAddress = selectedContract?.address ?? '';

  const { address: connectedAddress } = useDerivedAccountStatus();

  // Mutation hook for accept ownership
  const acceptOwnership = useAcceptOwnership(adapter, contractAddress);

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
    async (args: AcceptOwnershipArgs) => {
      setStep('pending');
      setErrorMessage(null);

      try {
        const result = await acceptOwnership.mutateAsync(args);
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
    [acceptOwnership, handleSuccess]
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
    acceptOwnership.reset();
  }, [acceptOwnership]);

  // =============================================================================
  // Transaction Status
  // =============================================================================

  const txStatus = acceptOwnership.status;

  // =============================================================================
  // Derived State
  // =============================================================================

  const isWalletConnected = !!connectedAddress;

  // Network error detection (FR-026)
  // Uses the isNetworkError flag from the underlying mutation hook
  const isNetworkError = acceptOwnership.isNetworkError;

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
