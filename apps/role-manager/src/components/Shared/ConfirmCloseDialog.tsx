/**
 * ConfirmCloseDialog Component
 * Feature: 014-role-grant-revoke (Phase 6: Error Handling)
 *
 * Confirmation dialog shown when user attempts to close a dialog
 * while a transaction is pending or confirming.
 *
 * Implements FR-041: Close during transaction confirmation prompt
 * "Transaction in progress. Are you sure you want to close?"
 *
 * Key behaviors:
 * - Shows warning that closing doesn't cancel the transaction
 * - Allows user to go back or confirm close
 */

import { AlertTriangle } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@openzeppelin/ui-components';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for ConfirmCloseDialog component
 */
export interface ConfirmCloseDialogProps {
  /** Whether the confirmation dialog is open */
  open: boolean;
  /** Callback to close the confirmation dialog (go back to transaction) */
  onCancel: () => void;
  /** Callback to confirm closing the parent dialog */
  onConfirm: () => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * ConfirmCloseDialog - Confirmation prompt for closing during transaction
 *
 * Warns users that:
 * 1. A transaction is in progress
 * 2. Closing the dialog does NOT cancel the blockchain transaction
 * 3. The transaction will continue in the background
 *
 * @example
 * ```tsx
 * <ConfirmCloseDialog
 *   open={showConfirmClose}
 *   onCancel={() => setShowConfirmClose(false)}
 *   onConfirm={() => {
 *     setShowConfirmClose(false);
 *     onOpenChange(false);
 *   }}
 * />
 * ```
 */
export function ConfirmCloseDialog({ open, onCancel, onConfirm }: ConfirmCloseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <DialogTitle>Transaction In Progress</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            A transaction is currently being processed. Are you sure you want to close this dialog?
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-warning/30 bg-warning/5 p-3">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Note:</strong> Closing this dialog will{' '}
            <strong className="text-foreground">not</strong> cancel the blockchain transaction. The
            transaction will continue in the background.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            aria-label="Go back to transaction"
          >
            Go Back
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            aria-label="Close dialog anyway"
          >
            Close Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
