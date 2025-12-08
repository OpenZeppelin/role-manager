/**
 * AccountsEmptyState Component
 * Feature: 011-accounts-real-data
 *
 * Empty state displayed when a contract does not implement
 * OpenZeppelin AccessControl or Ownable interfaces.
 *
 * Task: T033
 */

import { Shield } from 'lucide-react';

import { PageEmptyState } from '../Shared/PageEmptyState';

/**
 * Props for AccountsEmptyState component
 */
export interface AccountsEmptyStateProps {
  /** Contract name/label for display */
  contractName: string;
}

/**
 * AccountsEmptyState - Empty state for unsupported contracts
 *
 * Shows when the selected contract doesn't implement AccessControl/Ownable.
 *
 * @param contractName - The name of the contract to display in the message
 */
export function AccountsEmptyState({ contractName }: AccountsEmptyStateProps) {
  return (
    <div className="py-16 px-4">
      <PageEmptyState
        title="Access Control Not Supported"
        description={`${contractName} does not implement OpenZeppelin AccessControl or Ownable interfaces. No authorized accounts to display.`}
        icon={Shield}
      />
    </div>
  );
}
