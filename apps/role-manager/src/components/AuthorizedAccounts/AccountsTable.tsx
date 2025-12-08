/**
 * AccountsTable Component
 * Feature: 010-authorized-accounts-page
 * Updated by: 011-accounts-real-data
 *
 * Main data table for displaying authorized accounts.
 *
 * Structure:
 * - Card container wrapper
 * - HTML table with semantic structure
 * - Header row with master checkbox (supports indeterminate state)
 * - Column headers: Address, Status, Date Added, Roles, Actions
 * - Body maps accounts to AccountRow components
 *
 * Selection behavior (FR-005):
 * - Master checkbox: toggles all rows
 * - Indeterminate state when partial selection
 */

import { Checkbox } from '@openzeppelin/ui-builder-ui';
import { cn } from '@openzeppelin/ui-builder-utils';

import {
  getMasterCheckboxState,
  type AccountAction,
  type AuthorizedAccountView,
} from '../../types/authorized-accounts';
import { AccountRow } from './AccountRow';

/**
 * Props for AccountsTable component
 */
export interface AccountsTableProps {
  /** List of accounts to display */
  accounts: AuthorizedAccountView[];
  /** Set of selected account IDs */
  selectedIds: Set<string>;
  /** Callback when row selection changes */
  onSelectionChange: (selectedIds: Set<string>) => void;
  /** Callback when an action is triggered on an account */
  onAction: (accountId: string, action: AccountAction) => void;
  /** Optional content to render when accounts array is empty */
  emptyState?: React.ReactNode;
}

/**
 * Column header definitions for the table
 */
const COLUMNS = [
  { id: 'checkbox', label: '', width: 'w-12' },
  { id: 'address', label: 'Address', width: '' },
  { id: 'status', label: 'Status', width: 'w-24' },
  { id: 'dateAdded', label: 'Date Added', width: 'w-32' },
  { id: 'roles', label: 'Roles', width: 'w-48' },
  { id: 'actions', label: 'Actions', width: 'w-16' },
] as const;

/**
 * AccountsTable - Data table for authorized accounts
 *
 * Implements:
 * - Master checkbox with indeterminate support
 * - Row selection via checkbox toggle
 * - Action callbacks for row actions
 */
export function AccountsTable({
  accounts,
  selectedIds,
  onSelectionChange,
  onAction,
  emptyState,
}: AccountsTableProps) {
  // Derive master checkbox state
  const masterState = getMasterCheckboxState(selectedIds.size, accounts.length);
  const isAllSelected = masterState === 'checked';
  const isIndeterminate = masterState === 'indeterminate';

  /**
   * Handles master checkbox toggle
   * - If any selected: clear all
   * - If none selected: select all
   */
  const handleMasterToggle = () => {
    if (selectedIds.size > 0) {
      // Clear selection
      onSelectionChange(new Set());
    } else {
      // Select all
      onSelectionChange(new Set(accounts.map((a) => a.id)));
    }
  };

  /**
   * Handles individual row selection toggle
   */
  const handleRowToggle = (accountId: string) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(accountId)) {
      newSelectedIds.delete(accountId);
    } else {
      newSelectedIds.add(accountId);
    }
    onSelectionChange(newSelectedIds);
  };

  /**
   * Handles action from AccountRow
   */
  const handleAction = (accountId: string, action: AccountAction) => {
    onAction(accountId, action);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        {/* Table Header */}
        <thead className="border-b bg-muted/50">
          <tr>
            {/* Master Checkbox */}
            <th className={cn('p-4 text-left', COLUMNS[0].width)}>
              <Checkbox
                checked={isIndeterminate ? 'indeterminate' : isAllSelected}
                onCheckedChange={handleMasterToggle}
                aria-label="Select all accounts"
                className="focus-visible:ring-2 focus-visible:ring-ring"
              />
            </th>

            {/* Other column headers */}
            {COLUMNS.slice(1).map((column) => (
              <th
                key={column.id}
                className={cn(
                  'p-4 text-left text-sm font-medium text-muted-foreground',
                  column.width
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        {/* Table Body */}
        <tbody>
          {accounts.length === 0 && emptyState ? (
            <tr>
              <td colSpan={COLUMNS.length} className="p-0">
                {emptyState}
              </td>
            </tr>
          ) : (
            accounts.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                isSelected={selectedIds.has(account.id)}
                onToggleSelection={() => handleRowToggle(account.id)}
                onAction={(action) => handleAction(account.id, action)}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
