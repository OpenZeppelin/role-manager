/**
 * useCancelAdminTransferDialog hook
 * Feature: 017-evm-access-control (T063, US7)
 *
 * Manages state and logic for the "Cancel Admin Transfer" confirmation dialog.
 * When user confirms, calls useCancelAdminTransfer and invalidates admin info on success.
 */
import { useCallback } from 'react';

import type {
  ExecutionConfig,
  OperationResult,
  TransactionStatusUpdate,
  TxStatus,
} from '@openzeppelin/ui-types';

import type { DialogTransactionStep } from '../types/role-dialogs';
import { useCancelAdminTransfer, type CancelAdminTransferArgs } from './useAccessControlMutations';
import { useRoleManagerAnalytics } from './useRoleManagerAnalytics';
import { useSelectedContract } from './useSelectedContract';
import { useTransactionExecution } from './useTransactionExecution';

// =============================================================================
// Types
// =============================================================================

export interface UseCancelAdminTransferDialogOptions {
  /** Callback when dialog should close */
  onClose?: () => void;
  /** Callback on successful cancel */
  onSuccess?: (result: OperationResult) => void;
}

export interface UseCancelAdminTransferDialogReturn {
  /** Current transaction step */
  step: DialogTransactionStep;
  /** Error message if step is 'error' */
  errorMessage: string | null;
  /** Transaction status */
  txStatus: TxStatus;
  /** Detailed transaction status */
  txStatusDetails: TransactionStatusUpdate | null;
  /** Whether wallet is connected (not used for cancel, but for consistency) */
  isWalletConnected: boolean;
  /** Whether the mutation is pending */
  isPending: boolean;
  /** Execute cancel admin transfer */
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
 * Hook that manages state and logic for the Cancel Admin Transfer confirmation dialog.
 *
 * @param options - Optional onClose and onSuccess callbacks
 * @returns Dialog state, actions, and transaction status
 */
export function useCancelAdminTransferDialog(
  options: UseCancelAdminTransferDialogOptions = {}
): UseCancelAdminTransferDialogReturn {
  const { onClose, onSuccess } = options;

  const { selectedContract, adapter } = useSelectedContract();
  const contractAddress = selectedContract?.address ?? '';
  const { trackAdminTransferCancelled } = useRoleManagerAnalytics();

  const cancelMutation = useCancelAdminTransfer(adapter, contractAddress);

  const execution = useTransactionExecution<CancelAdminTransferArgs>(cancelMutation, {
    onClose,
    onSuccess: (result) => {
      trackAdminTransferCancelled(adapter?.networkConfig?.ecosystem ?? 'unknown');
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
    txStatus: cancelMutation.status,
    txStatusDetails: cancelMutation.statusDetails,
    isWalletConnected: true,
    isPending: cancelMutation.isPending,
    submit,
    retry: execution.retry,
    reset: execution.reset,
  };
}
