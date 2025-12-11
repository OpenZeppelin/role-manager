/**
 * Dialog Transaction State Components
 * Feature: 014-role-grant-revoke
 *
 * Reusable components for displaying transaction states within dialogs:
 * - DialogPendingState: Loading spinner with status message
 * - DialogSuccessState: Success message with checkmark icon
 * - DialogErrorState: Error message with retry option
 *
 * These are generic versions tailored for role dialogs, while the existing
 * DialogLoadingState/DialogErrorState in Contracts/ are specific to contract loading.
 */

import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle, Button } from '@openzeppelin/ui-builder-ui';
import { cn } from '@openzeppelin/ui-builder-utils';

// =============================================================================
// DialogPendingState
// =============================================================================

/**
 * Props for DialogPendingState component
 */
export interface DialogPendingStateProps {
  /** Title to display */
  title: string;
  /** Description text */
  description: string;
  /** Optional transaction status for progress */
  txStatus?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays a pending/loading state during transaction execution.
 *
 * @example
 * ```tsx
 * <DialogPendingState
 *   title="Granting Role..."
 *   description="Please confirm the transaction in your wallet"
 *   txStatus="awaiting_signature"
 * />
 * ```
 */
export function DialogPendingState({
  title,
  description,
  txStatus,
  className,
}: DialogPendingStateProps): React.ReactElement {
  return (
    <div className={cn('flex flex-col items-center gap-4 py-8', className)}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <div className="text-center">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        {txStatus && (
          <p className="mt-2 text-xs font-medium text-primary" aria-live="polite">
            {formatTxStatus(txStatus)}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Format transaction status for display
 */
function formatTxStatus(status: string): string {
  switch (status) {
    case 'idle':
      return 'Preparing...';
    case 'awaiting_signature':
      return 'Awaiting wallet signature...';
    case 'pending':
      return 'Transaction submitted...';
    case 'confirming':
      return 'Confirming transaction...';
    case 'confirmed':
      return 'Transaction confirmed!';
    default:
      return status;
  }
}

// =============================================================================
// DialogSuccessState
// =============================================================================

/**
 * Props for DialogSuccessState component
 */
export interface DialogSuccessStateProps {
  /** Title to display */
  title: string;
  /** Description text */
  description: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays a success state after transaction completion.
 * Auto-closes dialog after brief display (handled by parent).
 *
 * @example
 * ```tsx
 * <DialogSuccessState
 *   title="Role Granted"
 *   description="Viewer role has been granted to the account"
 * />
 * ```
 */
export function DialogSuccessState({
  title,
  description,
  className,
}: DialogSuccessStateProps): React.ReactElement {
  return (
    <div className={cn('flex flex-col items-center gap-4 py-8', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

// =============================================================================
// DialogErrorState
// =============================================================================

/**
 * Props for DialogErrorState component
 */
export interface DialogErrorStateProps {
  /** Title to display */
  title: string;
  /** Error message */
  message: string;
  /** Whether retry is available */
  canRetry?: boolean;
  /** Retry handler */
  onRetry?: () => void;
  /** Cancel/close handler */
  onCancel: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays an error state with retry and cancel options.
 *
 * @example
 * ```tsx
 * <DialogErrorState
 *   title="Transaction Failed"
 *   message="Network error occurred"
 *   canRetry={true}
 *   onRetry={handleRetry}
 *   onCancel={handleCancel}
 * />
 * ```
 */
export function DialogErrorState({
  title,
  message,
  canRetry = true,
  onRetry,
  onCancel,
  className,
}: DialogErrorStateProps): React.ReactElement {
  return (
    <div className={cn('flex flex-col gap-4 py-4', className)}>
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        {canRetry && onRetry && <Button onClick={onRetry}>Try Again</Button>}
      </div>
    </div>
  );
}

// =============================================================================
// DialogCancelledState
// =============================================================================

/**
 * Props for DialogCancelledState component
 */
export interface DialogCancelledStateProps {
  /** Message to display */
  message?: string;
  /** Back to form handler */
  onBack: () => void;
  /** Close dialog handler */
  onClose: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays a cancelled state when user rejects wallet signature.
 *
 * @example
 * ```tsx
 * <DialogCancelledState
 *   onBack={handleBackToForm}
 *   onClose={handleClose}
 * />
 * ```
 */
export function DialogCancelledState({
  message = 'Transaction was cancelled.',
  onBack,
  onClose,
  className,
}: DialogCancelledStateProps): React.ReactElement {
  return (
    <div className={cn('flex flex-col gap-4 py-4', className)}>
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Transaction Cancelled</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
        <Button onClick={onBack}>Try Again</Button>
      </div>
    </div>
  );
}
