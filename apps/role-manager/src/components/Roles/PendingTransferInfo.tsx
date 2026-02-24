/**
 * PendingTransferInfo Component
 * Feature: 015-ownership-transfer Phase 6 (T026, T027, T028)
 * Updated by: 017-evm-access-control (Phase 6 — US5, T039)
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
 * - Expiration info with adapter-driven labels (no hardcoded "Block"/"Ledger")
 * - Expired status when applicable
 */

import { AlertTriangle, CheckCircle2, Clock, Info, User } from 'lucide-react';

import { AddressDisplay } from '@openzeppelin/ui-components';
import type { ExpirationMetadata } from '@openzeppelin/ui-types';
import { cn } from '@openzeppelin/ui-utils';

import { useBlockTime } from '../../context/useBlockTime';
import { calculateBlockExpiration, formatTimeEstimateDisplay } from '../../utils/block-time';
import {
  formatExpirationTimestamp,
  getExpirationStatusLabel,
  getExpirationUnitPlural,
  getTimestampTimeRemaining,
  isScheduleTimestampReached,
  isTimestampBasedExpiration,
} from '../../utils/expiration';
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
  /** Adapter-driven expiration metadata for display labels */
  expirationMetadata?: ExpirationMetadata;
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
  expirationMetadata,
  canAccept,
  onAccept,
  className,
}: PendingTransferInfoProps) {
  // Get block time estimation for human-readable time display
  const { formatBlocksToTime } = useBlockTime();

  // Whether this is a timestamp-based expiration (e.g., EVM AccessControlDefaultAdminRules)
  const isTimestamp = isTimestampBasedExpiration(expirationMetadata);

  // For contract-managed timestamps, derive whether the schedule has been reached.
  // This is computed locally so the Roles page (which doesn't use usePendingTransfers) also works.
  const scheduleReached = isTimestamp
    ? isScheduleTimestampReached(expirationBlock ?? undefined, expirationMetadata)
    : false;

  // Calculate blocks remaining and time estimate (only when expiration is defined and not timestamp-based)
  const expirationEstimate =
    !isExpired && expirationBlock != null && !isTimestamp
      ? calculateBlockExpiration(expirationBlock, currentBlock, formatBlocksToTime)
      : null;

  const timestampRemaining =
    !isExpired && !scheduleReached && isTimestamp && expirationBlock != null
      ? getTimestampTimeRemaining(expirationBlock)
      : null;

  return (
    <div
      className={cn(
        'rounded-lg border p-3 mt-3',
        isExpired
          ? 'border-amber-300 bg-amber-50'
          : scheduleReached
            ? 'border-green-200 bg-green-50'
            : 'border-blue-200 bg-blue-50',
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
        ) : scheduleReached ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">
              {transferLabel} Transfer Ready
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

      {/* Expiration info — only shown when chain has expiration (e.g., Stellar ledger, EVM schedule) */}
      {expirationBlock != null && (
        <div className="flex items-center gap-2 flex-wrap">
          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground shrink-0">
            {getExpirationStatusLabel(isExpired, expirationMetadata, scheduleReached)}
          </span>
          {isTimestamp ? (
            <>
              <span
                className={cn(
                  'text-xs font-mono',
                  isExpired
                    ? 'text-amber-700'
                    : scheduleReached
                      ? 'text-green-700'
                      : 'text-foreground'
                )}
              >
                {formatExpirationTimestamp(expirationBlock)}
              </span>
              {timestampRemaining && (
                <span className="text-xs text-muted-foreground">
                  (~{timestampRemaining} remaining)
                </span>
              )}
            </>
          ) : (
            <>
              <span
                className={cn(
                  'text-xs font-mono',
                  isExpired ? 'text-amber-700' : 'text-foreground'
                )}
              >
                {expirationBlock.toLocaleString()}
              </span>
              {expirationEstimate && (
                <span className="text-xs text-muted-foreground">
                  ({expirationEstimate.blocksRemaining.toLocaleString()}{' '}
                  {getExpirationUnitPlural(expirationMetadata)}
                  {expirationEstimate.timeEstimate
                    ? ` · ${formatTimeEstimateDisplay(expirationEstimate.timeEstimate)}`
                    : ''}
                  )
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* Accept button - shown when user can accept, transfer is not expired, and schedule is reached (if applicable) */}
      {canAccept && !isExpired && onAccept && (!isTimestamp || scheduleReached) && (
        <div className="mt-3 pt-3 border-t border-green-200 flex justify-end">
          <AcceptTransferButton roleLabel={transferLabel} onClick={onAccept} />
        </div>
      )}

      {/* Pending recipient waiting for schedule */}
      {canAccept && !isExpired && isTimestamp && !scheduleReached && (
        <div className="mt-3 pt-3 border-t border-blue-200 flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0 text-blue-600" />
          <p className="text-xs text-blue-700">
            The transfer will be ready to accept once the schedule is reached.
          </p>
        </div>
      )}

      {/* Wrong wallet / waiting messages */}
      {!canAccept && !isExpired && (
        <div
          className={cn(
            'mt-3 pt-3 border-t flex items-center gap-2',
            scheduleReached ? 'border-green-200' : 'border-blue-200'
          )}
        >
          <Info
            className={cn('h-4 w-4 shrink-0', scheduleReached ? 'text-green-600' : 'text-blue-600')}
          />
          <p className={cn('text-xs', scheduleReached ? 'text-green-700' : 'text-blue-700')}>
            {isTimestamp && !scheduleReached
              ? `The transfer will be ready to accept once the schedule is reached.`
              : `Connect the pending ${recipientLabel.toLowerCase()} wallet to accept this transfer.`}
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
