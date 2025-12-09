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

import { AddressDisplay } from '@openzeppelin/ui-builder-ui';
import { cn } from '@openzeppelin/ui-builder-utils';

import { ACTION_TYPE_CONFIG, type RoleChangeEventView } from '../../types/role-changes';
import { formatDateTime } from '../../utils/date';
import { OutlineBadge } from '../Shared/OutlineBadge';
import { StatusBadge } from '../Shared/StatusBadge';

/**
 * Props for ChangeRow component
 */
export interface ChangeRowProps {
  /** Event data to display */
  event: RoleChangeEventView;
}

/**
 * ChangeRow - Single event row in the Role Changes table
 *
 * Implements:
 * - Formatted timestamp display
 * - Action type badge with color coding
 * - Role badge
 * - Truncated address with copy functionality and explorer link
 * - Transaction link to block explorer
 */
export function ChangeRow({ event }: ChangeRowProps) {
  const actionConfig = ACTION_TYPE_CONFIG[event.action];

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

      {/* Role badge */}
      <td className="p-4">
        <OutlineBadge>{event.roleName}</OutlineBadge>
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
