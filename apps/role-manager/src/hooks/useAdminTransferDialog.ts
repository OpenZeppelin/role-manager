/**
 * useAdminTransferDialog hook
 * Feature: 016-two-step-admin-assignment
 * Updated by: 017-evm-access-control (Phase 6 — US5, T037)
 *
 * Hook that manages the state and logic for the Transfer Admin dialog.
 * Implements:
 * - Form validation (address, self-transfer, expiration)
 * - Transaction execution via useTransferAdminRole
 * - Dialog step transitions
 * - Adapter-driven expiration handling (required / none / contract-managed)
 *
 * Follows the useOwnershipTransferDialog pattern from spec 015.
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
import { useTransferAdminRole, type TransferAdminRoleArgs } from './useAccessControlMutations';
import { useCurrentBlock } from './useCurrentBlock';
import { useExpirationMetadata } from './useExpirationMetadata';
import { useSelectedContract } from './useSelectedContract';
import { isUserRejectionError } from './useTransactionExecution';

// =============================================================================
// Types
// =============================================================================

/**
 * Form data for transfer admin dialog
 */
export interface TransferAdminFormData {
  /** The new admin's address */
  newAdminAddress: string;
  /** The expiration value as string (form input) — ledger number, block number, etc. */
  expirationBlock: string;
}

/**
 * Options for useAdminTransferDialog hook
 */
export interface UseAdminTransferDialogOptions {
  /** Current admin address (for self-transfer validation) */
  currentAdmin: string;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Callback on successful transfer (can be async for data refresh) */
  onSuccess?: () => void | Promise<void>;
}

/**
 * Return type for useAdminTransferDialog hook
 */
export interface UseAdminTransferDialogReturn {
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
  /** Current block for validation */
  currentBlock: number | null;
  /** Whether the error is a network disconnection error */
  isNetworkError: boolean;
  /** Adapter-driven expiration metadata for UI rendering decisions */
  expirationMetadata: ExpirationMetadata | undefined;
  /** Submit the transfer */
  submit: (data: TransferAdminFormData) => Promise<void>;
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
function validateSelfTransfer(newAdmin: string, currentAdmin: string): string | null {
  if (newAdmin.toLowerCase() === currentAdmin.toLowerCase()) {
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
 * Hook that manages state and logic for the Transfer Admin dialog.
 *
 * Features:
 * - Validates address (self-transfer prevention)
 * - Validates expiration (must be in the future, only when mode is 'required')
 * - Handles transaction execution with proper state transitions
 * - Auto-closes dialog 1.5s after successful transaction
 * - Polls current block only when expiration input is required
 * - Adapter-driven expiration: 'required' | 'none' | 'contract-managed'
 *
 * @param options - Configuration including currentAdmin and callbacks
 * @returns Dialog state, actions, and derived values
 */
export function useAdminTransferDialog(
  options: UseAdminTransferDialogOptions
): UseAdminTransferDialogReturn {
  const { currentAdmin, onClose, onSuccess } = options;

  // =============================================================================
  // Context & External Data
  // =============================================================================

  const { selectedContract, adapter } = useSelectedContract();
  const contractAddress = selectedContract?.address ?? '';

  const { address: connectedAddress } = useDerivedAccountStatus();

  // Mutation hook for admin transfer
  const transferAdminRole = useTransferAdminRole(adapter, contractAddress);

  // Adapter-driven expiration metadata (T037)
  const { metadata: expirationMetadata } = useExpirationMetadata(adapter, contractAddress, 'admin');

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

  const lastFormDataRef = useRef<TransferAdminFormData | null>(null);

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
    async (args: TransferAdminRoleArgs) => {
      setStep('pending');
      setErrorMessage(null);

      try {
        const result = await transferAdminRole.mutateAsync(args);
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
    [transferAdminRole, handleSuccess]
  );

  // =============================================================================
  // Submit Handler with Validation
  // =============================================================================

  const submit = useCallback(
    async (data: TransferAdminFormData) => {
      // Store for retry
      lastFormDataRef.current = data;

      // Validate self-transfer
      const selfTransferError = validateSelfTransfer(data.newAdminAddress, currentAdmin);
      if (selfTransferError) {
        setStep('error');
        setErrorMessage(selfTransferError);
        return;
      }

      // Parse expiration (0 when not required — e.g., EVM contract-managed)
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
        newAdmin: data.newAdminAddress,
        expirationBlock,
        executionConfig: { method: 'eoa', allowAny: true } as ExecutionConfig,
      });
    },
    [currentAdmin, needsExpirationInput, currentBlock, executeTransaction]
  );

  // =============================================================================
  // Retry with Stored Form Data
  // FR-028a: Retry uses same form parameters (stored in lastFormDataRef)
  // FR-028b: Re-validate expiration against current block before submission
  // =============================================================================

  const retry = useCallback(async () => {
    const formData = lastFormDataRef.current;
    if (!formData) return;

    // Parse expiration
    const expirationBlock = needsExpirationInput ? parseInt(formData.expirationBlock, 10) || 0 : 0;

    // FR-028b: Re-validate expiration against current block before retry
    // Only when expiration input is required
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
      newAdmin: formData.newAdminAddress,
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
    transferAdminRole.reset();
  }, [transferAdminRole]);

  // =============================================================================
  // Transaction Status
  // =============================================================================

  const txStatus = transferAdminRole.status;

  // =============================================================================
  // Derived State
  // =============================================================================

  const isWalletConnected = !!connectedAddress;

  // Network error detection
  const isNetworkError = transferAdminRole.isNetworkError;

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
