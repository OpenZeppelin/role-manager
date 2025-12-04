/**
 * DialogLoadingState Component
 *
 * Reusable loading spinner with title and description.
 * Used for loading-schema and validating steps.
 */

import { Loader2 } from 'lucide-react';

interface DialogLoadingStateProps {
  /**
   * Main loading title
   */
  title: string;

  /**
   * Optional description text
   */
  description?: string;
}

/**
 * Displays a centered loading spinner with title and optional description
 */
export function DialogLoadingState({
  title,
  description,
}: DialogLoadingStateProps): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <div className="text-center">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}
