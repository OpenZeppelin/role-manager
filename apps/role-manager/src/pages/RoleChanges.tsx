/**
 * Role Changes Page
 * Feature: 012-role-changes-data
 *
 * Displays role change history (grants, revokes, transfers) for selected contracts.
 * Implements User Stories from spec 012:
 * - US1: View chronological list of role changes
 * - US3: Navigate through paginated history (cursor-based)
 * - US6: Handle contracts without history support (error/empty states)
 *
 * Tasks: T009, T010, T014, T015, T022
 */

import { FileSearch } from 'lucide-react';

import { Card } from '@openzeppelin/ui-builder-ui';

import {
  ChangesEmptyState,
  ChangesErrorState,
  ChangesFilterBar,
  ChangesLoadingSkeleton,
  ChangesTable,
  CursorPagination,
} from '../components/RoleChanges';
import { PageEmptyState } from '../components/Shared/PageEmptyState';
import { PageHeader } from '../components/Shared/PageHeader';
import { useRoleChangesPageData } from '../hooks/useRoleChangesPageData';
import { useSelectedContract } from '../hooks/useSelectedContract';

/**
 * RoleChanges - Main page component
 *
 * Phase 3 & 4 implementation (Feature 012):
 * - Uses useRoleChangesPageData hook for real data
 * - Shows loading skeleton during initial fetch
 * - Shows empty state for unsupported contracts or no history support (US6)
 * - Shows error state with retry for fetch failures (US6)
 * - Displays events in table format
 */
export function RoleChanges() {
  // Get real data from hook (T010, T022, T028)
  const {
    events,
    availableRoles,
    availableRolesLoading,
    filters,
    setFilters,
    pagination,
    hasContractSelected,
    supportsHistory,
    isSupported,
    isLoading,
    hasError,
    errorMessage,
    canRetry,
    refetch,
  } = useRoleChangesPageData();

  // Get contract info for display
  const { selectedContract } = useSelectedContract();
  const contractLabel = selectedContract?.label || 'Unknown Contract';

  // Loading skeleton display during initial fetch
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader
          title="Role Changes"
          subtitle={
            <span>
              Loading history for <span className="font-bold text-foreground">{contractLabel}</span>
            </span>
          }
        />
        <ChangesLoadingSkeleton />
      </div>
    );
  }

  // Error state with retry option (T015 - US6)
  if (hasError) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader
          title="Role Changes"
          subtitle={
            <span>
              Error loading <span className="font-bold text-foreground">{contractLabel}</span>
            </span>
          }
        />
        <Card className="p-0 shadow-none overflow-hidden">
          <ChangesErrorState
            message={errorMessage || 'An unexpected error occurred while loading history.'}
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
        <PageHeader title="Role Changes" subtitle="Select a contract to view role change history" />
        <Card className="p-0 shadow-none overflow-hidden">
          <div className="py-16 px-4">
            <PageEmptyState
              title="No Contract Selected"
              description="Select a contract from the dropdown above to view its role change history."
              icon={FileSearch}
            />
          </div>
        </Card>
      </div>
    );
  }

  // Empty state for unsupported contracts (no AccessControl/Ownable) (T014 - US6)
  if (!isSupported) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader
          title="Role Changes"
          subtitle={
            <span>
              <span className="font-bold text-foreground">{contractLabel}</span> is not supported
            </span>
          }
        />
        <Card className="p-0 shadow-none overflow-hidden">
          <ChangesEmptyState contractName={contractLabel} />
        </Card>
      </div>
    );
  }

  // Empty state when history is not available (supportsHistory: false) (T014 - US6)
  if (!supportsHistory) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader
          title="Role Changes"
          subtitle={
            <span>
              History not available for{' '}
              <span className="font-bold text-foreground">{contractLabel}</span>
            </span>
          }
        />
        <Card className="p-0 shadow-none overflow-hidden">
          <ChangesEmptyState historyNotSupported contractName={contractLabel} />
        </Card>
      </div>
    );
  }

  // Main content with real data
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Role Changes"
        subtitle={
          <span>
            View role change history for{' '}
            <span className="font-bold text-foreground">{contractLabel}</span>
          </span>
        }
      />

      {/* Main content card with filters and table */}
      <Card className="p-0 shadow-none overflow-hidden">
        {/* Filter bar (T028 - US4) */}
        <ChangesFilterBar
          filters={filters}
          availableRoles={availableRoles}
          availableRolesLoading={availableRolesLoading}
          onFiltersChange={setFilters}
        />
        <ChangesTable
          events={events}
          emptyState={<ChangesEmptyState noEventsFound contractName={contractLabel} />}
        />
        {/* Cursor-based pagination (T022 - US3) */}
        <CursorPagination pagination={pagination} />
      </Card>
    </div>
  );
}
