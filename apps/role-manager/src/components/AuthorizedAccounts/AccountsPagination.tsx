/**
 * AccountsPagination Component
 * Feature: 011-accounts-real-data
 *
 * Pagination controls for the Authorized Accounts table.
 * User Story 4 (Phase 5): Paginated accounts view for contracts with many accounts.
 *
 * Tasks: T057
 *
 * This is a thin wrapper around the shared Pagination component,
 * providing "accounts" as the default item label.
 */

import type { PaginationControls } from '../../hooks/useAuthorizedAccountsPageData';
import { Pagination } from '../Shared/Pagination';

/**
 * Props for AccountsPagination component
 */
export interface AccountsPaginationProps {
  /** Pagination controls from useAuthorizedAccountsPageData hook */
  pagination: PaginationControls;
  /** Additional CSS classes */
  className?: string;
}

/**
 * AccountsPagination - Pagination controls for Authorized Accounts table
 *
 * Thin wrapper around the shared Pagination component with "accounts" as the item label.
 *
 * @param pagination - Pagination state and controls from hook
 * @param className - Additional CSS classes
 */
export function AccountsPagination({ pagination, className }: AccountsPaginationProps) {
  return (
    <Pagination
      currentPage={pagination.currentPage}
      totalPages={pagination.totalPages}
      totalItems={pagination.totalItems}
      pageSize={pagination.pageSize}
      hasNextPage={pagination.hasNextPage}
      hasPreviousPage={pagination.hasPreviousPage}
      onNextPage={pagination.nextPage}
      onPreviousPage={pagination.previousPage}
      itemLabel="accounts"
      className={className}
    />
  );
}
