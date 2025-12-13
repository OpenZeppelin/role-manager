/**
 * RoleListSkeleton Component
 * Feature: 014-role-grant-revoke (Phase 6: Error Handling)
 *
 * Skeleton loading state for role list display.
 *
 * Implements FR-034: "All dialogs MUST show skeleton loaders
 * while fetching role data on open."
 *
 * Key behaviors:
 * - Displays animated skeleton placeholders for role checkbox list
 * - Shows consistent number of skeleton items
 */

import { Skeleton } from './Skeleton';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for RoleListSkeleton component
 */
export interface RoleListSkeletonProps {
  /** Number of skeleton items to show (default: 3) */
  count?: number;
}

// =============================================================================
// Component
// =============================================================================

/**
 * RoleListSkeleton - Loading skeleton for role list
 *
 * Displays animated skeleton placeholders while role data is being fetched.
 * Shows checkbox + label layout to match the actual RoleCheckboxList component.
 *
 * @example
 * ```tsx
 * {isLoading ? <RoleListSkeleton count={4} /> : <RoleCheckboxList items={roleItems} />}
 * ```
 */
export function RoleListSkeleton({ count = 3 }: RoleListSkeletonProps) {
  return (
    <div className="space-y-3 rounded-md border border-border p-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          {/* Checkbox skeleton */}
          <Skeleton className="h-4 w-4 rounded" />
          {/* Label skeleton with varying widths for visual interest */}
          <Skeleton className={`h-4 ${getSkeletonWidth(index)}`} />
        </div>
      ))}
    </div>
  );
}

/**
 * Returns varying widths for skeleton items to look more natural
 */
function getSkeletonWidth(index: number): string {
  const widths = ['w-24', 'w-20', 'w-28', 'w-16', 'w-32'];
  return widths[index % widths.length];
}
