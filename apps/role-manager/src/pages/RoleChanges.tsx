/**
 * Role Changes Page
 * Feature: 012-role-changes-data
 *
 * Displays role change history (grants, revokes, transfers) for selected contracts.
 * Implements User Story 1 from spec 012:
 * - US1: View chronological list of role changes
 *
 * Tasks: T009, T010
 */

import { ArrowRightLeft, FileSearch } from 'lucide-react';

import { Card } from '@openzeppelin/ui-builder-ui';

import { ChangesLoadingSkeleton, ChangesTable } from '../components/RoleChanges';
import { PageEmptyState } from '../components/Shared/PageEmptyState';
import { PageHeader } from '../components/Shared/PageHeader';
import { useRoleChangesPageData } from '../hooks/useRoleChangesPageData';
import { useSelectedContract } from '../hooks/useSelectedContract';

/**
 * RoleChanges - Main page component
 *
 * Phase 3 implementation (Feature 012):
 * - Uses useRoleChangesPageData hook for real data
 * - Shows loading skeleton during initial fetch
 * - Shows empty state for unsupported contracts or no history support
 * - Displays events in table format
 */
export function RoleChanges() {
  // Get real data from hook (T010)
  const {
    events,
    hasContractSelected,
    supportsHistory,
    isSupported,
    isLoading,
    hasError,
    errorMessage,
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

  // Error state display (basic - enhanced in Phase 4)
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
          <div className="py-16 px-4">
            <PageEmptyState
              title="Error Loading History"
              description={errorMessage || 'An unexpected error occurred while loading history.'}
              icon={ArrowRightLeft}
            />
          </div>
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

  // Empty state for unsupported contracts (no AccessControl/Ownable)
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
          <div className="py-16 px-4">
            <PageEmptyState
              title="Contract Not Supported"
              description="This contract does not implement AccessControl or Ownable interfaces."
              icon={ArrowRightLeft}
            />
          </div>
        </Card>
      </div>
    );
  }

  // Empty state when history is not available (supportsHistory: false)
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
          <div className="py-16 px-4">
            <PageEmptyState
              title="History Not Available"
              description="Role change history is not available for this contract. The indexer may not support this network or contract type."
              icon={ArrowRightLeft}
            />
          </div>
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

      {/* Main content card with table */}
      <Card className="p-0 shadow-none overflow-hidden">
        <ChangesTable
          events={events}
          emptyState={
            <div className="py-16 px-4">
              <PageEmptyState
                title="No Role Changes Found"
                description="No role changes have been recorded for this contract yet."
                icon={ArrowRightLeft}
              />
            </div>
          }
        />
      </Card>
    </div>
  );
}
