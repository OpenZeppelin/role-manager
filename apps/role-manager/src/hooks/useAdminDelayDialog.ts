/**
 * useAdminDelayDialog hook
 * Feature: 017-evm-access-control (T064, US7)
 *
 * Manages state and logic for admin delay change and rollback dialogs.
 * - Change flow: user enters new delay (seconds), submits via useChangeAdminDelay
 * - Rollback flow: user confirms, submits via useRollbackAdminDelay
 */
import { useCallback, useState } from 'react';

import type {
  ExecutionConfig,
  OperationResult,
  TransactionStatusUpdate,
  TxStatus,
} from '@openzeppelin/ui-types';

import type { DialogTransactionStep } from '../types/role-dialogs';
import {
  useChangeAdminDelay,
  useRollbackAdminDelay,
  type ChangeAdminDelayArgs,
  type RollbackAdminDelayArgs,
} from './useAccessControlMutations';
import { useRoleManagerAnalytics } from './useRoleManagerAnalytics';
import { useSelectedContract } from './useSelectedContract';
import { useTransactionExecution } from './useTransactionExecution';

// =============================================================================
// Types
// =============================================================================

export interface UseAdminDelayDialogOptions {
  /** Callback when dialog should close */
  onClose?: () => void;
  /** Callback on successful change or rollback */
  onSuccess?: (result: OperationResult) => void;
}

export interface UseAdminDelayDialogReturn {
  // Change delay
  /** Whether the change-delay dialog is open */
  isChangeDialogOpen: boolean;
  /** Open the change-delay dialog */
  openChangeDialog: () => void;
  /** Close the change-delay dialog */
  closeChangeDialog: () => void;
  /** New delay input value (seconds, string for controlled input) */
  newDelayInput: string;
  /** Set new delay input */
  setNewDelayInput: (value: string) => void;
  /** Submit change delay (parses newDelayInput, calls useChangeAdminDelay) */
  submitChangeDelay: () => Promise<void>;
  /** Change flow step */
  changeStep: DialogTransactionStep;
  /** Change flow error message */
  changeErrorMessage: string | null;
  /** Change flow transaction status */
  changeTxStatus: TxStatus;
  /** Change flow status details */
  changeTxStatusDetails: TransactionStatusUpdate | null;
  /** Whether change mutation is pending */
  isChangePending: boolean;
  /** Retry change after error */
  retryChange: () => Promise<void>;
  /** Reset change dialog state */
  resetChange: () => void;

  // Rollback
  /** Whether the rollback dialog is open */
  isRollbackDialogOpen: boolean;
  /** Open the rollback dialog */
  openRollbackDialog: () => void;
  /** Close the rollback dialog */
  closeRollbackDialog: () => void;
  /** Submit rollback */
  submitRollback: () => Promise<void>;
  /** Rollback flow step */
  rollbackStep: DialogTransactionStep;
  /** Rollback flow error message */
  rollbackErrorMessage: string | null;
  /** Whether rollback mutation is pending */
  isRollbackPending: boolean;
  /** Retry rollback after error */
  retryRollback: () => Promise<void>;
  /** Reset rollback dialog state */
  resetRollback: () => void;
}

const DEFAULT_DELAY_INPUT = '';

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook that manages state for admin delay change and rollback dialogs.
 *
 * @param options - Optional onClose and onSuccess callbacks
 * @returns Dialog state and actions for both change and rollback flows
 */
export function useAdminDelayDialog(
  options: UseAdminDelayDialogOptions = {}
): UseAdminDelayDialogReturn {
  const { onClose, onSuccess } = options;

  const { selectedContract, adapter } = useSelectedContract();
  const contractAddress = selectedContract?.address ?? '';
  const { trackAdminDelayChangeScheduled, trackAdminDelayChangeRolledBack } =
    useRoleManagerAnalytics();
  const ecosystem = adapter?.networkConfig?.ecosystem ?? 'unknown';

  const [isChangeDialogOpen, setIsChangeDialogOpen] = useState(false);
  const [isRollbackDialogOpen, setIsRollbackDialogOpen] = useState(false);
  const [newDelayInput, setNewDelayInput] = useState(DEFAULT_DELAY_INPUT);

  const changeMutation = useChangeAdminDelay(adapter, contractAddress);
  const rollbackMutation = useRollbackAdminDelay(adapter, contractAddress);

  const changeExecution = useTransactionExecution<ChangeAdminDelayArgs>(changeMutation, {
    onClose: () => {
      setIsChangeDialogOpen(false);
      setNewDelayInput(DEFAULT_DELAY_INPUT);
      onClose?.();
    },
    onSuccess: (result) => {
      trackAdminDelayChangeScheduled(ecosystem);
      onSuccess?.(result);
    },
  });

  const rollbackExecution = useTransactionExecution<RollbackAdminDelayArgs>(rollbackMutation, {
    onClose: () => {
      setIsRollbackDialogOpen(false);
      onClose?.();
    },
    onSuccess: (result) => {
      trackAdminDelayChangeRolledBack(ecosystem);
      onSuccess?.(result);
    },
  });

  const openChangeDialog = useCallback(() => {
    setNewDelayInput(DEFAULT_DELAY_INPUT);
    changeExecution.reset();
    setIsRollbackDialogOpen(false);
    setIsChangeDialogOpen(true);
  }, [changeExecution]);

  const closeChangeDialog = useCallback(() => {
    setIsChangeDialogOpen(false);
    setNewDelayInput(DEFAULT_DELAY_INPUT);
    changeExecution.reset();
    onClose?.();
  }, [changeExecution, onClose]);

  const openRollbackDialog = useCallback(() => {
    rollbackExecution.reset();
    setIsChangeDialogOpen(false);
    setIsRollbackDialogOpen(true);
  }, [rollbackExecution]);

  const closeRollbackDialog = useCallback(() => {
    setIsRollbackDialogOpen(false);
    rollbackExecution.reset();
    onClose?.();
  }, [rollbackExecution, onClose]);

  const submitChangeDelay = useCallback(async () => {
    const parsed = parseInt(newDelayInput, 10);
    if (isNaN(parsed) || parsed <= 0) {
      return;
    }
    const executionConfig = { method: 'eoa', allowAny: true } as ExecutionConfig;
    await changeExecution.execute({
      newDelay: parsed,
      executionConfig,
    });
  }, [newDelayInput, changeExecution]);

  const submitRollback = useCallback(async () => {
    const executionConfig = { method: 'eoa', allowAny: true } as ExecutionConfig;
    await rollbackExecution.execute({
      executionConfig,
    });
  }, [rollbackExecution]);

  return {
    isChangeDialogOpen,
    openChangeDialog,
    closeChangeDialog,
    newDelayInput,
    setNewDelayInput,
    submitChangeDelay,
    changeStep: changeExecution.step,
    changeErrorMessage: changeExecution.errorMessage,
    changeTxStatus: changeMutation.status,
    changeTxStatusDetails: changeMutation.statusDetails,
    isChangePending: changeMutation.isPending,
    retryChange: changeExecution.retry,
    resetChange: changeExecution.reset,

    isRollbackDialogOpen,
    openRollbackDialog,
    closeRollbackDialog,
    submitRollback,
    rollbackStep: rollbackExecution.step,
    rollbackErrorMessage: rollbackExecution.errorMessage,
    isRollbackPending: rollbackMutation.isPending,
    retryRollback: rollbackExecution.retry,
    resetRollback: rollbackExecution.reset,
  };
}
