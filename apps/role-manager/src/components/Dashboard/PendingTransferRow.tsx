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

import { AddressDisplay, Button } from '@openzeppelin/ui-builder-ui';
import { cn } from '@openzeppelin/ui-builder-utils';

import type { PendingTransfer } from '../../types/pending-transfers';
import { RoleTypeBadge, StatusBadge } from '../Shared';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for PendingTransferRow component
 */
export interface PendingTransferRowProps {
  /** The transfer to display */
  transfer: PendingTransfer;
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
export function PendingTransferRow({ transfer, onAccept }: PendingTransferRowProps) {
  const handleAccept = () => {
    onAccept?.(transfer);
  };

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
          className="font-mono text-sm"
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
            className="font-mono text-sm"
          />
        </div>
      </td>

      {/* Expiration */}
      <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">
        {transfer.isExpired ? (
          <StatusBadge variant="error">Expired</StatusBadge>
        ) : (
          <span className="font-mono">{transfer.expirationBlock.toLocaleString()}</span>
        )}
      </td>

      {/* Actions */}
      <td className="p-4">
        {transfer.canAccept && !transfer.isExpired && (
          <Button
            size="sm"
            variant="default"
            onClick={handleAccept}
            aria-label={`Accept ${transfer.label || transfer.type} transfer`}
          >
            Accept
          </Button>
        )}
      </td>
    </tr>
  );
}
