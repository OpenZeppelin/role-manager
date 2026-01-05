/**
 * RolesErrorState Component
 * Feature: 009-roles-page-data
 *
 * Error state UI for the Roles page with retry capability.
 *
 * Implements FR-020: Display error states when data fetching fails.
 */
import { AlertCircle, RefreshCw } from 'lucide-react';

import { Button, Card } from '@openzeppelin/ui-components';
import { cn } from '@openzeppelin/ui-utils';

/**
 * Props for RolesErrorState component
 */
export interface RolesErrorStateProps {
  /** Error message to display */
  message: string;
  /** Whether retry is available */
  canRetry: boolean;
  /** Retry handler */
  onRetry: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * RolesErrorState - Error state with retry for Roles page
 *
 * Displays a user-friendly error message with an optional retry button.
 * Follows the design system error patterns.
 */
export function RolesErrorState({ message, canRetry, onRetry, className }: RolesErrorStateProps) {
  return (
    <div className={cn('space-y-6 p-6', className)}>
      <Card className="py-0 overflow-hidden shadow-none">
        <div
          className="flex flex-col items-center justify-center py-16 px-6 text-center"
          role="alert"
          aria-live="assertive"
        >
          {/* Error icon */}
          <div className="rounded-full bg-destructive/10 p-3 mb-4">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>

          {/* Error title */}
          <h3 className="text-lg font-semibold text-foreground mb-2">Unable to load roles</h3>

          {/* Error message */}
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            {message || 'An error occurred while loading role data. Please try again.'}
          </p>

          {/* Retry button */}
          {canRetry && (
            <Button onClick={onRetry} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
