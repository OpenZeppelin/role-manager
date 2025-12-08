/**
 * StatusBadge Component
 *
 * Generic colored status badge for displaying status indicators.
 * Supports success (green), error (red), and warning (yellow) variants.
 */

import { cn } from '@openzeppelin/ui-builder-utils';

/**
 * Available status badge variants
 */
export type StatusBadgeVariant = 'success' | 'error' | 'warning' | 'info';

/**
 * Props for StatusBadge component
 */
export interface StatusBadgeProps {
  /** Visual variant determining the badge color */
  variant: StatusBadgeVariant;
  /** Text to display in the badge */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Maps variants to Tailwind background color classes
 */
const VARIANT_CLASSES: Record<StatusBadgeVariant, string> = {
  success: 'bg-green-500 text-white',
  error: 'bg-red-500 text-white',
  warning: 'bg-yellow-500 text-white',
  info: 'bg-blue-500 text-white',
};

/**
 * StatusBadge - Displays a colored status indicator badge
 *
 * @example
 * <StatusBadge variant="success">Active</StatusBadge>
 * <StatusBadge variant="error">Expired</StatusBadge>
 * <StatusBadge variant="warning">Pending</StatusBadge>
 */
export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
