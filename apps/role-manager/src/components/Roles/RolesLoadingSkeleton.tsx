/**
 * RolesLoadingSkeleton Component
 * Feature: 009-roles-page-data
 *
 * Loading skeleton UI for the Roles page.
 * Displays a skeleton matching the roles list + details panel layout.
 *
 * Implements FR-019: Display loading skeletons during initial data load.
 */
import { Card } from '@openzeppelin/ui-components';
import { cn } from '@openzeppelin/ui-utils';

import { Skeleton } from '../Shared/Skeleton';

/**
 * Props for RolesLoadingSkeleton component
 */
export interface RolesLoadingSkeletonProps {
  /** Number of skeleton cards to show in the list */
  cardCount?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Single role card skeleton
 */
function RoleCardSkeleton() {
  return (
    <div className="p-3 rounded-lg border border-gray-200">
      {/* Header: icon + name + badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      {/* Member count */}
      <div className="flex items-center gap-2 mt-2">
        <Skeleton className="h-3 w-16" />
      </div>
      {/* Description */}
      <Skeleton className="h-3 w-full mt-2" />
      <Skeleton className="h-3 w-3/4 mt-1" />
    </div>
  );
}

/**
 * Account row skeleton for details panel
 */
function AccountRowSkeleton() {
  return (
    <div className="p-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-5 w-10 rounded-full" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-16 rounded-md" />
      </div>
    </div>
  );
}

/**
 * RolesLoadingSkeleton - Loading state for Roles page
 *
 * Displays skeleton cards matching the list-detail layout.
 */
export function RolesLoadingSkeleton({ cardCount = 4, className }: RolesLoadingSkeletonProps) {
  return (
    <div className={cn('space-y-6 p-6', className)} aria-busy="true" aria-label="Loading roles">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Main card with list-detail layout */}
      <Card className="py-0 overflow-hidden shadow-none">
        <div className="flex flex-col lg:flex-row">
          {/* Left: Roles List skeleton */}
          <div className="lg:w-2/5 p-6 border-r space-y-2">
            {Array.from({ length: cardCount }).map((_, index) => (
              <RoleCardSkeleton key={index} />
            ))}
          </div>

          {/* Right: Details panel skeleton */}
          <div className="lg:flex-1 py-6 px-6">
            {/* Role header */}
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full max-w-md" />
            </div>

            {/* Assigned Accounts section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
              <div className="border rounded-lg divide-y">
                {Array.from({ length: 3 }).map((_, index) => (
                  <AccountRowSkeleton key={index} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Role identifiers table skeleton */}
      <Card className="p-6 shadow-none">
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
