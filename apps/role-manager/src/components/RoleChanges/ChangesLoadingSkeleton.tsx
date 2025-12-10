/**
 * ChangesLoadingSkeleton Component
 * Feature: 012-role-changes-data
 *
 * Loading skeleton UI for the Role Changes page.
 * Displays a skeleton matching the table layout with column headers.
 *
 * Tasks: T008
 */

import { Card } from '@openzeppelin/ui-builder-ui';
import { cn } from '@openzeppelin/ui-builder-utils';

import { Skeleton } from '../Shared/Skeleton';

/**
 * Props for ChangesLoadingSkeleton component
 */
export interface ChangesLoadingSkeletonProps {
  /** Number of skeleton rows to show in the table */
  rowCount?: number;
  /** Whether to wrap in a Card (default: true for standalone use) */
  withCard?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Single table row skeleton for role changes
 */
function TableRowSkeleton() {
  return (
    <tr className="border-b last:border-b-0">
      {/* Timestamp */}
      <td className="p-4">
        <Skeleton className="h-4 w-24" />
      </td>
      {/* Action badge */}
      <td className="p-4">
        <Skeleton className="h-5 w-16 rounded-full" />
      </td>
      {/* Role badge */}
      <td className="p-4">
        <Skeleton className="h-5 w-20 rounded-full" />
      </td>
      {/* Account */}
      <td className="p-4">
        <Skeleton className="h-4 w-40" />
      </td>
      {/* Transaction */}
      <td className="p-4">
        <Skeleton className="h-4 w-24" />
      </td>
    </tr>
  );
}

/**
 * ChangesLoadingSkeleton - Loading state for Role Changes page
 *
 * Displays a table skeleton matching the ChangesTable structure.
 */
export function ChangesLoadingSkeleton({
  rowCount = 5,
  withCard = true,
  className,
}: ChangesLoadingSkeletonProps) {
  const tableContent = (
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Table header */}
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="p-4 text-left w-36">
                <Skeleton className="h-4 w-16" />
              </th>
              <th className="p-4 text-left w-32">
                <Skeleton className="h-4 w-12" />
              </th>
              <th className="p-4 text-left w-40">
                <Skeleton className="h-4 w-10" />
              </th>
              <th className="p-4 text-left">
                <Skeleton className="h-4 w-16" />
              </th>
              <th className="p-4 text-left w-36">
                <Skeleton className="h-4 w-20" />
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
  );

  if (!withCard) {
    return (
      <div className={className} aria-busy="true" aria-label="Loading role changes">
        {tableContent}
      </div>
    );
  }

  return (
    <Card
      className={cn('p-0 shadow-none overflow-hidden', className)}
      aria-busy="true"
      aria-label="Loading role changes"
    >
      {tableContent}
    </Card>
  );
}
