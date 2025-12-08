/**
 * AccountsLoadingSkeleton Component
 * Feature: 010-authorized-accounts-page
 *
 * Loading skeleton UI for the Authorized Accounts page.
 * Displays a skeleton matching the unified card layout with filter bar + table.
 *
 * Loading Skeleton Requirements (from spec):
 * - Matches table structure: header row + 4 data row skeletons
 * - Each row skeleton includes: checkbox placeholder, address (w-48), status badge (w-16),
 *   dates (w-24 each), roles (w-32), actions (w-8)
 * - Uses shimmer animation via animate-pulse class
 */

import { Card } from '@openzeppelin/ui-builder-ui';
import { cn } from '@openzeppelin/ui-builder-utils';

import { Skeleton } from '../Shared/Skeleton';

/**
 * Props for AccountsLoadingSkeleton component
 */
export interface AccountsLoadingSkeletonProps {
  /** Number of skeleton rows to show in the table */
  rowCount?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Single table row skeleton
 */
function TableRowSkeleton() {
  return (
    <tr className="border-b last:border-b-0">
      {/* Checkbox */}
      <td className="p-4">
        <Skeleton className="h-4 w-4" />
      </td>
      {/* Address */}
      <td className="p-4">
        <Skeleton className="h-4 w-48" />
      </td>
      {/* Status badge */}
      <td className="p-4">
        <Skeleton className="h-5 w-16 rounded-full" />
      </td>
      {/* Date Added */}
      <td className="p-4">
        <Skeleton className="h-4 w-24" />
      </td>
      {/* Expires */}
      <td className="p-4">
        <Skeleton className="h-4 w-24" />
      </td>
      {/* Roles */}
      <td className="p-4">
        <div className="flex gap-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </td>
      {/* Actions */}
      <td className="p-4">
        <Skeleton className="h-8 w-8 rounded" />
      </td>
    </tr>
  );
}

/**
 * AccountsLoadingSkeleton - Loading state for Authorized Accounts page
 *
 * Displays a unified card with filter bar skeleton + table skeleton.
 */
export function AccountsLoadingSkeleton({ rowCount = 4, className }: AccountsLoadingSkeletonProps) {
  return (
    <Card
      className={cn('p-0 shadow-none overflow-hidden', className)}
      aria-busy="true"
      aria-label="Loading authorized accounts"
    >
      {/* Filter bar skeleton */}
      <div className="flex flex-col sm:flex-row gap-4 p-4">
        {/* Search input skeleton */}
        <Skeleton className="h-10 flex-1 max-w-sm" />

        {/* Dropdown filters skeleton */}
        <div className="flex gap-2 sm:ml-auto">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Table header */}
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="p-4 text-left w-12">
                <Skeleton className="h-4 w-4" />
              </th>
              <th className="p-4 text-left">
                <Skeleton className="h-4 w-16" />
              </th>
              <th className="p-4 text-left w-24">
                <Skeleton className="h-4 w-12" />
              </th>
              <th className="p-4 text-left w-32">
                <Skeleton className="h-4 w-20" />
              </th>
              <th className="p-4 text-left w-32">
                <Skeleton className="h-4 w-16" />
              </th>
              <th className="p-4 text-left w-48">
                <Skeleton className="h-4 w-12" />
              </th>
              <th className="p-4 text-left w-16">
                <Skeleton className="h-4 w-14" />
              </th>
            </tr>
          </thead>
          {/* Table body */}
          <tbody>
            {Array.from({ length: rowCount }).map((_, index) => (
              <TableRowSkeleton key={index} />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
