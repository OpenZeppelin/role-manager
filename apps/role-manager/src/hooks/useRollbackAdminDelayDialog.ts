/**
 * useRollbackAdminDelayDialog hook
 * Feature: 017-evm-access-control (T064, US7)
 *
 * Manages state and logic for the "Rollback Admin Delay" confirmation dialog.
 * When user confirms, calls useRollbackAdminDelay to cancel the pending delay change.
 *
 * Pattern: Follows useCancelAdminTransferDialog conventions —
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
import { useRollbackAdminDelay, type RollbackAdminDelayArgs } from './useAccessControlMutations';
import { useRoleManagerAnalytics } from './useRoleManagerAnalytics';
import { useSelectedContract } from './useSelectedContract';
import { useTransactionExecution } from './useTransactionExecution';

// =============================================================================
// Types
// =============================================================================

export interface UseRollbackAdminDelayDialogOptions {
  /** Callback when dialog should close */
  onClose?: () => void;
  /** Callback on successful rollback */
  onSuccess?: (result: OperationResult) => void;
}

export interface UseRollbackAdminDelayDialogReturn {
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
  /** Execute rollback admin delay */
  submit: () => Promise<void>;
  /** Retry after error */
  retry: () => Promise<void>;
  /** Reset dialog to form state */
  reset: () => void;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook that manages state and logic for the Rollback Admin Delay confirmation dialog.
 *
 * @param options - Optional onClose and onSuccess callbacks
 * @returns Dialog state, actions, and transaction status
 */
export function useRollbackAdminDelayDialog(
  options: UseRollbackAdminDelayDialogOptions = {}
): UseRollbackAdminDelayDialogReturn {
  const { onClose, onSuccess } = options;

  const { selectedContract, adapter } = useSelectedContract();
  const contractAddress = selectedContract?.address ?? '';
  const { trackAdminDelayChangeRolledBack } = useRoleManagerAnalytics();
  const ecosystem = adapter?.networkConfig?.ecosystem ?? 'unknown';

  const rollbackMutation = useRollbackAdminDelay(adapter, contractAddress);

  const execution = useTransactionExecution<RollbackAdminDelayArgs>(rollbackMutation, {
    onClose,
    onSuccess: (result) => {
      trackAdminDelayChangeRolledBack(ecosystem);
      onSuccess?.(result);
    },
  });

  const submit = useCallback(async () => {
    const executionConfig = { method: 'eoa', allowAny: true } as ExecutionConfig;
    await execution.execute({ executionConfig });
  }, [execution]);

  return {
    step: execution.step,
    errorMessage: execution.errorMessage,
    txStatus: rollbackMutation.status,
    txStatusDetails: rollbackMutation.statusDetails,
    isPending: rollbackMutation.isPending,
    submit,
    retry: execution.retry,
    reset: execution.reset,
  };
}
