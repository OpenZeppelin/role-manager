/**
 * PendingTransferInfo Component
 * Feature: 015-ownership-transfer Phase 6 (T026, T027, T028)
 *
 * Generic component for displaying pending transfer information.
 * Reusable for:
 * - Ownership transfers (two-step Ownable)
 * - Admin role transfers
 * - Multisig transfers
 * - Any role with pending transfer mechanics
 *
 * Displays:
 * - Pending recipient address
 * - Expiration block/ledger number
 * - Expired status when applicable
 */

import { AlertTriangle, Clock, Info, User } from 'lucide-react';

import { AddressDisplay } from '@openzeppelin/ui-components';
import { cn } from '@openzeppelin/ui-utils';

import { useBlockTime } from '../../context/useBlockTime';
import { calculateBlockExpiration, formatTimeEstimateDisplay } from '../../utils/block-time';
import { AcceptTransferButton } from '../Shared/AcceptTransferButton';

/**
 * Props for PendingTransferInfo component
 */
export interface PendingTransferInfoProps {
  /** Address of the pending recipient */
  pendingRecipient: string;
  /** Explorer URL for the pending recipient address */
  pendingRecipientUrl?: string;
  /** Expiration block/ledger number (undefined when chain has no expiration, e.g., EVM Ownable2Step) */
  expirationBlock?: number;
  /** Whether the transfer is expired */
  isExpired: boolean;
  /**
   * Label for the transfer type (e.g., "Ownership", "Admin Role", "Multisig")
   * Used to customize displayed text
   * @default "Ownership"
   */
  transferLabel?: string;
  /**
   * Label for the recipient (e.g., "Owner", "Admin", "Signer")
   * @default "Owner"
   */
  recipientLabel?: string;
  /** Optional: Current block/ledger for context display */
  currentBlock?: number | null;
  /** Whether the connected user can accept this transfer */
  canAccept?: boolean;
  /** Callback when Accept button is clicked */
  onAccept?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * PendingTransferInfo - Displays pending transfer details for any role type
 *
 * Shows:
 * - Pending recipient address with copy button
 * - Expiration block number
 * - Visual indicator for expired transfers
 *
 * @example
 * ```tsx
 * // Ownership transfer
 * <PendingTransferInfo
 *   pendingRecipient={pendingOwner}
 *   expirationBlock={expirationBlock}
 *   isExpired={ownershipState === 'expired'}
 * />
 *
 * // Admin role transfer
 * <PendingTransferInfo
 *   pendingRecipient={pendingAdmin}
 *   expirationBlock={expirationBlock}
 *   isExpired={false}
 *   transferLabel="Admin Role"
 *   recipientLabel="Admin"
 * />
 * ```
 */
export function PendingTransferInfo({
  pendingRecipient,
  pendingRecipientUrl,
  expirationBlock,
  isExpired,
  transferLabel = 'Ownership',
  recipientLabel = 'Owner',
  currentBlock,
  canAccept,
  onAccept,
  className,
}: PendingTransferInfoProps) {
  // Get block time estimation for human-readable time display
  const { formatBlocksToTime } = useBlockTime();

  // Calculate blocks remaining and time estimate (only when expiration is defined)
  const expirationEstimate =
    !isExpired && expirationBlock != null
      ? calculateBlockExpiration(expirationBlock, currentBlock, formatBlocksToTime)
      : null;

  return (
    <div
      className={cn(
        'rounded-lg border p-3 mt-3',
        isExpired ? 'border-amber-300 bg-amber-50' : 'border-blue-200 bg-blue-50',
        className
      )}
    >
      {/* Header with status */}
      <div className="flex items-center gap-2 mb-2">
        {isExpired ? (
          <>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">
              {transferLabel} Transfer Expired
            </span>
          </>
        ) : (
          <>
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">
              Pending {transferLabel} Transfer
            </span>
          </>
        )}
      </div>

      {/* Pending recipient address */}
      <div className="flex items-center gap-2 mb-2">
        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground shrink-0">Pending {recipientLabel}:</span>
        <AddressDisplay
          address={pendingRecipient}
          truncate={true}
          startChars={10}
          endChars={8}
          showCopyButton={true}
          explorerUrl={pendingRecipientUrl}
        />
      </div>

      {/* Expiration info — only shown when chain has expiration (e.g., Stellar) */}
      {expirationBlock != null && (
        <div className="flex items-center gap-2 flex-wrap">
          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground shrink-0">
            {isExpired ? 'Expired at Block:' : 'Expires at Block:'}
          </span>
          <span
            className={cn('text-xs font-mono', isExpired ? 'text-amber-700' : 'text-foreground')}
          >
            {expirationBlock.toLocaleString()}
          </span>
          {expirationEstimate && (
            <span className="text-xs text-muted-foreground">
              ({expirationEstimate.blocksRemaining.toLocaleString()} blocks
              {expirationEstimate.timeEstimate
                ? ` · ${formatTimeEstimateDisplay(expirationEstimate.timeEstimate)}`
                : ''}
              )
            </span>
          )}
        </div>
      )}

      {/* Accept button - shown when user can accept and transfer is not expired */}
      {canAccept && !isExpired && onAccept && (
        <div className="mt-3 pt-3 border-t border-blue-200 flex justify-end">
          <AcceptTransferButton roleLabel={transferLabel} onClick={onAccept} />
        </div>
      )}

      {/* T034: Wrong wallet connected message - shown when user cannot accept (not pending owner) and transfer is not expired */}
      {!canAccept && !isExpired && (
        <div className="mt-3 pt-3 border-t border-blue-200 flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-600 shrink-0" />
          <p className="text-xs text-blue-700">
            Connect the pending {recipientLabel.toLowerCase()} wallet to accept this transfer.
          </p>
        </div>
      )}

      {/* Expired message */}
      {isExpired && (
        <p className="text-xs text-amber-600 mt-2">
          This transfer has expired. The current {recipientLabel.toLowerCase()} can initiate a new
          transfer.
        </p>
      )}
    </div>
  );
}
