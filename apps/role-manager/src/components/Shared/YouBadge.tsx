/**
 * YouBadge Component
 *
 * Badge indicating the connected user's own account/address.
 * Uses blue outline styling to visually distinguish from other badges.
 */

import { cn } from '@openzeppelin/ui-utils';

/**
 * Props for YouBadge component
 */
export interface YouBadgeProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * YouBadge - Displays "You" indicator for connected wallet addresses
 *
 * @example
 * <YouBadge />
 * <YouBadge className="ml-2" />
 */
export function YouBadge({ className }: YouBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        'bg-blue-50 text-blue-700 border-blue-300',
        className
      )}
      aria-label="This is your account"
    >
      You
    </span>
  );
}
