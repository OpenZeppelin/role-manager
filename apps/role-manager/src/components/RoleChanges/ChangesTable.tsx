/**
 * ChangesTable Component
 * Feature: 012-role-changes-data
 *
 * Main data table for displaying role change history.
 *
 * Structure:
 * - HTML table with semantic structure
 * - Column headers: Timestamp, Action, Role, Account, Transaction
 * - Body maps events to ChangeRow components
 *
 * Tasks: T007
 */

import { cn } from '@openzeppelin/ui-utils';

import type { RoleChangeEventView } from '../../types/role-changes';
import { ChangeRow } from './ChangeRow';

/**
 * Props for ChangesTable component
 */
export interface ChangesTableProps {
  /** List of events to display */
  events: RoleChangeEventView[];
  /** Optional content to render when events array is empty */
  emptyState?: React.ReactNode;
}

/**
 * Column header definitions for the table
 */
const COLUMNS = [
  { id: 'timestamp', label: 'Date/Time', width: 'w-36' },
  { id: 'action', label: 'Action', width: 'w-32' },
  { id: 'role', label: 'Role', width: 'w-40' },
  { id: 'account', label: 'Account', width: '' },
  { id: 'transaction', label: 'Transaction', width: 'w-36' },
] as const;

/**
 * ChangesTable - Data table for role change history
 *
 * Implements:
 * - Column headers per FR-010
 * - Event rows via ChangeRow component
 * - Empty state slot for no-data scenarios
 */
export function ChangesTable({ events, emptyState }: ChangesTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full" aria-label="Role changes history">
        {/* Table Header */}
        <thead className="border-b bg-muted/50">
          <tr>
            {COLUMNS.map((column) => (
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
          {events.length === 0 && emptyState ? (
            <tr>
              <td colSpan={COLUMNS.length} className="p-0">
                {emptyState}
              </td>
            </tr>
          ) : (
            events.map((event) => <ChangeRow key={event.id} event={event} />)
          )}
        </tbody>
      </table>
    </div>
  );
}
