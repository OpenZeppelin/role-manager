/**
 * Authorized Accounts Page
 * Feature: 010-authorized-accounts-page
 *
 * UI skeleton for the Authorized Accounts page with mock data.
 * Displays a table of authorized accounts with filtering, selection, and action capabilities.
 *
 * User Story 1 (Phase 3):
 * - PageHeader with title, dynamic subtitle (contract/network), "Add Account or Role" button
 * - Loading state toggle for demo (useState)
 * - Filter bar UI shell (non-functional)
 * - Conditional render: loading skeleton vs empty state
 * - logger.info handlers for button clicks
 *
 * User Story 2 (Phase 4):
 * - Selection state management with useState<Set<string>>
 * - AccountsTable component with selection and actions
 * - Demo toggle: empty vs populated vs loading states
 * - logger.info handlers for all actions
 *
 * User Story 3 (Phase 5):
 * - Filter state management with useState<AccountsFilterState>
 * - AccountsFilterBar fully functional (search, status dropdown, roles dropdown)
 * - Filter interactions log changes via logger.info
 */

import { Plus, Users } from 'lucide-react';
import { useState } from 'react';

import { Button, Card } from '@openzeppelin/ui-builder-ui';
import { logger } from '@openzeppelin/ui-builder-utils';

import {
  AccountsFilterBar,
  AccountsLoadingSkeleton,
  AccountsTable,
  DEFAULT_FILTER_STATE,
  MOCK_ACCOUNTS,
  MOCK_AVAILABLE_ROLES,
  type AccountAction,
  type AccountsFilterState,
} from '../components/AuthorizedAccounts';
import { PageEmptyState } from '../components/Shared/PageEmptyState';
import { PageHeader } from '../components/Shared/PageHeader';

/**
 * Demo view states for showcasing different UI states
 */
type DemoViewState = 'empty' | 'populated' | 'loading';

/**
 * AuthorizedAccounts - Main page component
 *
 * Phase 5 implementation (User Story 3):
 * - Shows page header with contract info
 * - Demo toggle: switch between empty, populated, and loading states
 * - Selection state management for table rows
 * - Filter state management with fully functional filter bar
 * - All interactions (actions, selections, filters) log via logger
 */
export function AuthorizedAccounts() {
  // Demo toggle: switch between different view states
  const [demoView, setDemoView] = useState<DemoViewState>('populated');

  // Selection state for table rows (Phase 4)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter state (Phase 5 - User Story 3)
  const [filters, setFilters] = useState<AccountsFilterState>(DEFAULT_FILTER_STATE);

  // Derive displayed accounts based on demo view
  const accounts = demoView === 'populated' ? MOCK_ACCOUNTS : [];

  // Header button handler
  const handleAddAccountOrRole = () => {
    logger.info('AuthorizedAccounts', 'Add Account or Role clicked');
  };

  // Empty state CTA handler
  const handleGrantAuthorization = () => {
    logger.info('AuthorizedAccounts', 'Grant First Authorization clicked');
  };

  // Selection change handler (Phase 4)
  const handleSelectionChange = (newSelectedIds: Set<string>) => {
    setSelectedIds(newSelectedIds);
    logger.info('AuthorizedAccounts', `Selection changed: ${newSelectedIds.size} items selected`, {
      selectedIds: Array.from(newSelectedIds),
    });
  };

  // Action handler for table row actions (Phase 4)
  const handleAction = (accountId: string, action: AccountAction) => {
    const account = accounts.find((a) => a.id === accountId);
    logger.info('AuthorizedAccounts', `Action "${action}" triggered for account`, {
      accountId,
      address: account?.address,
      action,
    });
  };

  // Filter change handler (Phase 5 - User Story 3)
  const handleFiltersChange = (newFilters: AccountsFilterState) => {
    setFilters(newFilters);
    logger.info('AuthorizedAccounts', 'Filters changed', { filters: newFilters });
  };

  // Demo: Cycle through view states
  const handleCycleView = () => {
    const states: DemoViewState[] = ['empty', 'populated', 'loading'];
    const currentIndex = states.indexOf(demoView);
    const nextState = states[(currentIndex + 1) % states.length];
    setDemoView(nextState);
    // Clear selection when changing views
    setSelectedIds(new Set());
    logger.info('AuthorizedAccounts', `Demo view changed to: ${nextState}`);
  };

  // Get demo button label
  const getDemoButtonLabel = () => {
    switch (demoView) {
      case 'empty':
        return 'View: Empty → Populated';
      case 'populated':
        return 'View: Populated → Loading';
      case 'loading':
        return 'View: Loading → Empty';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Authorized Accounts"
        subtitle={
          <span>
            Manage accounts and roles for{' '}
            <span className="font-bold text-foreground">Demo Contract</span> on Ethereum
          </span>
        }
        actions={
          <div className="flex gap-2">
            {/* Demo toggle button (for development only) */}
            <Button variant="outline" size="sm" onClick={handleCycleView}>
              {getDemoButtonLabel()}
            </Button>
            {/* Primary action button */}
            <Button onClick={handleAddAccountOrRole}>
              <Plus className="mr-2 h-4 w-4" />
              Add Account or Role
            </Button>
          </div>
        }
      />

      {/* Conditional Content based on demo view */}
      {demoView === 'loading' ? (
        // Loading skeleton
        <AccountsLoadingSkeleton />
      ) : (
        // Unified card with filter bar + table
        <Card className="p-0 shadow-none overflow-hidden">
          {/* Filter Bar (Phase 5 - fully functional) */}
          <AccountsFilterBar
            filters={filters}
            availableRoles={MOCK_AVAILABLE_ROLES}
            onFiltersChange={handleFiltersChange}
          />

          {/* Accounts Table with selection (shows empty state when no accounts) */}
          <AccountsTable
            accounts={accounts}
            selectedIds={selectedIds}
            onSelectionChange={handleSelectionChange}
            onAction={handleAction}
            emptyState={
              <div className="py-16 px-4">
                <PageEmptyState
                  title="No accounts found"
                  description="No accounts have been authorized yet. Grant authorization to an account to get started."
                  icon={Users}
                  actionLabel="Grant First Authorization"
                  onAction={handleGrantAuthorization}
                />
              </div>
            }
          />
        </Card>
      )}
    </div>
  );
}
