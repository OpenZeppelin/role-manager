/**
 * ChangeAdminDelayDialog Component
 * Feature: 017-evm-access-control (T064, US7)
 *
 * Dialog for scheduling a change to the admin transfer delay.
 * User enters a new delay in seconds, then submits via useChangeAdminDelayDialog.
 *
 * Pattern: Follows CancelAdminTransferDialog / AcceptAdminTransferDialog conventions —
 * standalone component with open/onOpenChange/onSuccess props, shared transaction states,
 * ConfirmCloseDialog for pending transactions, escape key prevention.
 *
 * Uses NumberField from @openzeppelin/ui-components for consistent field styling
 * with react-hook-form integration.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  NumberField,
} from '@openzeppelin/ui-components';

import { useChangeAdminDelayDialog } from '../../hooks/useChangeAdminDelayDialog';
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

export interface ChangeAdminDelayDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when transaction succeeds */
  onSuccess?: () => void;
}

interface ChangeAdminDelayFormData {
  newDelay: number | '';
}

// =============================================================================
// Component
// =============================================================================

export function ChangeAdminDelayDialog({
  open,
  onOpenChange,
  onSuccess,
}: ChangeAdminDelayDialogProps) {
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const { step, errorMessage, txStatus, isPending, submit, retry, reset } =
    useChangeAdminDelayDialog({
      onClose: () => onOpenChange(false),
      onSuccess,
    });

  const form = useForm<ChangeAdminDelayFormData>({
    defaultValues: { newDelay: '' },
    mode: 'onChange',
  });

  const { control, handleSubmit, formState, reset: resetForm } = form;
  const canSubmit = formState.isValid && !isPending;

  // Reset state when dialog opens
  const wasOpenRef = useRef(open);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      reset();
      resetForm({ newDelay: '' });
    }
    wasOpenRef.current = open;
  }, [open, reset, resetForm]);

  // Handle dialog close with confirmation during transaction
  const handleClose = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) return;
      if (step === 'pending' || step === 'confirming') {
        setShowConfirmClose(true);
        return;
      }
      reset();
      resetForm({ newDelay: '' });
      onOpenChange(false);
    },
    [step, reset, resetForm, onOpenChange]
  );

  const handleConfirmClose = useCallback(() => {
    setShowConfirmClose(false);
    reset();
    resetForm({ newDelay: '' });
    onOpenChange(false);
  }, [reset, resetForm, onOpenChange]);

  const handleCancel = useCallback(() => {
    handleClose(false);
  }, [handleClose]);

  const onSubmit = useCallback(
    async (data: ChangeAdminDelayFormData) => {
      const delay =
        typeof data.newDelay === 'number' ? data.newDelay : parseInt(String(data.newDelay), 10);
      if (isNaN(delay) || delay <= 0) return;
      await submit(delay);
    },
    [submit]
  );

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
            title="Scheduling Delay Change..."
            description="Please confirm the transaction in your wallet"
            txStatus={txStatus}
          />
        );

      case 'success':
        return (
          <DialogSuccessState
            title="Delay Change Scheduled"
            description="The admin transfer delay change has been scheduled. It will take effect after the current delay period."
          />
        );

      case 'error':
        return (
          <DialogErrorState
            title="Change Failed"
            message={errorMessage || 'An error occurred while scheduling the delay change.'}
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            <NumberField
              id="admin-delay-input"
              name="newDelay"
              label="New delay (seconds)"
              placeholder="Enter delay in seconds"
              helperText="The change will take effect after the current delay period elapses."
              control={control}
              min={1}
              validation={{ required: true, min: 1 }}
              validateNumber={(value) =>
                Number.isInteger(value) || 'Delay must be a whole number of seconds.'
              }
            />

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {isPending ? 'Submitting...' : 'Schedule Change'}
              </Button>
            </DialogFooter>
          </form>
        );
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[480px]" onEscapeKeyDown={handleEscapeKeyDown}>
          <DialogHeader>
            <DialogTitle>Change Admin Delay</DialogTitle>
            <DialogDescription>
              Enter the new admin transfer delay in seconds. The change will take effect after the
              current delay period.
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
