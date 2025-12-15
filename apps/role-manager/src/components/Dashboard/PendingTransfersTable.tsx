/**
 * PendingTransfersTable Component
 * Feature: 015-ownership-transfer (Phase 6.5)
 *
 * Main data table for displaying pending transfers.
 *
 * Structure:
 * - HTML table with semantic structure
 * - Column headers: Type, From, To, Expires, Actions
 * - Body maps transfers to PendingTransferRow components
 * - Empty state slot for no-data scenarios
 *
 * Tasks: T048
 */

import { cn } from '@openzeppelin/ui-builder-utils';

import type { PendingTransfer } from '../../types/pending-transfers';
import { PendingTransferRow } from './PendingTransferRow';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for PendingTransfersTable component
 */
export interface PendingTransfersTableProps {
  /** List of pending transfers to display */
  transfers: PendingTransfer[];
  /** Callback when Accept button is clicked on a transfer */
  onAccept?: (transfer: PendingTransfer) => void;
  /** Optional content to render when transfers array is empty */
  emptyState?: React.ReactNode;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Column header definitions for the table
 */
const COLUMNS = [
  { id: 'type', label: 'Type', width: 'w-28' },
  { id: 'from', label: 'From', width: '' },
  { id: 'to', label: 'To', width: '' },
  { id: 'expires', label: 'Expires', width: 'w-32' },
  { id: 'actions', label: '', width: 'w-24' },
] as const;

// =============================================================================
// Component
// =============================================================================

/**
 * PendingTransfersTable - Data table for pending transfers
 *
 * Follows the same styling pattern as ChangesTable and AccountsTable.
 */
export function PendingTransfersTable({
  transfers,
  onAccept,
  emptyState,
}: PendingTransfersTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full" aria-label="Pending role changes">
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
          {transfers.length === 0 && emptyState ? (
            <tr>
              <td colSpan={COLUMNS.length} className="p-0">
                {emptyState}
              </td>
            </tr>
          ) : (
            transfers.map((transfer) => (
              <PendingTransferRow key={transfer.id} transfer={transfer} onAccept={onAccept} />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
