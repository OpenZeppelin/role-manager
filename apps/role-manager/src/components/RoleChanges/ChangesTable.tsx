/** Role change history table with optional cursor-based server pagination. */

import { useMemo } from 'react';

import {
  AddressDisplay,
  Badge,
  DataTable,
  type DataTableColumn,
} from '@openzeppelin/ui-components';

import { useSelectedContract } from '../../hooks/useSelectedContract';
import {
  ACTION_TYPE_CONFIG,
  type RoleChangeEventView,
  type RoleChangesPagination,
} from '../../types/role-changes';
import { formatDateTime } from '../../utils/date';
import { scrollMainToTop } from '../../utils/scroll';
import { ResolvedAddressDisplay } from '../Shared/ResolvedAddressDisplay';
import { RoleTypeBadge } from '../Shared/RoleTypeBadge';

/**
 * Props for ChangesTable component
 */
export interface ChangesTableProps {
  /** List of events to display */
  events: RoleChangeEventView[];
  /** Callback when a role badge is clicked (for navigation to Roles page) */
  onRoleClick?: (roleId: string) => void;
  /** Optional content to render when events array is empty */
  emptyState?: React.ReactNode;
  /** Cursor controls for server-side pagination */
  pagination: RoleChangesPagination;
  /** App-owned filters rendered inside the kit table frame */
  toolbar: React.ReactNode;
}

export function ChangesTable({
  events,
  onRoleClick,
  emptyState,
  pagination,
  toolbar,
}: ChangesTableProps) {
  const { selectedNetwork } = useSelectedContract();
  const columns = useMemo(
    () =>
      [
        {
          id: 'timestamp',
          header: 'Date/Time',
          headerClassName: 'w-36',
          cellClassName: 'text-sm text-muted-foreground whitespace-nowrap',
          cell: (event) => formatDateTime(event.timestamp),
        },
        {
          id: 'action',
          header: 'Action',
          headerClassName: 'w-32',
          cell: (event) => {
            const actionConfig = ACTION_TYPE_CONFIG[event.action];
            return <Badge label={actionConfig.label} variant="solid" tone={actionConfig.tone} />;
          },
        },
        {
          id: 'role',
          header: 'Role',
          headerClassName: 'w-40',
          cell: (event) => {
            const roleType =
              event.action === 'ownership-transfer' || event.action === 'ownership-renounced'
                ? 'ownership'
                : event.action === 'admin-transfer' ||
                    event.action === 'admin-transfer-canceled' ||
                    event.action === 'admin-renounced' ||
                    event.action === 'admin-delay'
                  ? 'admin'
                  : undefined;
            return (
              <RoleTypeBadge
                type={roleType}
                roleName={event.roleName}
                onClick={onRoleClick ? () => onRoleClick(event.roleId) : undefined}
              />
            );
          },
        },
        {
          id: 'account',
          header: 'Account',
          cell: (event) =>
            !event.account || event.account.trim() === '' ? (
              <span className="text-sm text-muted-foreground">-</span>
            ) : (
              <ResolvedAddressDisplay
                address={event.account}
                networkId={selectedNetwork?.id}
                truncate
                startChars={6}
                endChars={4}
                showCopyButton
                explorerUrl={event.accountUrl ?? undefined}
                className="font-mono text-sm"
              />
            ),
        },
        {
          id: 'transaction',
          header: 'Transaction',
          headerClassName: 'w-36',
          cell: (event) =>
            event.transactionHash ? (
              <AddressDisplay
                address={event.transactionHash}
                truncate
                startChars={6}
                endChars={4}
                showCopyButton
                explorerUrl={event.transactionUrl ?? undefined}
                disableLabel
                className="font-mono text-sm"
              />
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            ),
        },
      ] satisfies readonly DataTableColumn<RoleChangeEventView>[],
    [onRoleClick, selectedNetwork?.id]
  );
  return (
    <DataTable
      aria-label="Role changes history"
      columns={columns}
      rows={events}
      getRowKey={(event) => event.id}
      toolbar={toolbar}
      emptyState={emptyState}
      pagination={{
        ...pagination,
        onPageChange: (pageIndex) => {
          scrollMainToTop();
          pagination.onPageChange(pageIndex);
        },
        placement: 'inside',
        hideStatus: true,
        paginationLabel: 'Role changes pagination',
      }}
    />
  );
}
