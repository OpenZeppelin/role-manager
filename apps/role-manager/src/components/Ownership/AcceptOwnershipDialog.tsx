/**
 * AcceptOwnershipDialog Component
 * Feature: 015-ownership-transfer
 *
 * Dialog for accepting a pending ownership transfer.
 * Displayed when the connected wallet is the pending owner of a two-step transfer.
 *
 * Implements:
 * - T018: Dialog with confirmation content and contract address display
 * - Transaction state rendering using DialogTransactionStates
 * - Close-during-transaction confirmation prompt
 * - Wallet disconnection handling
 *
 * Key behaviors:
 * - Simple confirmation dialog (no form inputs)
 * - Transaction state feedback (pending, success, error, cancelled)
 * - Auto-close after 1.5s success display
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
} from '@openzeppelin/ui-builder-ui';

import { useAcceptOwnershipDialog } from '../../hooks/useAcceptOwnershipDialog';
import { useSelectedContract } from '../../hooks/useSelectedContract';
import {
  ConfirmCloseDialog,
  DialogCancelledState,
  DialogErrorState,
  DialogPendingState,
  DialogSuccessState,
  WalletDisconnectedAlert,
} from '../Shared';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for AcceptOwnershipDialog component
 */
export interface AcceptOwnershipDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when transaction succeeds (for parent to refresh data) */
  onSuccess?: () => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * AcceptOwnershipDialog - Dialog for accepting pending ownership transfers
 *
 * @example
 * ```tsx
 * <AcceptOwnershipDialog
 *   open={acceptDialogOpen}
 *   onOpenChange={setAcceptDialogOpen}
 *   onSuccess={() => refetch()}
 * />
 * ```
 */
export function AcceptOwnershipDialog({
  open,
  onOpenChange,
  onSuccess,
}: AcceptOwnershipDialogProps) {
  // Track confirmation dialog state
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  // Dialog state and logic
  const { step, errorMessage, txStatus, isWalletConnected, isNetworkError, submit, retry, reset } =
    useAcceptOwnershipDialog({
      onClose: () => onOpenChange(false),
      onSuccess,
    });

  // Get contract info for display
  const { selectedContract } = useSelectedContract();
  const contractLabel = selectedContract?.label || selectedContract?.address || 'Unknown Contract';

  // Reset state when dialog opens
  const wasOpenRef = useRef(open);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      // Dialog just opened - reset to fresh state
      reset();
    }
    wasOpenRef.current = open;
  }, [open, reset]);

  // Handle dialog close with confirmation during transaction
  const handleClose = useCallback(
    (open: boolean) => {
      if (open) return;

      // Show confirmation prompt during pending/confirming states
      if (step === 'pending' || step === 'confirming') {
        setShowConfirmClose(true);
        return;
      }
      reset();
      onOpenChange(false);
    },
    [step, reset, onOpenChange]
  );

  // Confirm close during transaction
  const handleConfirmClose = useCallback(() => {
    setShowConfirmClose(false);
    reset();
    onOpenChange(false);
  }, [reset, onOpenChange]);

  // Cancel confirmation and return to transaction
  const handleCancelConfirmClose = useCallback(() => {
    setShowConfirmClose(false);
  }, []);

  // Handle cancel button
  const handleCancel = useCallback(() => {
    handleClose(false);
  }, [handleClose]);

  // Handle back from cancelled state
  const handleBackFromCancelled = useCallback(() => {
    // Use retry() to go back to pending state
    retry();
  }, [retry]);

  // Handle accept button
  const handleAccept = useCallback(async () => {
    await submit();
  }, [submit]);

  // =============================================================================
  // Render Content Based on Step
  // =============================================================================

  const renderContent = () => {
    switch (step) {
      case 'pending':
      case 'confirming':
        return (
          <DialogPendingState
            title="Accepting Ownership..."
            description="Please confirm the transaction in your wallet"
            txStatus={txStatus}
          />
        );

      case 'success':
        return (
          <DialogSuccessState
            title="Ownership Accepted!"
            description="You are now the owner of this contract."
          />
        );

      case 'error':
        return (
          <DialogErrorState
            title={isNetworkError ? 'Network Error' : 'Accept Failed'}
            message={
              isNetworkError
                ? 'Unable to connect to the network. Please check your connection and try again.'
                : errorMessage || 'An error occurred while processing the transaction.'
            }
            canRetry={true}
            onRetry={retry}
            onCancel={handleCancel}
          />
        );

      case 'cancelled':
        return (
          <DialogCancelledState
            message="The transaction was cancelled. You can try again or close the dialog."
            onBack={handleBackFromCancelled}
            onClose={() => handleClose(false)}
          />
        );

      case 'form':
      default:
        return (
          <AcceptOwnershipConfirmContent
            contractLabel={contractLabel}
            isWalletConnected={isWalletConnected}
            onCancel={handleCancel}
            onAccept={handleAccept}
          />
        );
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Accept Ownership</DialogTitle>
            <DialogDescription>
              Accept the pending ownership transfer for this contract.
            </DialogDescription>
          </DialogHeader>

          {renderContent()}
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog when closing during transaction */}
      <ConfirmCloseDialog
        open={showConfirmClose}
        onCancel={handleCancelConfirmClose}
        onConfirm={handleConfirmClose}
      />
    </>
  );
}

// =============================================================================
// AcceptOwnershipConfirmContent (Internal)
// =============================================================================

interface AcceptOwnershipConfirmContentProps {
  contractLabel: string;
  isWalletConnected: boolean;
  onCancel: () => void;
  onAccept: () => Promise<void>;
}

function AcceptOwnershipConfirmContent({
  contractLabel,
  isWalletConnected,
  onCancel,
  onAccept,
}: AcceptOwnershipConfirmContentProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAccept = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await onAccept();
    } finally {
      setIsSubmitting(false);
    }
  }, [onAccept]);

  const canSubmit = isWalletConnected && !isSubmitting;

  return (
    <div className="space-y-4 py-4">
      {/* Wallet Disconnection Alert */}
      {!isWalletConnected && <WalletDisconnectedAlert />}

      {/* Confirmation Message */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          You have been designated as the pending owner of{' '}
          <span className="font-medium text-foreground">{contractLabel}</span>. By accepting this
          transfer, you will become the new owner of this contract.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-800">
          <strong>Important:</strong> This action is irreversible. Make sure you are ready to take
          ownership of this contract.
        </p>
      </div>

      {/* Action Buttons */}
      <DialogFooter className="gap-2 sm:gap-0 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          aria-label="Cancel and close dialog"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleAccept}
          disabled={!canSubmit}
          aria-label="Accept ownership of this contract"
        >
          {isSubmitting ? 'Accepting...' : 'Accept Ownership'}
        </Button>
      </DialogFooter>
    </div>
  );
}
