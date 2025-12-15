/**
 * useOwnershipTransferDialog hook
 * Feature: 015-ownership-transfer
 *
 * Hook that manages the state and logic for the Transfer Ownership dialog.
 * Implements:
 * - Form validation (address, self-transfer, expiration)
 * - Transaction execution via useTransferOwnership
 * - Dialog step transitions
 * - Current ledger polling (for two-step)
 *
 * Uses useTransactionExecution for common transaction logic.
 */
import { useCallback, useRef, useState } from 'react';

import { useDerivedAccountStatus } from '@openzeppelin/ui-builder-react-core';
import type { ExecutionConfig, OperationResult, TxStatus } from '@openzeppelin/ui-builder-types';

import type { DialogTransactionStep } from '../types/role-dialogs';
import { useTransferOwnership, type TransferOwnershipArgs } from './useAccessControlMutations';
import { useCurrentBlock } from './useCurrentBlock';
import { useSelectedContract } from './useSelectedContract';
import { isUserRejectionError } from './useTransactionExecution';

// =============================================================================
// Types
// =============================================================================

/**
 * Form data for transfer ownership dialog
 */
export interface TransferOwnershipFormData {
  /** The new owner's address */
  newOwnerAddress: string;
  /** The block number at which the transfer expires (string for form input) */
  expirationBlock: string;
}

/**
 * Options for useOwnershipTransferDialog hook
 */
export interface UseOwnershipTransferDialogOptions {
  /** Current owner address (for self-transfer validation) */
  currentOwner: string;
  /** Whether contract supports two-step transfer */
  hasTwoStepOwnable: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Callback on successful transfer */
  onSuccess?: () => void;
}

/**
 * Return type for useOwnershipTransferDialog hook
 */
export interface UseOwnershipTransferDialogReturn {
  /** Current dialog step */
  step: DialogTransactionStep;
  /** Error message if step is 'error' */
  errorMessage: string | null;
  /** Current transaction status */
  txStatus: TxStatus;
  /** Whether wallet is connected */
  isWalletConnected: boolean;
  /** Whether expiration input is required (two-step) */
  requiresExpiration: boolean;
  /** Current block for validation (null if not two-step) */
  currentBlock: number | null;
  /** Whether the error is a network disconnection error (FR-026) */
  isNetworkError: boolean;
  /** Submit the transfer */
  submit: (data: TransferOwnershipFormData) => Promise<void>;
  /** Retry after error */
  retry: () => Promise<void>;
  /** Reset to initial state */
  reset: () => void;
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate self-transfer (cannot transfer to yourself)
 */
function validateSelfTransfer(newOwner: string, currentOwner: string): string | null {
  if (newOwner.toLowerCase() === currentOwner.toLowerCase()) {
    return 'Cannot transfer to yourself';
  }
  return null;
}

/**
 * Validate expiration block (must be strictly greater than current)
 * Note: currentBlock is guaranteed non-null when this is called (caller validates first)
 */
function validateExpiration(expirationBlock: number, currentBlock: number): string | null {
  if (expirationBlock <= currentBlock) {
    return `Expiration must be greater than current block (${currentBlock})`;
  }
  return null;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook that manages state and logic for the Transfer Ownership dialog.
 *
 * Features:
 * - Validates address (self-transfer prevention)
 * - Validates expiration (must be in the future for two-step)
 * - Handles transaction execution with proper state transitions
 * - Auto-closes dialog 1.5s after successful transaction
 * - Polls current ledger for two-step transfers
 *
 * @param options - Configuration including currentOwner, hasTwoStepOwnable, and callbacks
 * @returns Dialog state, actions, and derived values
 *
 * @example
 * ```tsx
 * const {
 *   step,
 *   currentBlock,
 *   submit,
 *   retry,
 *   reset,
 * } = useOwnershipTransferDialog({
 *   currentOwner: ownership.owner,
 *   hasTwoStepOwnable: capabilities.hasTwoStepOwnable,
 *   onClose: () => setDialogOpen(false),
 *   onSuccess: () => refetch(),
 * });
 * ```
 */
export function useOwnershipTransferDialog(
  options: UseOwnershipTransferDialogOptions
): UseOwnershipTransferDialogReturn {
  const { currentOwner, hasTwoStepOwnable, onClose, onSuccess } = options;

  // =============================================================================
  // Context & External Data
  // =============================================================================

  const { selectedContract, adapter } = useSelectedContract();
  const contractAddress = selectedContract?.address ?? '';

  const { address: connectedAddress } = useDerivedAccountStatus();

  // Mutation hook for transfer
  const transferOwnership = useTransferOwnership(adapter, contractAddress);

  // Current block polling (only for two-step)
  const { currentBlock } = useCurrentBlock(adapter, {
    enabled: hasTwoStepOwnable,
    pollInterval: 5000,
  });

  // =============================================================================
  // Store Form Data for Retry
  // =============================================================================

  const lastFormDataRef = useRef<TransferOwnershipFormData | null>(null);

  // =============================================================================
  // Internal State for Validation Errors
  // =============================================================================

  const [step, setStep] = useState<DialogTransactionStep>('form');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // =============================================================================
  // Custom onSuccess wrapper to call user's onSuccess
  // =============================================================================

  const handleSuccess = useCallback(
    (_result: OperationResult) => {
      setStep('success');
      onSuccess?.();

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
    async (args: TransferOwnershipArgs) => {
      setStep('pending');
      setErrorMessage(null);

      try {
        const result = await transferOwnership.mutateAsync(args);
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
    [transferOwnership, handleSuccess]
  );

  // =============================================================================
  // Submit Handler with Validation
  // =============================================================================

  const submit = useCallback(
    async (data: TransferOwnershipFormData) => {
      // Store for retry
      lastFormDataRef.current = data;

      // Validate self-transfer
      const selfTransferError = validateSelfTransfer(data.newOwnerAddress, currentOwner);
      if (selfTransferError) {
        // Set error state for validation errors (don't throw)
        setStep('error');
        setErrorMessage(selfTransferError);
        return;
      }

      // Parse expiration (0 for single-step)
      const expirationBlock = hasTwoStepOwnable ? parseInt(data.expirationBlock, 10) || 0 : 0;

      // Validate expiration for two-step transfers
      if (hasTwoStepOwnable) {
        // Check if expiration is provided (form-level validation)
        if (!data.expirationBlock || !data.expirationBlock.trim()) {
          setStep('error');
          setErrorMessage('Expiration block is required for two-step transfers');
          return;
        }

        // Ensure current block is available for validation
        if (currentBlock === null) {
          setStep('error');
          setErrorMessage(
            'Unable to validate expiration: current block not available. Please try again.'
          );
          return;
        }

        // Validate expiration is in the future (business logic validation)
        const expirationError = validateExpiration(expirationBlock, currentBlock);
        if (expirationError) {
          setStep('error');
          setErrorMessage(expirationError);
          return;
        }
      }

      // Execute the transaction
      await executeTransaction({
        newOwner: data.newOwnerAddress,
        expirationBlock,
        executionConfig: { method: 'eoa' } as ExecutionConfig,
      });
    },
    [currentOwner, hasTwoStepOwnable, currentBlock, executeTransaction]
  );

  // =============================================================================
  // Retry with Stored Form Data
  // =============================================================================

  const retry = useCallback(async () => {
    const formData = lastFormDataRef.current;
    if (!formData) return;

    // Parse expiration (validation already passed once)
    const expirationBlock = hasTwoStepOwnable ? parseInt(formData.expirationBlock, 10) || 0 : 0;

    // Re-execute the transaction
    await executeTransaction({
      newOwner: formData.newOwnerAddress,
      expirationBlock,
      executionConfig: { method: 'eoa' } as ExecutionConfig,
    });
  }, [hasTwoStepOwnable, executeTransaction]);

  // =============================================================================
  // Reset Function
  // =============================================================================

  const reset = useCallback(() => {
    setStep('form');
    setErrorMessage(null);
    lastFormDataRef.current = null;
    transferOwnership.reset();
  }, [transferOwnership]);

  // =============================================================================
  // Transaction Status
  // =============================================================================

  const txStatus = transferOwnership.status;

  // =============================================================================
  // Derived State
  // =============================================================================

  const isWalletConnected = !!connectedAddress;

  // Network error detection (FR-026)
  // Uses the isNetworkError flag from the underlying mutation hook
  const isNetworkError = transferOwnership.isNetworkError;

  // =============================================================================
  // Return
  // =============================================================================

  return {
    // State
    step,
    errorMessage,
    txStatus,
    isWalletConnected,
    requiresExpiration: hasTwoStepOwnable,
    currentBlock: hasTwoStepOwnable ? currentBlock : null,
    isNetworkError,

    // Actions
    submit,
    retry,
    reset,
  };
}
