/**
 * RolesEmptyState Component
 * Feature: 009-roles-page-data
 *
 * Empty state UI for contracts that don't support access control.
 * Reuses the shared PageEmptyState component for consistency.
 *
 * Implements FR-021: Display empty state for unsupported contracts.
 * Message per US3.1: "This contract does not support role-based access control..."
 */
import { ShieldOff } from 'lucide-react';

import { cn } from '@openzeppelin/ui-builder-utils';

import { PageEmptyState } from '../Shared/PageEmptyState';

/**
 * Props for RolesEmptyState component
 */
export interface RolesEmptyStateProps {
  /** Contract name/label for context */
  contractName?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Build the description message based on whether contract name is provided
 */
function getDescription(contractName?: string): string {
  if (contractName) {
    return `${contractName} does not support role-based access control. This contract may not implement the AccessControl or Ownable interfaces.`;
  }
  return 'This contract does not support role-based access control. It may not implement the AccessControl or Ownable interfaces.';
}

/**
 * RolesEmptyState - Empty state for unsupported contracts
 *
 * Displayed when a contract doesn't implement AccessControl or Ownable interfaces.
 * Reuses the shared PageEmptyState component for consistent styling.
 */
export function RolesEmptyState({ contractName, className }: RolesEmptyStateProps) {
  return (
    <div className={cn('space-y-6 p-6', className)}>
      <PageEmptyState
        icon={ShieldOff}
        title="No role-based access control"
        description={getDescription(contractName)}
      />
    </div>
  );
}
