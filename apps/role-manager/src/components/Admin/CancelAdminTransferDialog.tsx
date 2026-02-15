/**
 * CancelAdminTransferDialog Component
 * Feature: 017-evm-access-control (T066, US7)
 *
 * Dialog for canceling a pending admin transfer.
 * Shown when the contract supports hasCancelAdminTransfer and there is a pending transfer.
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

import { useCancelAdminTransferDialog } from '../../hooks/useCancelAdminTransferDialog';
import {
  ConfirmCloseDialog,
  DialogCancelledState,
  DialogErrorState,
  DialogPendingState,
  DialogSuccessState,
} from '../Shared';

export interface CancelAdminTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CancelAdminTransferDialog({
  open,
  onOpenChange,
  onSuccess,
}: CancelAdminTransferDialogProps) {
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const { step, errorMessage, txStatus, isPending, submit, retry, reset } =
    useCancelAdminTransferDialog({
      onClose: () => onOpenChange(false),
      onSuccess,
    });

  const wasOpenRef = useRef(open);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      reset();
    }
    wasOpenRef.current = open;
  }, [open, reset]);

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

  const handleEscapeKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (step === 'pending' || step === 'confirming') {
        event.preventDefault();
      }
    },
    [step]
  );

  const renderContent = () => {
    switch (step) {
      case 'pending':
      case 'confirming':
        return (
          <DialogPendingState
            title="Canceling Admin Transfer..."
            description="Please confirm the transaction in your wallet"
            txStatus={txStatus}
          />
        );

      case 'success':
        return (
          <DialogSuccessState
            title="Admin Transfer Canceled"
            description="The pending admin transfer has been canceled."
          />
        );

      case 'error':
        return (
          <DialogErrorState
            title="Cancel Failed"
            message={errorMessage || 'An error occurred while canceling the transfer.'}
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
              This will cancel the pending admin transfer. The current admin will remain the admin.
            </p>
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={isPending}>
                {isPending ? 'Canceling...' : 'Cancel Transfer'}
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
            <DialogTitle>Cancel Admin Transfer</DialogTitle>
            <DialogDescription>
              Cancel the pending admin role transfer for this contract.
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
