/**
 * FadingOverlay Component
 *
 * Heavy blur overlay applied on top of an existing row to indicate
 * a pending confirmation (e.g. revoke, renounce, cancel, accept).
 * Content behind the overlay is barely visible — just a hint.
 *
 * Supports two visual variants:
 * - "destructive" (default): red tones — removals, cancellations
 * - "info": blue tones — positive/confirmation actions (e.g. accept transfer)
 *
 * Usage: wrap the target element's container with a relative div
 * and place FadingOverlay as a sibling.
 */
import { Loader2 } from 'lucide-react';

import { cn } from '@openzeppelin/ui-utils';

const VARIANT_STYLES = {
  destructive: {
    bg: 'bg-red-50/80',
    text: 'text-red-500/80',
  },
  info: {
    bg: 'bg-blue-50/80',
    text: 'text-blue-500/80',
  },
  warning: {
    bg: 'bg-amber-50/80',
    text: 'text-amber-500/80',
  },
} as const;

export type FadingOverlayVariant = keyof typeof VARIANT_STYLES;

export interface FadingOverlayProps {
  /** Visual variant — "destructive" (red) or "info" (blue) */
  variant?: FadingOverlayVariant;
  /** Label shown in the overlay (e.g. "Waiting for confirmation") */
  label?: string;
  className?: string;
}

export function FadingOverlay({
  variant = 'destructive',
  label = 'Waiting for confirmation',
  className,
}: FadingOverlayProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <>
      {/* Pulsing background layer — makes content behind gently fade */}
      <div
        className={cn(
          'absolute inset-0 z-10 [animation:overlay-breathe_2s_ease-in-out_infinite]',
          styles.bg,
          'backdrop-blur-[3px]',
          className
        )}
        aria-hidden="true"
      />

      {/* Static label layer — always crisp and readable */}
      <div
        className="absolute inset-0 z-20 flex items-center justify-center"
        role="status"
        aria-label={label}
      >
        <Loader2 className={cn('h-3 w-3 animate-spin mr-1.5', styles.text)} />
        <span className={cn('text-[10px] font-semibold uppercase tracking-wider', styles.text)}>
          {label}
        </span>
      </div>
    </>
  );
}
