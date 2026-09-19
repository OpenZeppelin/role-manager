/** Pending ownership and role-transfer table. */

import { ArrowRight, Clock } from 'lucide-react';
import { useMemo } from 'react';

import { DataTable, type DataTableColumn } from '@openzeppelin/ui-components';

import { useBlockTime } from '../../context/useBlockTime';
import { useSelectedContract } from '../../hooks/useSelectedContract';
import type { PendingTransfer } from '../../types/pending-transfers';
import { calculateBlockExpiration, formatTimeEstimateDisplay } from '../../utils/block-time';
import {
  formatExpirationTimestamp,
  getTimestampTimeRemaining,
  hasNoExpiration,
  isTimestampBasedExpiration,
} from '../../utils/expiration';
import { AcceptTransferButton, RoleTypeBadge, StatusBadge } from '../Shared';
import { ResolvedAddressDisplay } from '../Shared/ResolvedAddressDisplay';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for PendingTransfersTable component
 */
export interface PendingTransfersTableProps {
  /** List of pending transfers to display */
  transfers: PendingTransfer[];
  /** Current block number for time estimation */
  currentBlock?: number | null;
  /** Callback when Accept button is clicked on a transfer */
  onAccept?: (transfer: PendingTransfer) => void;
  /** Optional content to render when transfers array is empty */
  emptyState?: React.ReactNode;
}

export function PendingTransfersTable({
  transfers,
  currentBlock,
  onAccept,
  emptyState,
}: PendingTransfersTableProps) {
  const { selectedNetwork } = useSelectedContract();
  const { formatBlocksToTime } = useBlockTime();
  const columns = useMemo(
    () =>
      [
        {
          id: 'type',
          header: 'Type',
          headerClassName: 'w-28',
          cell: (transfer) => <RoleTypeBadge type={transfer.type} label={transfer.label} />,
        },
        {
          id: 'from',
          header: 'From',
          cell: (transfer) => (
            <ResolvedAddressDisplay
              address={transfer.currentHolder}
              networkId={selectedNetwork?.id}
              truncate
              startChars={6}
              endChars={4}
              showCopyButton
              showCopyButtonOnHover
              explorerUrl={transfer.currentHolderUrl}
            />
          ),
        },
        {
          id: 'to',
          header: 'To',
          cell: (transfer) => (
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              <ResolvedAddressDisplay
                address={transfer.pendingRecipient}
                networkId={selectedNetwork?.id}
                truncate
                startChars={6}
                endChars={4}
                showCopyButton
                showCopyButtonOnHover
                explorerUrl={transfer.pendingRecipientUrl}
              />
            </div>
          ),
        },
        {
          id: 'expires',
          header: 'Expires',
          headerClassName: 'w-32',
          cellClassName: 'text-sm whitespace-nowrap',
          cell: (transfer) => {
            const noExpiration = hasNoExpiration(transfer.expirationMetadata);
            const isTimestamp = isTimestampBasedExpiration(transfer.expirationMetadata);
            const expirationEstimate =
              !transfer.isExpired && !noExpiration && !isTimestamp
                ? calculateBlockExpiration(
                    transfer.expirationBlock,
                    currentBlock,
                    formatBlocksToTime
                  )
                : null;

            if (noExpiration) return <span className="text-muted-foreground">—</span>;
            if (isTimestamp) {
              const remaining = getTimestampTimeRemaining(transfer.expirationBlock);
              return (
                <div className="flex flex-col">
                  <span className="font-mono">
                    {formatExpirationTimestamp(transfer.expirationBlock)}
                  </span>
                  {transfer.isScheduleReached ? (
                    <span className="text-xs text-green-600">Ready to accept</span>
                  ) : remaining ? (
                    <span className="text-xs text-muted-foreground">~{remaining} remaining</span>
                  ) : null}
                </div>
              );
            }
            if (transfer.isExpired) return <StatusBadge variant="error">Expired</StatusBadge>;
            return (
              <div className="flex flex-col">
                <span className="font-mono text-muted-foreground">
                  {transfer.expirationBlock.toLocaleString()}
                </span>
                {expirationEstimate?.timeEstimate && (
                  <span className="text-xs text-blue-600">
                    ≈ {formatTimeEstimateDisplay(expirationEstimate.timeEstimate)}
                  </span>
                )}
              </div>
            );
          },
        },
        {
          id: 'actions',
          header: '',
          headerLabel: 'Actions',
          align: 'end',
          headerClassName: 'w-24',
          cell: (transfer) =>
            transfer.canAccept && !transfer.isExpired ? (
              <AcceptTransferButton
                roleLabel={transfer.label || transfer.type}
                shortLabel
                onClick={() => onAccept?.(transfer)}
              />
            ) : !transfer.isExpired && transfer.isScheduleReached === false ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                Awaiting schedule
              </span>
            ) : null,
        },
      ] satisfies readonly DataTableColumn<PendingTransfer>[],
    [currentBlock, formatBlocksToTime, onAccept, selectedNetwork?.id]
  );

  return (
    <DataTable
      aria-label="Pending role changes"
      className="rounded-none border-0"
      columns={columns}
      rows={transfers}
      getRowKey={(transfer) => transfer.id}
      emptyState={emptyState}
    />
  );
}
