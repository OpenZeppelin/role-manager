import { Loader2 } from 'lucide-react';

import { cn } from '@openzeppelin/ui-utils';

export interface SelectLoadingPlaceholderProps {
  /** Text shown while select options load */
  label?: string;
  /** Optional wrapper width/spacing overrides */
  className?: string;
}

/**
 * Reusable loading placeholder for select controls.
 * Displays a muted pill with a spinner until options are ready.
 */
export function SelectLoadingPlaceholder({
  label = 'Loading…',
  className,
}: SelectLoadingPlaceholderProps) {
  return (
    <div className={cn('w-40', className)}>
      <div
        className="flex h-10 items-center justify-between rounded-md border border-border bg-muted/60 px-3 text-muted-foreground"
        aria-label={label}
        aria-busy="true"
      >
        <span className="text-sm">{label}</span>
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      </div>
    </div>
  );
}
