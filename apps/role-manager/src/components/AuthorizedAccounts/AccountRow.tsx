/**
 * AccountRow Component
 * Feature: 010-authorized-accounts-page
 * Updated by: 011-accounts-real-data
 *
 * Single row in the Authorized Accounts table displaying:
 * - Checkbox for selection
 * - Truncated address (0x1234...5678)
 * - Status badge
 * - Date added (or "-" if unavailable)
 * - Role badges (multiple)
 * - Actions menu
 *
 * Interaction States (from spec):
 * - Hover: hover:bg-accent background transition
 * - Focus: visible focus ring on interactive elements
 * - Checkbox: follows Radix UI states (checked, unchecked)
 */

import { Edit } from 'lucide-react';

import { AddressDisplay, Button, Checkbox } from '@openzeppelin/ui-components';
import { cn } from '@openzeppelin/ui-utils';

import {
  ACCOUNT_STATUS_CONFIG,
  type AccountAction,
  type AuthorizedAccountView,
} from '../../types/authorized-accounts';
import { formatDateTime } from '../../utils/date';
import { RoleTypeBadge } from '../Shared/RoleTypeBadge';
import { StatusBadge } from '../Shared/StatusBadge';
import { YouBadge } from '../Shared/YouBadge';

/**
 * Props for AccountRow component
 */
export interface AccountRowProps {
  /** Account data to display */
  account: AuthorizedAccountView;
  /** Whether this row is currently selected */
  isSelected: boolean;
  /** Whether this account belongs to the connected wallet (for "You" badge) */
  isCurrentUser?: boolean;
  /** Callback when selection checkbox changes */
  onToggleSelection: () => void;
  /** Callback when an action is triggered */
  onAction: (action: AccountAction) => void;
  /** Callback when a role badge is clicked (for navigation to Roles page) */
  onRoleClick?: (roleId: string) => void;
}

/**
 * AccountRow - Single account row in the Authorized Accounts table
 *
 * Implements:
 * - Selectable row with checkbox
 * - Truncated address display using AddressDisplay component
 * - Status and role badges
 * - Date formatting with "Never" fallback for no expiration
 * - Actions dropdown menu
 */
export function AccountRow({
  account,
  isSelected,
  isCurrentUser = false,
  onToggleSelection,
  onAction,
  onRoleClick,
}: AccountRowProps) {
  return (
    <tr
      className={cn(
        'border-b last:border-b-0 transition-colors',
        'hover:bg-accent/50',
        isSelected && 'bg-accent/30'
      )}
    >
      {/* Checkbox */}
      <td className="p-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelection}
          aria-label={`Select account ${account.address}`}
          className="focus-visible:ring-2 focus-visible:ring-ring"
        />
      </td>

      {/* Address - truncated display */}
      <td className="p-4">
        <div className="flex items-center gap-2">
          <AddressDisplay
            address={account.address}
            truncate={true}
            startChars={6}
            endChars={4}
            showCopyButton={true}
            className="font-mono text-sm"
          />
          {/* "You" badge - shown when account matches connected wallet */}
          {isCurrentUser && <YouBadge />}
        </div>
      </td>

      {/* Status badge */}
      <td className="p-4">
        <StatusBadge variant={ACCOUNT_STATUS_CONFIG[account.status].variant}>
          {ACCOUNT_STATUS_CONFIG[account.status].label}
        </StatusBadge>
      </td>

      {/* Date Added - display "-" if unavailable */}
      <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">
        {account.dateAdded ? formatDateTime(account.dateAdded) : '-'}
      </td>

      {/* Roles - multiple badges (clickable for navigation) */}
      <td className="p-4">
        <div className="flex flex-wrap gap-1">
          {account.roles.map((role) => (
            <RoleTypeBadge
              key={role.id}
              roleName={role.name}
              onClick={onRoleClick ? () => onRoleClick(role.id) : undefined}
            />
          ))}
        </div>
      </td>

      {/* Actions - direct Edit Roles button */}
      <td className="p-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAction('edit-roles')}
          className="h-8 gap-1.5 whitespace-nowrap"
        >
          <Edit className="h-3.5 w-3.5 shrink-0" />
          Edit Roles
        </Button>
      </td>
    </tr>
  );
}
