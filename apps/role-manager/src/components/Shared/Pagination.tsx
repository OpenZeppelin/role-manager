/**
 * Pagination Component
 *
 * A reusable pagination control component for navigating through paginated data.
 * Designed to be portable to ui-builder-ui package in the future.
 *
 * Features:
 * - Displays "Showing X-Y of Z {itemLabel}" summary
 * - Shows "Page X of Y" indicator
 * - Previous/Next navigation buttons with disabled states
 * - Responsive layout (stacks on mobile)
 * - Accessible with aria-labels
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@openzeppelin/ui-builder-ui';
import { cn } from '@openzeppelin/ui-builder-utils';

/**
 * Pagination state interface - can be satisfied by any pagination hook
 */
export interface PaginationState {
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items across all pages */
  totalItems: number;
  /** Number of items per page */
  pageSize: number;
  /** Whether there is a next page available */
  hasNextPage: boolean;
  /** Whether there is a previous page available */
  hasPreviousPage: boolean;
}

/**
 * Props for Pagination component
 */
export interface PaginationProps {
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of items across all pages */
  totalItems: number;
  /** Number of items per page */
  pageSize: number;
  /** Whether there is a next page available */
  hasNextPage: boolean;
  /** Whether there is a previous page available */
  hasPreviousPage: boolean;
  /** Callback when next page is requested */
  onNextPage: () => void;
  /** Callback when previous page is requested */
  onPreviousPage: () => void;
  /** Label for items being paginated (e.g., "accounts", "roles", "items") */
  itemLabel?: string;
  /** Whether to show the "Showing X-Y of Z" summary */
  showSummary?: boolean;
  /** Whether to show the "Page X of Y" indicator */
  showPageIndicator?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Pagination - Reusable pagination controls
 *
 * A flexible pagination component that can be used with any paginated data source.
 *
 * @example
 * ```tsx
 * // With hook pagination state
 * const { pagination } = usePaginatedData();
 *
 * <Pagination
 *   currentPage={pagination.currentPage}
 *   totalPages={pagination.totalPages}
 *   totalItems={pagination.totalItems}
 *   pageSize={pagination.pageSize}
 *   hasNextPage={pagination.hasNextPage}
 *   hasPreviousPage={pagination.hasPreviousPage}
 *   onNextPage={pagination.nextPage}
 *   onPreviousPage={pagination.previousPage}
 *   itemLabel="accounts"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Minimal usage
 * <Pagination
 *   currentPage={1}
 *   totalPages={5}
 *   totalItems={50}
 *   pageSize={10}
 *   hasNextPage={true}
 *   hasPreviousPage={false}
 *   onNextPage={() => setPage(p => p + 1)}
 *   onPreviousPage={() => setPage(p => p - 1)}
 * />
 * ```
 */
export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  hasNextPage,
  hasPreviousPage,
  onNextPage,
  onPreviousPage,
  itemLabel = 'items',
  showSummary = true,
  showPageIndicator = true,
  className,
}: PaginationProps) {
  // Calculate display range
  const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t',
        className
      )}
      role="navigation"
      aria-label="Pagination"
    >
      {/* Summary text: "Showing X-Y of Z items" */}
      {showSummary && (
        <div className="text-sm text-muted-foreground">
          Showing{' '}
          <span className="font-medium text-foreground">
            {startItem}-{endItem}
          </span>{' '}
          of <span className="font-medium text-foreground">{totalItems}</span> {itemLabel}
        </div>
      )}

      {/* Navigation controls */}
      <div className="flex items-center gap-2">
        {/* Page indicator: "Page X of Y" */}
        {showPageIndicator && (
          <span className="text-sm text-muted-foreground">
            Page <span className="font-medium text-foreground">{currentPage}</span> of{' '}
            <span className="font-medium text-foreground">{totalPages}</span>
          </span>
        )}

        {/* Previous button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousPage}
          disabled={!hasPreviousPage}
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
          onClick={onNextPage}
          disabled={!hasNextPage}
          className="gap-1"
          aria-label="Go to next page"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
