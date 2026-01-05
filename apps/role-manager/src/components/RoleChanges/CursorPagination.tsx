/**
 * CursorPagination Component
 * Feature: 012-role-changes-data
 *
 * A cursor-based pagination component for navigating through paginated data
 * without page numbers. Designed for APIs that use cursor-based pagination
 * (hasNextPage, endCursor) instead of offset-based pagination.
 *
 * Unlike the standard Pagination component, this component:
 * - Does NOT show "Showing X-Y of Z" (no total count available)
 * - Does NOT show "Page X of Y" (no page numbers with cursors)
 * - Only shows Previous/Next buttons with disabled states
 *
 * Task: T020
 */

import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

import { Button } from '@openzeppelin/ui-components';
import { cn } from '@openzeppelin/ui-utils';

import type { CursorPaginationControls } from '../../types/role-changes';

/**
 * Props for CursorPagination component
 */
export interface CursorPaginationProps {
  /** Pagination controls from useRoleChangesPageData hook */
  pagination: CursorPaginationControls;
  /** Additional CSS classes */
  className?: string;
}

/**
 * CursorPagination - Cursor-based pagination controls
 *
 * A simple pagination component for cursor-based APIs that don't expose
 * total counts or page numbers. Shows only Previous/Next buttons.
 *
 * @example
 * ```tsx
 * const { pagination } = useRoleChangesPageData();
 *
 * // Only render when there are pages to navigate
 * {(pagination.hasNextPage || pagination.hasPrevPage) && (
 *   <CursorPagination pagination={pagination} />
 * )}
 * ```
 */
export function CursorPagination({ pagination, className }: CursorPaginationProps) {
  const { hasNextPage, hasPrevPage, nextPage, prevPage, isLoading } = pagination;

  // Don't render if there's only one page (no navigation needed)
  if (!hasNextPage && !hasPrevPage) {
    return null;
  }

  return (
    <div
      className={cn('flex items-center justify-end gap-2 px-4 py-3 border-t', className)}
      role="navigation"
      aria-label="Pagination"
    >
      {/* Loading indicator */}
      {isLoading && (
        <span className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </span>
      )}

      {/* Previous button */}
      <Button
        variant="outline"
        size="sm"
        onClick={prevPage}
        disabled={!hasPrevPage || isLoading}
        className="gap-1"
        aria-label="Go to previous page"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>

      {/* Next button */}
      <Button
        variant="outline"
        size="sm"
        onClick={nextPage}
        disabled={!hasNextPage || isLoading}
        className="gap-1"
        aria-label="Go to next page"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
