/**
 * ChangeRow Component
 * Feature: 012-role-changes-data
 * Updated: 018-access-manager (AM event types: target-role, label)
 *
 * Single row in the Role Changes table displaying:
 * - Timestamp (formatted date/time)
 * - Action badge (Grant, Revoke, Ownership Transfer, Set Target, Label)
 * - Role badge
 * - Account address (truncated with copy)
 * - Target + function (for target-role events)
 * - Transaction link (external link to explorer)
 *
 * Tasks: T006
 */

import { AddressDisplay } from '@openzeppelin/ui-components';
import { cn } from '@openzeppelin/ui-utils';

import { getShortFunctionName } from '../../hooks/useFunctionSignatures';
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
  /** Resolved function signature map (selector → name) for target-role events */
  signatureMap?: Map<string, string>;
}

/** Action config overrides for AM-specific event types */
const AM_ACTION_CONFIG: Record<
  string,
  { label: string; variant: 'success' | 'error' | 'warning' | 'info' }
> = {
  'target-role': { label: 'Set Target', variant: 'info' },
  label: { label: 'Label', variant: 'info' },
};

/**
 * ChangeRow - Single event row in the Role Changes table
 */
export function ChangeRow({ event, onRoleClick, signatureMap }: ChangeRowProps) {
  const isTargetRole = event.amEventType === 'target-role';
  const isLabel = event.amEventType === 'label';

  // Use AM-specific action config when applicable, otherwise standard
  const actionConfig =
    event.amEventType && AM_ACTION_CONFIG[event.amEventType]
      ? AM_ACTION_CONFIG[event.amEventType]
      : ACTION_TYPE_CONFIG[event.action];

  // Map action to role type for special icon display
  const roleType =
    event.action === 'ownership-transfer' || event.action === 'ownership-renounced'
      ? 'ownership'
      : event.action === 'admin-transfer' ||
          event.action === 'admin-transfer-canceled' ||
          event.action === 'admin-renounced' ||
          event.action === 'admin-delay'
        ? 'admin'
        : undefined;

  // Resolve function name for target-role events
  const resolvedFunctionName =
    isTargetRole && event.selector ? signatureMap?.get(event.selector.toLowerCase()) : undefined;
  const selectorDisplay = resolvedFunctionName
    ? getShortFunctionName(resolvedFunctionName)
    : event.selector;

  // Show dash when account is missing
  const isEmptyAccount = !event.account || event.account.trim() === '';

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
        <RoleTypeBadge
          type={roleType}
          roleName={event.roleName}
          onClick={onRoleClick ? () => onRoleClick(event.roleId) : undefined}
        />
      </td>

      {/* Account / Target+Function / Label — context-dependent */}
      <td className="p-4">
        {isTargetRole ? (
          <div className="flex flex-col gap-0.5">
            {event.target && (
              <AddressDisplay
                address={event.target}
                truncate={true}
                startChars={6}
                endChars={4}
                showCopyButton={true}
                explorerUrl={event.targetUrl ?? undefined}
                className="font-mono text-sm"
              />
            )}
            {event.selector && (
              <code
                className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground w-fit"
                title={resolvedFunctionName ?? event.selector}
              >
                {selectorDisplay}
              </code>
            )}
          </div>
        ) : isLabel ? (
          <span className="text-sm text-muted-foreground italic">
            {event.labelText ? `"${event.labelText}"` : '-'}
          </span>
        ) : isEmptyAccount ? (
          <span className="text-sm text-muted-foreground">-</span>
        ) : (
          <AddressDisplay
            address={event.account}
            truncate={true}
            startChars={6}
            endChars={4}
            showCopyButton={true}
            explorerUrl={event.accountUrl ?? undefined}
            className="font-mono text-sm"
          />
        )}
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
            disableLabel
            className="font-mono text-sm"
          />
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
      </td>
    </tr>
  );
}
