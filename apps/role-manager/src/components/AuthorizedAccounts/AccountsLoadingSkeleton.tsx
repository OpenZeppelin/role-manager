/**
 * AccountsLoadingSkeleton Component
 * Feature: 010-authorized-accounts-page
 *
 * Loading skeleton UI for the Authorized Accounts page.
 * Displays a skeleton matching the filter bar + table layout.
 *
 * Loading Skeleton Requirements (from spec):
 * - Matches table structure: header row + 4 data row skeletons
 * - Each row skeleton includes: checkbox placeholder, address (w-48), status badge (w-16),
 *   dates (w-24 each), roles (w-32), actions (w-8)
 * - Uses shimmer animation via animate-pulse class
 */

import { Card } from '@openzeppelin/ui-builder-ui';
import { cn } from '@openzeppelin/ui-builder-utils';

import type { AccountsLoadingSkeletonProps } from '../../types/authorized-accounts';
import { Skeleton } from '../Shared/Skeleton';

/**
 * Filter bar skeleton component
 */
function FilterBarSkeleton() {
  return (
    <Card className="shadow-none">
      <div className="flex flex-col sm:flex-row gap-4 p-4">
        {/* Search input skeleton */}
        <Skeleton className="h-10 flex-1 max-w-sm" />

        {/* Dropdown filters skeleton */}
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </Card>
  );
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
        <Skeleton className="h-8 w-8" />
      </td>
    </tr>
  );
}

/**
 * Table skeleton with header and rows
 */
function TableSkeleton({ rowCount }: { rowCount: number }) {
  return (
    <Card className="shadow-none overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Table header */}
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="p-4 text-left">
                <Skeleton className="h-4 w-4" />
              </th>
              <th className="p-4 text-left">
                <Skeleton className="h-4 w-16" />
              </th>
              <th className="p-4 text-left">
                <Skeleton className="h-4 w-12" />
              </th>
              <th className="p-4 text-left">
                <Skeleton className="h-4 w-20" />
              </th>
              <th className="p-4 text-left">
                <Skeleton className="h-4 w-16" />
              </th>
              <th className="p-4 text-left">
                <Skeleton className="h-4 w-12" />
              </th>
              <th className="p-4 text-left">
                <Skeleton className="h-4 w-16" />
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

/**
 * AccountsLoadingSkeleton - Loading state for Authorized Accounts page
 *
 * Displays skeleton placeholders matching the filter bar + table layout.
 */
export function AccountsLoadingSkeleton({ rowCount = 4, className }: AccountsLoadingSkeletonProps) {
  return (
    <div
      className={cn('space-y-4', className)}
      aria-busy="true"
      aria-label="Loading authorized accounts"
    >
      {/* Filter bar skeleton */}
      <FilterBarSkeleton />

      {/* Table skeleton */}
      <TableSkeleton rowCount={rowCount} />
    </div>
  );
}
