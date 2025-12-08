/**
 * OutlineBadge Component
 *
 * Generic outline-styled badge for displaying tags, roles, or labels.
 * Uses gray outline styling with transparent background.
 */

import { cn } from '@openzeppelin/ui-builder-utils';

/**
 * Props for OutlineBadge component
 */
export interface OutlineBadgeProps {
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
 */
export function OutlineBadge({ children, className }: OutlineBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-gray-300 bg-transparent px-2 py-0.5 text-xs font-medium text-gray-700',
        className
      )}
    >
      {children}
    </span>
  );
}
