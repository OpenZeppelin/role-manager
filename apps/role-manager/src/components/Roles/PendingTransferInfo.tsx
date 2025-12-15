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

import { AlertTriangle, Clock, User } from 'lucide-react';

import { AddressDisplay } from '@openzeppelin/ui-builder-ui';
import { cn } from '@openzeppelin/ui-builder-utils';

/**
 * Props for PendingTransferInfo component
 */
export interface PendingTransferInfoProps {
  /** Address of the pending recipient */
  pendingRecipient: string;
  /** Expiration block/ledger number */
  expirationBlock: number;
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
  expirationBlock,
  isExpired,
  transferLabel = 'Ownership',
  recipientLabel = 'Owner',
  currentBlock,
  className,
}: PendingTransferInfoProps) {
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
        />
      </div>

      {/* Expiration block */}
      <div className="flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground shrink-0">
          {isExpired ? 'Expired at Block:' : 'Expires at Block:'}
        </span>
        <span className={cn('text-xs font-mono', isExpired ? 'text-amber-700' : 'text-foreground')}>
          {expirationBlock.toLocaleString()}
        </span>
        {currentBlock !== null && currentBlock !== undefined && (
          <span className="text-xs text-muted-foreground">
            (current: {currentBlock.toLocaleString()})
          </span>
        )}
      </div>

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
