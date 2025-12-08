/**
 * AccountRow Component
 * Feature: 010-authorized-accounts-page
 *
 * Single row in the Authorized Accounts table displaying:
 * - Checkbox for selection
 * - Truncated address (0x1234...5678)
 * - Status badge
 * - Date added
 * - Expiration date (or "Never")
 * - Role badges (multiple)
 * - Actions menu
 *
 * Interaction States (from spec):
 * - Hover: hover:bg-accent background transition
 * - Focus: visible focus ring on interactive elements
 * - Checkbox: follows Radix UI states (checked, unchecked)
 */

import { AddressDisplay, Checkbox } from '@openzeppelin/ui-builder-ui';
import { cn } from '@openzeppelin/ui-builder-utils';

import {
  ACCOUNT_STATUS_CONFIG,
  type AccountAction,
  type AuthorizedAccount,
} from '../../types/authorized-accounts';
import { formatDate } from '../../utils/date';
import { OutlineBadge } from '../Shared/OutlineBadge';
import { StatusBadge } from '../Shared/StatusBadge';
import { AccountActionsMenu } from './AccountActionsMenu';

/**
 * Props for AccountRow component
 */
export interface AccountRowProps {
  /** Account data to display */
  account: AuthorizedAccount;
  /** Whether this row is currently selected */
  isSelected: boolean;
  /** Callback when selection checkbox changes */
  onToggleSelection: () => void;
  /** Callback when an action is triggered */
  onAction: (action: AccountAction) => void;
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
export function AccountRow({ account, isSelected, onToggleSelection, onAction }: AccountRowProps) {
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
        <AddressDisplay
          address={account.address}
          truncate={true}
          startChars={6}
          endChars={4}
          showCopyButton={true}
          className="font-mono text-sm"
        />
      </td>

      {/* Status badge */}
      <td className="p-4">
        <StatusBadge variant={ACCOUNT_STATUS_CONFIG[account.status].variant}>
          {ACCOUNT_STATUS_CONFIG[account.status].label}
        </StatusBadge>
      </td>

      {/* Date Added */}
      <td className="p-4 text-sm text-muted-foreground">
        {formatDate(account.dateAdded.toISOString())}
      </td>

      {/* Expires - "Never" if no expiration */}
      <td className="p-4 text-sm text-muted-foreground">
        {account.expiresAt ? formatDate(account.expiresAt.toISOString()) : 'Never'}
      </td>

      {/* Roles - multiple badges */}
      <td className="p-4">
        <div className="flex flex-wrap gap-1">
          {account.roles.map((role) => (
            <OutlineBadge key={role}>{role}</OutlineBadge>
          ))}
        </div>
      </td>

      {/* Actions menu */}
      <td className="p-4">
        <AccountActionsMenu onAction={onAction} />
      </td>
    </tr>
  );
}
