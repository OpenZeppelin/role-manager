/**
 * ChangesErrorState Component
 * Feature: 012-role-changes-data
 *
 * Error state displayed when data fetching fails for the
 * Role Changes page. Provides retry functionality when available.
 *
 * Task: T013
 */

import { AlertCircle, RefreshCw } from 'lucide-react';

import { Button } from '@openzeppelin/ui-builder-ui';

/**
 * Props for ChangesErrorState component
 */
export interface ChangesErrorStateProps {
  /** User-friendly error message to display */
  message: string;
  /** Whether the error can be recovered by retrying */
  canRetry: boolean;
  /** Callback when retry button is clicked */
  onRetry: () => void;
}

/**
 * ChangesErrorState - Error state with retry option
 *
 * Shows when data fetching fails (e.g., indexer unavailable, network error).
 * Provides a retry button when the error is recoverable.
 *
 * @param message - The error message to display
 * @param canRetry - Whether to show the retry button
 * @param onRetry - Callback for retry action
 */
export function ChangesErrorState({ message, canRetry, onRetry }: ChangesErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="flex flex-col items-center text-center max-w-md">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>

        <h3 className="text-lg font-semibold mb-2">Failed to Load History</h3>

        <p className="text-muted-foreground mb-6">{message}</p>

        {canRetry && (
          <Button onClick={onRetry} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}

