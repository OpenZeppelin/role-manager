/**
 * ChangeRow Component
 * Feature: 012-role-changes-data
 *
 * Single row in the Role Changes table displaying:
 * - Timestamp (formatted date/time)
 * - Action badge (Grant, Revoke, Ownership Transfer)
 * - Role badge
 * - Account address (truncated with copy)
 * - Transaction link (external link to explorer)
 *
 * Tasks: T006
 */

import { AddressDisplay } from '@openzeppelin/ui-components';
import { cn } from '@openzeppelin/ui-utils';

import { ACTION_TYPE_CONFIG, type RoleChangeEventView } from '../../types/role-changes';
import { formatDateTime } from '../../utils/date';
import { RoleTypeBadge } from '../Shared/RoleTypeBadge';
import { StatusBadge } from '../Shared/StatusBadge';

/**
 * Props for ChangeRow component
 */
export interface ChangeRowProps {
  /** Event data to display */
  event: RoleChangeEventView;
  /** Callback when a role badge is clicked (for navigation to Roles page) */
  onRoleClick?: (roleId: string) => void;
}

/**
 * ChangeRow - Single event row in the Role Changes table
 *
 * Implements:
 * - Formatted timestamp display
 * - Action type badge with color coding
 * - Role badge (with icon for special roles: Owner crown, Contract Admin shield)
 * - Truncated address with copy functionality and explorer link
 * - Transaction link to block explorer
 */
export function ChangeRow({ event, onRoleClick }: ChangeRowProps) {
  const actionConfig = ACTION_TYPE_CONFIG[event.action];

  // Map action to role type for special icon display
  // - ownership-transfer → 'ownership' (crown icon)
  // - admin-transfer → 'admin' (shield icon for Contract Admin only)
  const roleType =
    event.action === 'ownership-transfer'
      ? 'ownership'
      : event.action === 'admin-transfer'
        ? 'admin'
        : undefined;

  return (
    <tr className={cn('border-b last:border-b-0 transition-colors', 'hover:bg-accent/50')}>
      {/* Timestamp */}
      <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">
        {formatDateTime(event.timestamp)}
      </td>

      {/* Action badge */}
      <td className="p-4">
        <StatusBadge variant={actionConfig.variant}>{actionConfig.label}</StatusBadge>
      </td>

      {/* Role badge - pass type for special icons (Owner crown, Contract Admin shield) */}
      {/* Clickable for navigation to Roles page */}
      <td className="p-4">
        <RoleTypeBadge
          type={roleType}
          roleName={event.roleName}
          onClick={onRoleClick ? () => onRoleClick(event.roleId) : undefined}
        />
      </td>

      {/* Account address */}
      <td className="p-4">
        <AddressDisplay
          address={event.account}
          truncate={true}
          startChars={6}
          endChars={4}
          showCopyButton={true}
          explorerUrl={event.accountUrl ?? undefined}
          className="font-mono text-sm"
        />
      </td>

      {/* Transaction hash */}
      <td className="p-4">
        {event.transactionHash ? (
          <AddressDisplay
            address={event.transactionHash}
            truncate={true}
            startChars={6}
            endChars={4}
            showCopyButton={true}
            explorerUrl={event.transactionUrl ?? undefined}
            className="font-mono text-sm"
          />
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
      </td>
    </tr>
  );
}
