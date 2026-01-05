/**
 * DialogErrorState Component
 *
 * Displays an error state with message and action buttons.
 * Used for schema loading failures and validation errors.
 */

import { AlertCircle } from 'lucide-react';

import { Button } from '@openzeppelin/ui-components';

interface DialogErrorStateProps {
  /**
   * Error title
   */
  title: string;

  /**
   * Error message to display
   */
  message: string;

  /**
   * Help text shown below the error
   */
  helpText?: string;

  /**
   * Callback when cancel button is clicked
   */
  onCancel: () => void;

  /**
   * Callback when retry button is clicked
   */
  onRetry: () => void;

  /**
   * Custom label for retry button
   * @default 'Try Again'
   */
  retryLabel?: string;
}

/**
 * Displays an error state with formatted error message and action buttons
 */
export function DialogErrorState({
  title,
  message,
  helpText,
  onCancel,
  onRetry,
  retryLabel = 'Try Again',
}: DialogErrorStateProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div className="flex-1">
          <p className="font-medium text-destructive">{title}</p>
          <p className="mt-1 text-sm text-destructive/80">{message}</p>
        </div>
      </div>

      {helpText && <p className="text-sm text-muted-foreground">{helpText}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onRetry}>{retryLabel}</Button>
      </div>
    </div>
  );
}
