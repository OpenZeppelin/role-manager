/**
 * useOwnershipTransferDialog hook
 * Feature: 015-ownership-transfer
 * Updated by: 017-evm-access-control (Phase 6 — US5, T035)
 *
 * Hook that manages the state and logic for the Transfer Ownership dialog.
 * Implements:
 * - Form validation (address, self-transfer, expiration)
 * - Transaction execution via useTransferOwnership
 * - Dialog step transitions
 * - Adapter-driven expiration handling (required / none / contract-managed)
 *
 * Uses useTransactionExecution for common transaction logic.
 */
import { useCallback, useRef, useState } from 'react';

import { useDerivedAccountStatus } from '@openzeppelin/ui-react';
import type {
  ExecutionConfig,
  ExpirationMetadata,
  OperationResult,
  TxStatus,
} from '@openzeppelin/ui-types';

import type { DialogTransactionStep } from '../types/role-dialogs';
import { requiresExpirationInput } from '../utils/expiration';
import { useTransferOwnership, type TransferOwnershipArgs } from './useAccessControlMutations';
import { useCurrentBlock } from './useCurrentBlock';
import { useExpirationMetadata } from './useExpirationMetadata';
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
  /** The expiration value as string (form input) — ledger number, block number, etc. */
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
  /** Callback on successful transfer (can be async for data refresh) */
  onSuccess?: () => void | Promise<void>;
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
  /** Whether expiration input is required (adapter says mode: 'required') */
  requiresExpiration: boolean;
  /** Current block for validation (null if expiration not required) */
  currentBlock: number | null;
  /** Whether the error is a network disconnection error (FR-026) */
  isNetworkError: boolean;
  /** Adapter-driven expiration metadata for UI rendering decisions */
  expirationMetadata: ExpirationMetadata | undefined;
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
 * Validate expiration value (must be strictly greater than current)
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
 * - Validates expiration (must be in the future, only when mode is 'required')
 * - Handles transaction execution with proper state transitions
 * - Auto-closes dialog 1.5s after successful transaction
 * - Polls current block only when expiration input is required
 * - Adapter-driven expiration: 'required' | 'none' | 'contract-managed'
 *
 * @param options - Configuration including currentOwner, hasTwoStepOwnable, and callbacks
 * @returns Dialog state, actions, and derived values
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

  // Adapter-driven expiration metadata (T035)
  const { metadata: expirationMetadata } = useExpirationMetadata(
    adapter,
    contractAddress,
    'ownership',
    { enabled: hasTwoStepOwnable }
  );

  // Derive whether expiration input is required from adapter metadata.
  const needsExpirationInput = requiresExpirationInput(expirationMetadata);

  // Current block polling — only when expiration input is needed for validation
  const { currentBlock } = useCurrentBlock(adapter, {
    enabled: needsExpirationInput,
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
        setStep('error');
        setErrorMessage(selfTransferError);
        return;
      }

      // Parse expiration (0 when not required — EVM Ownable2Step or single-step)
      const expirationBlock = needsExpirationInput ? parseInt(data.expirationBlock, 10) || 0 : 0;

      // Validate expiration only when the adapter requires user input
      if (needsExpirationInput) {
        // Check if expiration is provided (form-level validation)
        if (!data.expirationBlock || !data.expirationBlock.trim()) {
          setStep('error');
          setErrorMessage('Expiration is required for this transfer');
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
        executionConfig: { method: 'eoa', allowAny: true } as ExecutionConfig,
      });
    },
    [currentOwner, needsExpirationInput, currentBlock, executeTransaction]
  );

  // =============================================================================
  // Retry with Stored Form Data
  // Re-validate expiration against current block before retry (same as FR-028b in useAdminTransferDialog)
  // =============================================================================

  const retry = useCallback(async () => {
    const formData = lastFormDataRef.current;
    if (!formData) return;

    // Parse expiration
    const expirationBlock = needsExpirationInput ? parseInt(formData.expirationBlock, 10) || 0 : 0;

    // Re-validate expiration against current block before retry when expiration input is required.
    // Time may have passed since initial submit; stored value could now be in the past.
    if (needsExpirationInput) {
      if (currentBlock === null) {
        setStep('error');
        setErrorMessage(
          'Unable to validate expiration: current block not available. Please try again.'
        );
        return;
      }

      const expirationError = validateExpiration(expirationBlock, currentBlock);
      if (expirationError) {
        setStep('error');
        setErrorMessage(expirationError);
        return;
      }
    }

    // Re-execute the transaction
    await executeTransaction({
      newOwner: formData.newOwnerAddress,
      expirationBlock,
      executionConfig: { method: 'eoa', allowAny: true } as ExecutionConfig,
    });
  }, [needsExpirationInput, currentBlock, executeTransaction]);

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
    requiresExpiration: needsExpirationInput,
    currentBlock: needsExpirationInput ? currentBlock : null,
    isNetworkError,
    expirationMetadata,

    // Actions
    submit,
    retry,
    reset,
  };
}
