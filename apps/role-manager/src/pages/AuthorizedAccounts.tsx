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
 */

import { Plus, Users } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@openzeppelin/ui-builder-ui';
import { logger } from '@openzeppelin/ui-builder-utils';

import { AccountsLoadingSkeleton } from '../components/AuthorizedAccounts';
import { PageEmptyState } from '../components/Shared/PageEmptyState';
import { PageHeader } from '../components/Shared/PageHeader';

/**
 * AuthorizedAccounts - Main page component
 *
 * Phase 3 implementation (User Story 1):
 * - Shows page header with contract info
 * - Toggleable loading state for demo purposes
 * - Filter bar as disabled UI shell
 * - Empty state when no accounts exist
 */
export function AuthorizedAccounts() {
  // Demo toggle: switch between loading and empty states
  const [isLoading, setIsLoading] = useState(false);

  // Header button handler
  const handleAddAccountOrRole = () => {
    logger.info('AuthorizedAccounts', 'Add Account or Role clicked');
  };

  // Empty state CTA handler
  const handleGrantAuthorization = () => {
    logger.info('AuthorizedAccounts', 'Grant First Authorization clicked');
  };

  // Demo: Toggle loading state
  const handleToggleLoading = () => {
    setIsLoading((prev) => !prev);
    logger.info('AuthorizedAccounts', `Loading state toggled to: ${!isLoading}`);
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
            <Button variant="outline" size="sm" onClick={handleToggleLoading}>
              {isLoading ? 'Show Empty' : 'Show Loading'}
            </Button>
            {/* Primary action button */}
            <Button onClick={handleAddAccountOrRole}>
              <Plus className="mr-2 h-4 w-4" />
              Add Account or Role
            </Button>
          </div>
        }
      />

      {/* Conditional Content: Loading vs Empty State */}
      {isLoading ? (
        <AccountsLoadingSkeleton />
      ) : (
        /* Empty state - filter bar hidden when no accounts exist */
        <PageEmptyState
          title="No accounts found"
          description="No accounts have been authorized yet. Grant authorization to an account to get started."
          icon={Users}
          actionLabel="Grant First Authorization"
          onAction={handleGrantAuthorization}
        />
      )}
    </div>
  );
}
