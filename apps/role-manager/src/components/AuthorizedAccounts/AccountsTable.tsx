/** Authorized accounts table with controlled, identity-keyed selection. */

import { Edit } from 'lucide-react';
import { useMemo } from 'react';

import { Button, DataTable, type DataTableColumn } from '@openzeppelin/ui-components';

import type { PaginationControls } from '../../hooks/useAuthorizedAccountsPageData';
import { useSelectedContract } from '../../hooks/useSelectedContract';
import {
  ACCOUNT_STATUS_CONFIG,
  type AccountAction,
  type AuthorizedAccountView,
} from '../../types/authorized-accounts';
import { formatDateTime } from '../../utils/date';
import { scrollMainToTop } from '../../utils/scroll';
import { ResolvedAddressDisplay } from '../Shared/ResolvedAddressDisplay';
import { RoleTypeBadge } from '../Shared/RoleTypeBadge';
import { StatusBadge } from '../Shared/StatusBadge';
import { YouBadge } from '../Shared/YouBadge';

/**
 * Props for AccountsTable component
 */
export interface AccountsTableProps {
  /** List of accounts to display */
  accounts: AuthorizedAccountView[];
  /** Set of selected account IDs */
  selectedIds: Set<string>;
  /** Connected wallet address for "You" badge detection */
  connectedAddress?: string | null;
  /** Callback when row selection changes */
  onSelectionChange: (selectedIds: Set<string>) => void;
  /** Callback when an action is triggered on an account */
  onAction: (accountId: string, action: AccountAction) => void;
  /** Callback when a role badge is clicked (for navigation to Roles page) */
  onRoleClick?: (roleId: string) => void;
  /** Optional content to render when accounts array is empty */
  emptyState?: React.ReactNode;
  /** Controlled pagination state for the current account page */
  pagination: PaginationControls;
  /** App-owned filters rendered inside the kit table frame */
  toolbar: React.ReactNode;
}

export function AccountsTable({
  accounts,
  selectedIds,
  connectedAddress,
  onSelectionChange,
  onAction,
  onRoleClick,
  emptyState,
  pagination,
  toolbar,
}: AccountsTableProps) {
  const { selectedNetwork } = useSelectedContract();
  const columns = useMemo(
    () =>
      [
        {
          id: 'address',
          header: 'Address',
          cell: (account) => (
            <div className="flex items-center gap-2">
              <ResolvedAddressDisplay
                address={account.address}
                networkId={selectedNetwork?.id}
                truncate
                startChars={6}
                endChars={4}
                showCopyButton
                className="font-mono text-sm"
              />
              {connectedAddress &&
                account.address.toLowerCase() === connectedAddress.toLowerCase() && <YouBadge />}
            </div>
          ),
        },
        {
          id: 'status',
          header: 'Status',
          headerClassName: 'w-24',
          cell: (account) => (
            <StatusBadge variant={ACCOUNT_STATUS_CONFIG[account.status].variant}>
              {ACCOUNT_STATUS_CONFIG[account.status].label}
            </StatusBadge>
          ),
        },
        {
          id: 'dateAdded',
          header: 'Date Added',
          headerClassName: 'w-44 whitespace-nowrap',
          cellClassName: 'text-sm text-muted-foreground whitespace-nowrap',
          cell: (account) => (account.dateAdded ? formatDateTime(account.dateAdded) : '-'),
        },
        {
          id: 'roles',
          header: 'Roles',
          headerClassName: 'w-48',
          cell: (account) => (
            <div className="flex flex-wrap gap-1">
              {account.roles.map((role) => (
                <RoleTypeBadge
                  key={role.id}
                  roleName={role.name}
                  onClick={onRoleClick ? () => onRoleClick(role.id) : undefined}
                />
              ))}
            </div>
          ),
        },
        {
          id: 'actions',
          header: '',
          headerLabel: 'Actions',
          align: 'end',
          headerClassName: 'w-32',
          cell: (account) => (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction(account.id, 'edit-roles')}
              className="h-8 gap-1.5 whitespace-nowrap"
            >
              <Edit className="h-3.5 w-3.5 shrink-0" />
              Edit Roles
            </Button>
          ),
        },
      ] satisfies readonly DataTableColumn<AuthorizedAccountView>[],
    [connectedAddress, onAction, onRoleClick, selectedNetwork?.id]
  );

  return (
    <DataTable
      aria-label="Authorized accounts"
      columns={columns}
      rows={accounts}
      getRowKey={(account) => account.id}
      toolbar={toolbar}
      selection={{
        selectedKeys: selectedIds,
        onSelectionChange: (next) => onSelectionChange(new Set(next)),
        selectAllLabel: 'Select all accounts',
        getCheckboxLabel: (account) => `Select account ${account.address}`,
        columnClassName: 'w-12',
      }}
      emptyState={emptyState}
      pagination={{
        kind: 'server',
        pageIndex: pagination.currentPage - 1,
        pageSize: pagination.pageSize,
        totalCount: pagination.totalItems,
        onPageChange: (pageIndex) => {
          scrollMainToTop();
          pagination.goToPage(pageIndex + 1);
        },
        paginationLabel: 'Authorized accounts pagination',
        placement: 'inside',
      }}
    />
  );
}
