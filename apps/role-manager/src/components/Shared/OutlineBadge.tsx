/**
 * OutlineBadge Component
 *
 * Generic outline-styled badge for displaying tags, roles, or labels.
 * Uses gray outline styling with transparent background.
 * Supports interactive usage (onClick, keyboard navigation).
 */

import { cn } from '@openzeppelin/ui-utils';

/**
 * Props for OutlineBadge component
 * Extends span element props to support interaction (onClick, role, tabIndex, etc.)
 */
export interface OutlineBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Content to display in the badge */
  children: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * OutlineBadge - Displays content with gray outline styling
 *
 * @example
 * <OutlineBadge>Admin</OutlineBadge>
 * <OutlineBadge>Minter</OutlineBadge>
 *
 * @example
 * // Clickable badge
 * <OutlineBadge onClick={() => console.log('clicked')} role="button">Click me</OutlineBadge>
 */
export function OutlineBadge({ children, className, ...props }: OutlineBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-gray-300 bg-transparent px-2 py-0.5 text-xs font-medium text-gray-700',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
