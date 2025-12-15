/**
 * PendingTransferRow Component
 * Feature: 015-ownership-transfer (Phase 6.5)
 *
 * Single row in the Pending Transfers table displaying:
 * - Type badge (e.g., "Owner")
 * - Current holder → Pending recipient addresses
 * - Expiration block with status
 * - Step progress indicator
 * - Accept button (when applicable)
 *
 * Tasks: T047
 */

import { ArrowRight } from 'lucide-react';

import { AddressDisplay } from '@openzeppelin/ui-builder-ui';
import { cn } from '@openzeppelin/ui-builder-utils';

import { useBlockTime } from '../../context/BlockTimeContext';
import type { PendingTransfer } from '../../types/pending-transfers';
import { calculateBlockExpiration, formatTimeEstimateDisplay } from '../../utils/block-time';
import { AcceptTransferButton, RoleTypeBadge, StatusBadge } from '../Shared';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for PendingTransferRow component
 */
export interface PendingTransferRowProps {
  /** The transfer to display */
  transfer: PendingTransfer;
  /** Current block number for time estimation */
  currentBlock?: number | null;
  /** Callback when Accept button is clicked */
  onAccept?: (transfer: PendingTransfer) => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * PendingTransferRow - Single transfer row in the Pending Transfers table
 *
 * Follows the same styling pattern as ChangeRow component.
 */
export function PendingTransferRow({ transfer, currentBlock, onAccept }: PendingTransferRowProps) {
  const handleAccept = () => {
    onAccept?.(transfer);
  };

  // Get block time estimation
  const { formatBlocksToTime } = useBlockTime();

  // Calculate blocks remaining and time estimate
  const expirationEstimate = !transfer.isExpired
    ? calculateBlockExpiration(transfer.expirationBlock, currentBlock, formatBlocksToTime)
    : null;

  return (
    <tr className={cn('border-b last:border-b-0 transition-colors', 'hover:bg-accent/50')}>
      {/* Type badge */}
      <td className="p-4">
        <RoleTypeBadge type={transfer.type} label={transfer.label} />
      </td>

      {/* From address */}
      <td className="p-4">
        <AddressDisplay
          address={transfer.currentHolder}
          truncate={true}
          startChars={6}
          endChars={4}
          showCopyButton={true}
          showCopyButtonOnHover={true}
          explorerUrl={transfer.currentHolderUrl}
        />
      </td>

      {/* To address */}
      <td className="p-4">
        <div className="flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <AddressDisplay
            address={transfer.pendingRecipient}
            truncate={true}
            startChars={6}
            endChars={4}
            showCopyButton={true}
            showCopyButtonOnHover={true}
            explorerUrl={transfer.pendingRecipientUrl}
          />
        </div>
      </td>

      {/* Expiration */}
      <td className="p-4 text-sm whitespace-nowrap">
        {transfer.isExpired ? (
          <StatusBadge variant="error">Expired</StatusBadge>
        ) : (
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
        )}
      </td>

      {/* Actions */}
      <td className="p-4">
        {transfer.canAccept && !transfer.isExpired && (
          <AcceptTransferButton
            roleLabel={transfer.label || transfer.type}
            shortLabel
            onClick={handleAccept}
          />
        )}
      </td>
    </tr>
  );
}
