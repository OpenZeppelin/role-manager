/**
 * useTransactionExecution hook
 * Feature: 014-role-grant-revoke
 *
 * Reusable hook for managing transaction execution state and lifecycle.
 * Provides:
 * - Step state management (form → pending → success/error/cancelled)
 * - User rejection detection
 * - Auto-close on success with configurable delay
 * - Retry capability
 * - Error message tracking
 *
 * Used by: useManageRolesDialog, useAssignRoleDialog, useRevokeRoleDialog
 */
import { useCallback, useRef, useState } from 'react';

import type {
  OperationResult,
  TransactionStatusUpdate,
  TxStatus,
} from '@openzeppelin/ui-builder-types';

import type { DialogTransactionStep } from '../types/role-dialogs';

// =============================================================================
// Constants
// =============================================================================

/** Delay in milliseconds before auto-closing dialog after success */
export const SUCCESS_AUTO_CLOSE_DELAY = 1500;

// =============================================================================
// Types
// =============================================================================

/**
 * A mutation hook interface (subset of what useGrantRole/useRevokeRole return)
 */
export interface MutationHook<TArgs> {
  mutateAsync: (args: TArgs) => Promise<OperationResult>;
  reset: () => void;
  status: TxStatus;
  statusDetails: TransactionStatusUpdate | null;
  isPending: boolean;
}

/**
 * Options for useTransactionExecution hook
 */
export interface UseTransactionExecutionOptions {
  /** Callback when dialog should close */
  onClose?: () => void;
  /** Callback on successful transaction */
  onSuccess?: (result: OperationResult) => void;
  /** Custom auto-close delay (defaults to 1500ms) */
  autoCloseDelay?: number;
}

/**
 * Return type for useTransactionExecution hook
 */
export interface UseTransactionExecutionReturn<TArgs> {
  // State
  /** Current transaction step */
  step: DialogTransactionStep;
  /** Error message if step is 'error' */
  errorMessage: string | null;

  // Actions
  /** Execute a transaction with the given args */
  execute: (args: TArgs) => Promise<void>;
  /** Retry the last transaction */
  retry: () => Promise<void>;
  /** Reset to form state */
  reset: () => void;

  // Helpers
  /** Whether currently in a transaction state (pending/confirming) */
  isTransacting: boolean;
  /** Whether the form can be submitted */
  canSubmit: boolean;
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Detect if an error is a user rejection (wallet cancel)
 */
export function isUserRejectionError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes('rejected') ||
    message.includes('cancelled') ||
    message.includes('denied') ||
    message.includes('user refused')
  );
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook that manages transaction execution state and lifecycle.
 *
 * Features:
 * - Tracks transaction steps (form, pending, success, error, cancelled)
 * - Auto-closes dialog after success (configurable delay)
 * - Detects user rejections vs network errors
 * - Supports retry after error
 *
 * @param mutation - The mutation hook to use for transaction execution
 * @param options - Configuration including callbacks
 * @returns Transaction state and actions
 *
 * @example
 * ```tsx
 * const grantRole = useGrantRole(adapter, contractAddress);
 * const {
 *   step,
 *   errorMessage,
 *   execute,
 *   retry,
 *   reset,
 * } = useTransactionExecution(grantRole, {
 *   onClose: () => setDialogOpen(false),
 *   onSuccess: () => refetch(),
 * });
 *
 * // Later, execute the transaction
 * await execute({ roleId, account, executionConfig });
 * ```
 */
export function useTransactionExecution<TArgs>(
  mutation: MutationHook<TArgs>,
  options: UseTransactionExecutionOptions = {}
): UseTransactionExecutionReturn<TArgs> {
  const { onClose, onSuccess, autoCloseDelay = SUCCESS_AUTO_CLOSE_DELAY } = options;

  // =============================================================================
  // Internal State
  // =============================================================================

  const [step, setStep] = useState<DialogTransactionStep>('form');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Store the last args for retry
  const lastArgsRef = useRef<TArgs | null>(null);

  // =============================================================================
  // Execute Transaction
  // =============================================================================

  const executeTransaction = useCallback(
    async (args: TArgs) => {
      // Store for retry
      lastArgsRef.current = args;

      setStep('pending');
      setErrorMessage(null);

      try {
        const result = await mutation.mutateAsync(args);

        setStep('success');
        onSuccess?.(result);

        // Auto-close after delay
        setTimeout(() => {
          onClose?.();
        }, autoCloseDelay);
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
    [mutation, onSuccess, onClose, autoCloseDelay]
  );

  // =============================================================================
  // Retry
  // =============================================================================

  const retry = useCallback(async () => {
    const args = lastArgsRef.current;
    if (!args) return;

    setStep('pending');
    setErrorMessage(null);

    try {
      const result = await mutation.mutateAsync(args);

      setStep('success');
      onSuccess?.(result);

      setTimeout(() => {
        onClose?.();
      }, autoCloseDelay);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      if (isUserRejectionError(err)) {
        setStep('cancelled');
      } else {
        setStep('error');
        setErrorMessage(err.message);
      }
    }
  }, [mutation, onSuccess, onClose, autoCloseDelay]);

  // =============================================================================
  // Reset
  // =============================================================================

  const reset = useCallback(() => {
    setStep('form');
    setErrorMessage(null);
    lastArgsRef.current = null;
    mutation.reset();
  }, [mutation]);

  // =============================================================================
  // Derived State
  // =============================================================================

  const isTransacting = step === 'pending' || step === 'confirming';
  const canSubmit = step === 'form' && !mutation.isPending;

  // =============================================================================
  // Return
  // =============================================================================

  return {
    // State
    step,
    errorMessage,

    // Actions
    execute: executeTransaction,
    retry,
    reset,

    // Helpers
    isTransacting,
    canSubmit,
  };
}

// =============================================================================
// Multi-Mutation Support
// =============================================================================

/**
 * Options for useMultiMutationExecution hook
 */
export interface UseMultiMutationExecutionOptions extends UseTransactionExecutionOptions {
  /** Reset functions for all mutations */
  resetMutations?: (() => void)[];
}

/**
 * Return type for useMultiMutationExecution hook
 */
export interface UseMultiMutationExecutionReturn {
  // State
  /** Current transaction step */
  step: DialogTransactionStep;
  /** Error message if step is 'error' */
  errorMessage: string | null;

  // Actions
  /** Execute a transaction with the given function */
  execute: (fn: () => Promise<OperationResult>) => Promise<void>;
  /** Retry the last transaction */
  retry: () => Promise<void>;
  /** Reset to form state */
  reset: () => void;

  // Helpers
  /** Whether currently in a transaction state (pending/confirming) */
  isTransacting: boolean;
}

/**
 * Hook for managing transaction execution with multiple possible mutations.
 * Use this when you need to choose between different mutations (e.g., grant vs revoke).
 *
 * @param options - Configuration including callbacks and reset functions
 * @returns Transaction state and actions
 *
 * @example
 * ```tsx
 * const grantRole = useGrantRole(adapter, contractAddress);
 * const revokeRole = useRevokeRole(adapter, contractAddress);
 *
 * const {
 *   step,
 *   execute,
 *   retry,
 *   reset,
 * } = useMultiMutationExecution({
 *   onClose: () => setDialogOpen(false),
 *   onSuccess: () => refetch(),
 *   resetMutations: [grantRole.reset, revokeRole.reset],
 * });
 *
 * // Execute the appropriate mutation
 * await execute(() =>
 *   pendingChange.type === 'grant'
 *     ? grantRole.mutateAsync(args)
 *     : revokeRole.mutateAsync(args)
 * );
 * ```
 */
export function useMultiMutationExecution(
  options: UseMultiMutationExecutionOptions = {}
): UseMultiMutationExecutionReturn {
  const {
    onClose,
    onSuccess,
    autoCloseDelay = SUCCESS_AUTO_CLOSE_DELAY,
    resetMutations = [],
  } = options;

  // =============================================================================
  // Internal State
  // =============================================================================

  const [step, setStep] = useState<DialogTransactionStep>('form');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Store the last execution function for retry
  const lastExecutionRef = useRef<(() => Promise<OperationResult>) | null>(null);

  // =============================================================================
  // Reset (defined first as execute and retry depend on it)
  // =============================================================================

  const reset = useCallback(() => {
    setStep('form');
    setErrorMessage(null);
    lastExecutionRef.current = null;
    resetMutations.forEach((resetFn) => resetFn());
  }, [resetMutations]);

  // =============================================================================
  // Execute Transaction
  // =============================================================================

  const execute = useCallback(
    async (fn: () => Promise<OperationResult>) => {
      // Store for retry
      lastExecutionRef.current = fn;

      setStep('pending');
      setErrorMessage(null);

      try {
        const result = await fn();

        setStep('success');
        onSuccess?.(result);

        // Auto-close after delay, resetting state before closing
        setTimeout(() => {
          reset();
          onClose?.();
        }, autoCloseDelay);
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
    [onSuccess, onClose, autoCloseDelay, reset]
  );

  // =============================================================================
  // Retry
  // =============================================================================

  const retry = useCallback(async () => {
    const fn = lastExecutionRef.current;
    if (!fn) return;

    setStep('pending');
    setErrorMessage(null);

    try {
      const result = await fn();

      setStep('success');
      onSuccess?.(result);

      // Auto-close after delay, resetting state before closing
      setTimeout(() => {
        reset();
        onClose?.();
      }, autoCloseDelay);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      if (isUserRejectionError(err)) {
        setStep('cancelled');
      } else {
        setStep('error');
        setErrorMessage(err.message);
      }
    }
  }, [onSuccess, onClose, autoCloseDelay, reset]);

  // =============================================================================
  // Derived State
  // =============================================================================

  const isTransacting = step === 'pending' || step === 'confirming';

  // =============================================================================
  // Return
  // =============================================================================

  return {
    // State
    step,
    errorMessage,

    // Actions
    execute,
    retry,
    reset,

    // Helpers
    isTransacting,
  };
}
