/**
 * Authorized Accounts Page
 * Feature: 010-authorized-accounts-page
 * Updated by: 011-accounts-real-data
 * Updated by: 014-role-grant-revoke (ManageRolesDialog integration)
 *
 * Displays authorized accounts with real blockchain data.
 * Implements User Stories 1, 2, 6 from spec 011:
 * - US1: View real authorized accounts
 * - US2: Auto-load on contract selection
 * - US6: Error/empty states for unsupported contracts
 *
 * Tasks: T040-T045, T027
 */

import { FileSearch, RefreshCw, Users } from 'lucide-react';
import { useState } from 'react';

import { Button, Card } from '@openzeppelin/ui-builder-ui';
import { cn, logger } from '@openzeppelin/ui-builder-utils';

import {
  AccountsEmptyState,
  AccountsErrorState,
  AccountsFilterBar,
  AccountsLoadingSkeleton,
  AccountsPagination,
  AccountsTable,
  ManageRolesDialog,
  type AccountAction,
} from '../components/AuthorizedAccounts';
import { PageEmptyState } from '../components/Shared/PageEmptyState';
import { PageHeader } from '../components/Shared/PageHeader';
import { useAuthorizedAccountsPageData } from '../hooks';
import { useSelectedContract } from '../hooks/useSelectedContract';

/**
 * AuthorizedAccounts - Main page component
 *
 * Phase 3 implementation (Feature 011):
 * - Uses useAuthorizedAccountsPageData hook for real data
 * - Shows loading skeleton during initial fetch
 * - Shows error state with retry option
 * - Shows empty state for unsupported contracts
 * - Selection and actions log to console (placeholder behavior)
 */
export function AuthorizedAccounts() {
  // Get real data from hook (T040)
  const {
    paginatedAccounts,
    availableRoles,
    filters,
    setFilters,
    pagination,
    hasContractSelected,
    isSupported,
    isLoading,
    isRefreshing,
    hasError,
    errorMessage,
    canRetry,
    refetch,
    connectedAddress,
  } = useAuthorizedAccountsPageData();

  // T060: Determine if pagination controls should be visible
  const showPagination = pagination.totalItems > pagination.pageSize;

  // Get contract info for display
  const { selectedContract } = useSelectedContract();
  const contractLabel = selectedContract?.label || 'Unknown Contract';

  // Selection state for table rows (placeholder behavior - T069)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // T027: State for ManageRolesDialog (Feature 014)
  const [manageRolesAccount, setManageRolesAccount] = useState<string | null>(null);

  // Selection change handler (logs to console per T069)
  const handleSelectionChange = (newSelectedIds: Set<string>) => {
    setSelectedIds(newSelectedIds);
    logger.info('AuthorizedAccounts', `Selection changed: ${newSelectedIds.size} items selected`, {
      selectedIds: Array.from(newSelectedIds),
    });
  };

  // Action handler for table row actions (T027: handle 'edit-roles' action)
  const handleAction = (accountId: string, action: AccountAction) => {
    const account = paginatedAccounts.find((a) => a.id === accountId);
    logger.info('AuthorizedAccounts', `Action "${action}" triggered for account`, {
      accountId,
      address: account?.address,
      action,
    });

    // T027: Open ManageRolesDialog when 'edit-roles' action is triggered
    if (action === 'edit-roles' && account) {
      setManageRolesAccount(account.address);
    }
  };

  // Filter change handler
  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    logger.info('AuthorizedAccounts', 'Filters changed', { filters: newFilters });
  };

  // T041: Loading skeleton display during initial fetch
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader
          title="Authorized Accounts"
          subtitle={
            <span>
              Loading accounts for{' '}
              <span className="font-bold text-foreground">{contractLabel}</span>
            </span>
          }
        />
        <AccountsLoadingSkeleton />
      </div>
    );
  }

  // T042: Error state display with retry action
  if (hasError) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader
          title="Authorized Accounts"
          subtitle={
            <span>
              Error loading <span className="font-bold text-foreground">{contractLabel}</span>
            </span>
          }
        />
        <Card className="p-0 shadow-none overflow-hidden">
          <AccountsErrorState
            message={errorMessage || 'An unexpected error occurred while loading accounts.'}
            canRetry={canRetry}
            onRetry={refetch}
          />
        </Card>
      </div>
    );
  }

  // Empty state when no contract is selected
  if (!hasContractSelected) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader
          title="Authorized Accounts"
          subtitle="Select a contract to view authorized accounts"
        />
        <Card className="p-0 shadow-none overflow-hidden">
          <div className="py-16 px-4">
            <PageEmptyState
              title="No Contract Selected"
              description="Select a contract from the dropdown above to view its authorized accounts and role assignments."
              icon={FileSearch}
            />
          </div>
        </Card>
      </div>
    );
  }

  // T043: Empty state display for unsupported contracts
  if (!isSupported) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader
          title="Authorized Accounts"
          subtitle={
            <span>
              <span className="font-bold text-foreground">{contractLabel}</span> is not supported
            </span>
          }
        />
        <Card className="p-0 shadow-none overflow-hidden">
          <AccountsEmptyState contractName={contractLabel} />
        </Card>
      </div>
    );
  }

  // Main content with real data
  return (
    <div className="p-6 space-y-6">
      {/* Page Header - T045: "Add Account or Role" button hidden (view-only scope) */}
      <PageHeader
        title="Authorized Accounts"
        subtitle={
          <span>
            Manage accounts and roles for{' '}
            <span className="font-bold text-foreground">{contractLabel}</span>
          </span>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        }
      />

      {/* Main content card with filter bar + table */}
      <Card className="p-0 shadow-none overflow-hidden">
        {/* Filter Bar - wired to real availableRoles */}
        <AccountsFilterBar
          filters={filters}
          availableRoles={availableRoles}
          onFiltersChange={handleFiltersChange}
        />

        {/* Accounts Table with real data */}
        <AccountsTable
          accounts={paginatedAccounts}
          selectedIds={selectedIds}
          connectedAddress={connectedAddress}
          onSelectionChange={handleSelectionChange}
          onAction={handleAction}
          emptyState={
            <div className="py-16 px-4">
              <PageEmptyState
                title="No matching accounts found"
                description="Try adjusting your search or filter criteria."
                icon={Users}
              />
            </div>
          }
        />

        {/* T059/T060: Pagination controls (only shown when totalItems > pageSize) */}
        {showPagination && <AccountsPagination pagination={pagination} />}
      </Card>

      {/* T027: ManageRolesDialog (Feature 014) */}
      {/* Note: onSuccess callback removed - query invalidation in mutations handles data refresh */}
      <ManageRolesDialog
        open={!!manageRolesAccount}
        onOpenChange={(open) => !open && setManageRolesAccount(null)}
        accountAddress={manageRolesAccount ?? ''}
      />
    </div>
  );
}
