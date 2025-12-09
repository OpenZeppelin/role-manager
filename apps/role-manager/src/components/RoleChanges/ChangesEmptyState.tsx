/**
 * ChangesEmptyState Component
 * Feature: 012-role-changes-data
 *
 * Empty state displayed when:
 * 1. History is not supported for the contract (supportsHistory: false)
 * 2. No role changes have been recorded yet
 * 3. Contract doesn't implement AccessControl/Ownable
 *
 * Task: T012
 */

import { ArrowRightLeft, FileSearch } from 'lucide-react';

import { PageEmptyState } from '../Shared/PageEmptyState';

/**
 * Props for ChangesEmptyState component
 */
export interface ChangesEmptyStateProps {
  /** Whether history is not supported (vs just empty) */
  historyNotSupported?: boolean;
  /** Contract name for display */
  contractName?: string;
  /** Whether there are simply no events (filters may be applied) */
  noEventsFound?: boolean;
}

/**
 * ChangesEmptyState - Empty state for various scenarios
 *
 * Displays appropriate messaging based on the reason for empty state:
 * - History not supported: Indexer doesn't support this network/contract
 * - No events found: No role changes recorded yet
 * - Default: Contract doesn't support AccessControl/Ownable
 *
 * @param historyNotSupported - True when supportsHistory capability is false
 * @param contractName - Contract label for personalized messaging
 * @param noEventsFound - True when data loaded but no events exist
 */
export function ChangesEmptyState({
  historyNotSupported = false,
  contractName,
  noEventsFound = false,
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

  // No events found (data loaded but empty)
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

