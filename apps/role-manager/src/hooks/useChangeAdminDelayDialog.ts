/**
 * useChangeAdminDelayDialog hook
 * Feature: 017-evm-access-control (T064, US7)
 *
 * Manages transaction state and logic for the "Change Admin Delay" dialog.
 * The dialog component owns form state via react-hook-form; this hook only
 * handles mutation execution, step tracking, and analytics.
 *
 * Pattern: Follows useCancelAdminTransferDialog / useAcceptAdminTransferDialog conventions —
 * one hook per dialog, returns step/errorMessage/txStatus/isPending/submit/retry/reset.
 */
import { useCallback } from 'react';

import type {
  ExecutionConfig,
  OperationResult,
  TransactionStatusUpdate,
  TxStatus,
} from '@openzeppelin/ui-types';

import type { DialogTransactionStep } from '../types/role-dialogs';
import { useChangeAdminDelay, type ChangeAdminDelayArgs } from './useAccessControlMutations';
import { useRoleManagerAnalytics } from './useRoleManagerAnalytics';
import { useSelectedContract } from './useSelectedContract';
import { useTransactionExecution } from './useTransactionExecution';

// =============================================================================
// Types
// =============================================================================

export interface UseChangeAdminDelayDialogOptions {
  /** Callback when dialog should close */
  onClose?: () => void;
  /** Callback on successful delay change */
  onSuccess?: (result: OperationResult) => void;
}

export interface UseChangeAdminDelayDialogReturn {
  /** Current transaction step */
  step: DialogTransactionStep;
  /** Error message if step is 'error' */
  errorMessage: string | null;
  /** Transaction status */
  txStatus: TxStatus;
  /** Detailed transaction status */
  txStatusDetails: TransactionStatusUpdate | null;
  /** Whether the mutation is pending */
  isPending: boolean;
  /** Execute change admin delay with the given new delay (seconds) */
  submit: (newDelay: number) => Promise<void>;
  /** Retry after error */
  retry: () => Promise<void>;
  /** Reset dialog to form state */
  reset: () => void;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook that manages transaction state for the Change Admin Delay dialog.
 * Form input state is owned by the dialog component via react-hook-form.
 *
 * @param options - Optional onClose and onSuccess callbacks
 * @returns Dialog state, actions, and transaction status
 */
export function useChangeAdminDelayDialog(
  options: UseChangeAdminDelayDialogOptions = {}
): UseChangeAdminDelayDialogReturn {
  const { onClose, onSuccess } = options;

  const { selectedContract, adapter } = useSelectedContract();
  const contractAddress = selectedContract?.address ?? '';
  const { trackAdminDelayChangeScheduled } = useRoleManagerAnalytics();
  const ecosystem = adapter?.networkConfig?.ecosystem ?? 'unknown';

  const changeMutation = useChangeAdminDelay(adapter, contractAddress);

  const execution = useTransactionExecution<ChangeAdminDelayArgs>(changeMutation, {
    onClose,
    onSuccess: (result) => {
      trackAdminDelayChangeScheduled(ecosystem);
      onSuccess?.(result);
    },
  });

  const submit = useCallback(
    async (newDelay: number) => {
      if (isNaN(newDelay) || newDelay <= 0) {
        return;
      }
      const executionConfig = { method: 'eoa', allowAny: true } as ExecutionConfig;
      await execution.execute({
        newDelay,
        executionConfig,
      });
    },
    [execution]
  );

  return {
    step: execution.step,
    errorMessage: execution.errorMessage,
    txStatus: changeMutation.status,
    txStatusDetails: changeMutation.statusDetails,
    isPending: changeMutation.isPending,
    submit,
    retry: execution.retry,
    reset: execution.reset,
  };
}
