/**
 * RollbackAdminDelayDialog Component
 * Feature: 017-evm-access-control (T064, US7)
 *
 * Dialog for rolling back (canceling) a pending admin delay change.
 * Simple confirmation dialog — no form inputs.
 *
 * Pattern: Follows CancelAdminTransferDialog conventions —
 * standalone component with open/onOpenChange/onSuccess props, shared transaction states,
 * ConfirmCloseDialog for pending transactions, escape key prevention.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@openzeppelin/ui-components';

import { useRollbackAdminDelayDialog } from '../../hooks/useRollbackAdminDelayDialog';
import {
  ConfirmCloseDialog,
  DialogCancelledState,
  DialogErrorState,
  DialogPendingState,
  DialogSuccessState,
} from '../Shared';

// =============================================================================
// Types
// =============================================================================

export interface RollbackAdminDelayDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when transaction succeeds */
  onSuccess?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function RollbackAdminDelayDialog({
  open,
  onOpenChange,
  onSuccess,
}: RollbackAdminDelayDialogProps) {
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const { step, errorMessage, txStatus, isPending, submit, retry, reset } =
    useRollbackAdminDelayDialog({
      onClose: () => onOpenChange(false),
      onSuccess,
    });

  // Reset state when dialog opens
  const wasOpenRef = useRef(open);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      reset();
    }
    wasOpenRef.current = open;
  }, [open, reset]);

  // Handle dialog close with confirmation during transaction
  const handleClose = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) return;
      if (step === 'pending' || step === 'confirming') {
        setShowConfirmClose(true);
        return;
      }
      reset();
      onOpenChange(false);
    },
    [step, reset, onOpenChange]
  );

  const handleConfirmClose = useCallback(() => {
    setShowConfirmClose(false);
    reset();
    onOpenChange(false);
  }, [reset, onOpenChange]);

  const handleCancel = useCallback(() => {
    handleClose(false);
  }, [handleClose]);

  const handleSubmit = useCallback(async () => {
    await submit();
  }, [submit]);

  // Prevent Escape key from closing dialog during pending/confirming states
  const handleEscapeKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (step === 'pending' || step === 'confirming') {
        event.preventDefault();
      }
    },
    [step]
  );

  // =============================================================================
  // Render Content Based on Step
  // =============================================================================

  const renderContent = () => {
    switch (step) {
      case 'pending':
      case 'confirming':
        return (
          <DialogPendingState
            title="Rolling Back Delay Change..."
            description="Please confirm the transaction in your wallet"
            txStatus={txStatus}
          />
        );

      case 'success':
        return (
          <DialogSuccessState
            title="Rollback Successful"
            description="The pending delay change has been canceled. The current delay remains in effect."
          />
        );

      case 'error':
        return (
          <DialogErrorState
            title="Rollback Failed"
            message={errorMessage || 'An error occurred while rolling back the delay change.'}
            canRetry={true}
            onRetry={retry}
            onCancel={handleCancel}
          />
        );

      case 'cancelled':
        return (
          <DialogCancelledState
            message="The transaction was cancelled. You can try again or close the dialog."
            onBack={retry}
            onClose={() => handleClose(false)}
          />
        );

      case 'form':
      default:
        return (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              This will cancel the pending delay change. The current admin transfer delay will
              remain in effect.
            </p>
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={isPending}>
                {isPending ? 'Rolling back...' : 'Rollback Change'}
              </Button>
            </DialogFooter>
          </div>
        );
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[480px]" onEscapeKeyDown={handleEscapeKeyDown}>
          <DialogHeader>
            <DialogTitle>Rollback Delay Change</DialogTitle>
            <DialogDescription>
              Cancel the pending admin delay change. The current delay will remain in effect.
            </DialogDescription>
          </DialogHeader>
          {renderContent()}
        </DialogContent>
      </Dialog>
      <ConfirmCloseDialog
        open={showConfirmClose}
        onCancel={() => setShowConfirmClose(false)}
        onConfirm={handleConfirmClose}
      />
    </>
  );
}
