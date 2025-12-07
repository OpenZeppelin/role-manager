/**
 * Skeleton Component
 * Shared loading placeholder component.
 *
 * Provides visual feedback during async operations by displaying
 * animated placeholder shapes that match the content layout.
 *
 * TODO: Move this primitive component to @openzeppelin/ui-builder-ui package
 * for broader reuse across all UI Builder apps. This would allow consistent
 * loading states across the ecosystem.
 */
import { cn } from '@openzeppelin/ui-builder-utils';

/**
 * Props for Skeleton component
 */
export interface SkeletonProps {
  /** Additional CSS classes for customizing size, shape, etc. */
  className?: string;
}

/**
 * Skeleton - Animated loading placeholder
 *
 * A simple pulse-animated placeholder block used to indicate loading state.
 * Use className to control dimensions and shape (e.g., rounded-full for avatars).
 *
 * @example
 * ```tsx
 * // Text line skeleton
 * <Skeleton className="h-4 w-32" />
 *
 * // Avatar skeleton
 * <Skeleton className="h-10 w-10 rounded-full" />
 *
 * // Card skeleton
 * <Skeleton className="h-24 w-full rounded-lg" />
 *
 * // Multiple lines
 * <div className="space-y-2">
 *   <Skeleton className="h-4 w-full" />
 *   <Skeleton className="h-4 w-3/4" />
 *   <Skeleton className="h-4 w-1/2" />
 * </div>
 * ```
 */
export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} aria-hidden="true" />;
}
