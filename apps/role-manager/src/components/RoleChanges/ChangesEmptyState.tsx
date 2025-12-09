/**
 * ChangesEmptyState Component
 * Feature: 012-role-changes-data
 *
 * Empty state displayed when:
 * 1. History is not supported for the contract (supportsHistory: false)
 * 2. No matching results when filters are applied (Phase 7)
 * 3. No role changes have been recorded yet (genuinely empty)
 * 4. Contract doesn't implement AccessControl/Ownable
 *
 * Task: T012
 */

import { ArrowRightLeft, FileSearch, FilterX } from 'lucide-react';

import { PageEmptyState } from '../Shared/PageEmptyState';

/**
 * Props for ChangesEmptyState component
 */
export interface ChangesEmptyStateProps {
  /** Whether history is not supported (vs just empty) */
  historyNotSupported?: boolean;
  /** Contract name for display */
  contractName?: string;
  /** Whether there are simply no events recorded (genuinely empty history) */
  noEventsFound?: boolean;
  /** Whether filters are applied but no results match (for Phase 7 - Filtering) */
  noMatchingResults?: boolean;
}

/**
 * ChangesEmptyState - Empty state for various scenarios
 *
 * Displays appropriate messaging based on the reason for empty state:
 * - History not supported: Indexer doesn't support this network/contract
 * - No matching results: Filters applied but no events match
 * - No events found: No role changes recorded yet (genuinely empty)
 * - Default: Contract doesn't support AccessControl/Ownable
 *
 * @param historyNotSupported - True when supportsHistory capability is false
 * @param contractName - Contract label for personalized messaging
 * @param noEventsFound - True when data loaded but no events exist (no filters)
 * @param noMatchingResults - True when filters are applied but no results match
 */
export function ChangesEmptyState({
  historyNotSupported = false,
  contractName,
  noEventsFound = false,
  noMatchingResults = false,
}: ChangesEmptyStateProps) {
  // History not supported by indexer
  if (historyNotSupported) {
    return (
      <div className="py-16 px-4">
        <PageEmptyState
          title="History Not Available"
          description={
            contractName
              ? `Role change history is not available for ${contractName}. The indexer may not support this network or contract type.`
              : 'Role change history is not available for this contract. The indexer may not support this network or contract type.'
          }
          icon={ArrowRightLeft}
        />
      </div>
    );
  }

  // No matching results (filters applied but no events match)
  if (noMatchingResults) {
    return (
      <div className="py-16 px-4">
        <PageEmptyState
          title="No Matching Events"
          description="No role changes match your current filters. Try adjusting the filter criteria or clear filters to see all events."
          icon={FilterX}
        />
      </div>
    );
  }

  // No events found (genuinely empty history, no filters applied)
  if (noEventsFound) {
    return (
      <div className="py-16 px-4">
        <PageEmptyState
          title="No Role Changes Found"
          description={
            contractName
              ? `No role changes have been recorded for ${contractName} yet.`
              : 'No role changes have been recorded for this contract yet.'
          }
          icon={FileSearch}
        />
      </div>
    );
  }

  // Default: Contract doesn't support AccessControl/Ownable
  return (
    <div className="py-16 px-4">
      <PageEmptyState
        title="Access Control Not Supported"
        description={
          contractName
            ? `${contractName} does not implement OpenZeppelin AccessControl or Ownable interfaces.`
            : 'This contract does not implement AccessControl or Ownable interfaces.'
        }
        icon={ArrowRightLeft}
      />
    </div>
  );
}
