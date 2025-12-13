/**
 * NoRolesEmptyState Component
 * Feature: 014-role-grant-revoke (Phase 6: Error Handling)
 *
 * Empty state displayed when a contract has no AccessControl roles defined.
 *
 * Implements FR-037: "If the contract has zero AccessControl roles defined
 * (excluding Owner), dialogs MUST show an empty state:
 * 'No roles defined for this contract.'"
 *
 * Key behaviors:
 * - Shows informative empty state message
 * - Explains that roles are defined in the smart contract
 */

import { ShieldOff } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for NoRolesEmptyState component
 */
export interface NoRolesEmptyStateProps {
  /** Optional custom title */
  title?: string;
  /** Optional custom description */
  description?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * NoRolesEmptyState - Empty state for contracts with no roles
 *
 * Displayed when a contract has no AccessControl roles defined,
 * typically because the contract doesn't implement AccessControl
 * or has no custom roles beyond the Owner role.
 *
 * @example
 * ```tsx
 * {availableRoles.length === 0 && <NoRolesEmptyState />}
 * ```
 */
export function NoRolesEmptyState({ title, description }: NoRolesEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-muted/20 px-6 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <ShieldOff className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-medium text-foreground">{title || 'No Roles Defined'}</h4>
        <p className="text-sm text-muted-foreground max-w-xs">
          {description ||
            'This contract has no AccessControl roles defined. Roles are defined in the smart contract code.'}
        </p>
      </div>
    </div>
  );
}
