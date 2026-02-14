/**
 * TypeToConfirmDialog Component
 * Feature: 017-evm-access-control (T048)
 *
 * Reusable confirmation dialog that requires the user to type a specific keyword
 * to enable the submit button. Designed for irreversible destructive actions
 * such as renouncing ownership or roles.
 *
 * Implements:
 * - FR-027: Type-to-confirm pattern for destructive operations
 * - Case-sensitive keyword matching
 * - Disabled submit until keyword matches exactly
 * - Warning text with contextual messaging
 * - Transaction state feedback via DialogTransactionStates
 * - Auto-close after successful transaction
 * - Close-during-transaction confirmation prompt
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
  Input,
  Label,
} from '@openzeppelin/ui-components';
import type { TxStatus } from '@openzeppelin/ui-types';

import type { DialogTransactionStep } from '../../types/role-dialogs';
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
 * Props for TypeToConfirmDialog component
 */
export interface TypeToConfirmDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Dialog description / subtitle */
  description?: string;
  /** Warning message displayed prominently */
  warningText: string;
  /** The keyword the user must type to confirm (case-sensitive) */
  confirmKeyword: string;
  /** Label for the confirmation input */
  inputLabel?: string;
  /** Placeholder text for the confirmation input */
  inputPlaceholder?: string;
  /** Text for the submit button */
  submitLabel?: string;
  /** Text shown on the submit button while pending */
  pendingLabel?: string;
  /** Success message after transaction */
  successMessage?: string;
  /** Current dialog transaction step */
  step: DialogTransactionStep;
  /** Error message when step is 'error' */
  errorMessage?: string | null;
  /** Transaction status */
  txStatus?: TxStatus;
  /** Whether wallet is connected */
  isWalletConnected?: boolean;
  /** Whether the mutation is pending (for button loading state) */
  isPending?: boolean;
  /** Submit handler */
  onSubmit: () => void;
  /** Retry handler after error */
  onRetry?: () => void;
  /** Reset handler to return to form */
  onReset?: () => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * TypeToConfirmDialog - Requires user to type a keyword to confirm destructive action
 *
 * @example
 * ```tsx
 * <TypeToConfirmDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Renounce Ownership"
 *   warningText="This action is irreversible. The contract will have no owner."
 *   confirmKeyword="RENOUNCE"
 *   step={step}
 *   onSubmit={handleSubmit}
 * />
 * ```
 */
export function TypeToConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  warningText,
  confirmKeyword,
  inputLabel,
  inputPlaceholder,
  submitLabel = 'Confirm',
  pendingLabel = 'Processing...',
  successMessage = 'Operation completed successfully',
  step,
  errorMessage,
  txStatus,
  isWalletConnected = true,
  isPending = false,
  onSubmit,
  onRetry,
  onReset,
}: TypeToConfirmDialogProps) {
  const [inputValue, setInputValue] = useState('');
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const prevOpenRef = useRef(open);

  // Keyword match (case-sensitive)
  const isKeywordMatch = inputValue === confirmKeyword;

  // Whether submit is allowed
  const canSubmit = isKeywordMatch && isWalletConnected && !isPending && step === 'form';

  // Reset input when dialog opens/closes
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setInputValue('');
    }
    prevOpenRef.current = open;
  }, [open]);

  // Whether we're in a transacting state
  const isTransacting = step === 'pending' || step === 'confirming';

  // Handle close request with confirmation if transacting
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen && isTransacting) {
        setShowConfirmClose(true);
        return;
      }
      if (!newOpen) {
        setInputValue('');
        onReset?.();
      }
      onOpenChange(newOpen);
    },
    [isTransacting, onOpenChange, onReset]
  );

  // Confirm close during transaction
  const handleConfirmClose = useCallback(() => {
    setShowConfirmClose(false);
    setInputValue('');
    onReset?.();
    onOpenChange(false);
  }, [onOpenChange, onReset]);

  // Cancel close during transaction
  const handleCancelClose = useCallback(() => {
    setShowConfirmClose(false);
  }, []);

  // Handle retry
  const handleRetry = useCallback(() => {
    setInputValue('');
    onRetry?.();
  }, [onRetry]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  // Handle form submit (Enter key)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && canSubmit) {
        onSubmit();
      }
    },
    [canSubmit, onSubmit]
  );

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[480px]" onKeyDown={handleKeyDown}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          {/* Form state */}
          {step === 'form' && (
            <div className="space-y-4 py-2">
              {/* Warning text */}
              <div className="rounded-md bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-800 font-medium">{warningText}</p>
              </div>

              {/* Wallet disconnected alert */}
              {!isWalletConnected && <WalletDisconnectedAlert />}

              {/* Confirmation input */}
              <div className="space-y-2">
                <Label htmlFor="confirm-keyword">
                  {inputLabel ?? `Type "${confirmKeyword}" to confirm`}
                </Label>
                <Input
                  id="confirm-keyword"
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder={inputPlaceholder ?? confirmKeyword}
                  autoComplete="off"
                  data-testid="confirm-keyword-input"
                />
              </div>
            </div>
          )}

          {/* Pending state */}
          {step === 'pending' && (
            <DialogPendingState
              title="Processing..."
              description="Please confirm the transaction in your wallet"
              txStatus={txStatus}
            />
          )}

          {/* Confirming state (waiting for block confirmation) */}
          {step === 'confirming' && (
            <DialogPendingState
              title="Confirming..."
              description="Waiting for block confirmation"
              txStatus={txStatus}
            />
          )}

          {/* Success state */}
          {step === 'success' && (
            <DialogSuccessState title="Success" description={successMessage} />
          )}

          {/* Error state */}
          {step === 'error' && (
            <DialogErrorState
              title="Transaction Failed"
              message={errorMessage ?? 'An error occurred'}
              canRetry={!!onRetry}
              onRetry={handleRetry}
              onCancel={() => handleOpenChange(false)}
            />
          )}

          {/* Cancelled state */}
          {step === 'cancelled' && (
            <DialogCancelledState onBack={handleRetry} onClose={() => handleOpenChange(false)} />
          )}

          {/* Footer - only show in form state */}
          {step === 'form' && (
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={onSubmit}
                disabled={!canSubmit}
                data-testid="confirm-submit-button"
              >
                {isPending ? pendingLabel : submitLabel}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm close during transaction */}
      <ConfirmCloseDialog
        open={showConfirmClose}
        onConfirm={handleConfirmClose}
        onCancel={handleCancelClose}
      />
    </>
  );
}
