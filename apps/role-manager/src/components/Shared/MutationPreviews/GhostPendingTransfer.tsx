/**
 * GhostPendingTransfer Component
 *
 * Shimmer placeholder shown when a transferOwnership or transferAdmin
 * mutation has been submitted. Previews the pending transfer info box
 * before the RPC confirms it.
 *
 * Uses AddressDisplay from @openzeppelin/ui-components for consistent
 * address rendering across ghost and real components.
 */
import { User } from 'lucide-react';

import { AddressDisplay } from '@openzeppelin/ui-components';

import { FadingOverlay } from './FadingOverlay';

export interface GhostPendingTransferProps {
  /** The new recipient address (from mutation args) */
  recipient: string;
  /** Label for the transfer type (e.g. "Ownership", "Admin Role") */
  transferLabel?: string;
}

export function GhostPendingTransfer({
  recipient,
  transferLabel = 'Ownership',
}: GhostPendingTransferProps) {
  return (
    <div
      className="relative mt-4 rounded-lg border border-blue-200/60 bg-blue-50/40 p-4 space-y-2 [clip-path:inset(0_round_0.5rem)]"
      role="status"
      aria-label={`${transferLabel} transfer being confirmed`}
    >
      {/* Content — faintly visible behind the breathing overlay */}
      <div className="flex items-center gap-2 text-sm">
        <User className="h-3.5 w-3.5 text-blue-500/50" aria-hidden="true" />
        <span className="text-blue-700/60 font-medium">Pending {transferLabel} Transfer</span>
      </div>
      <div className="flex items-center gap-2 text-sm opacity-60">
        <span className="text-blue-600/50">To:</span>
        <AddressDisplay
          address={recipient}
          truncate={true}
          startChars={10}
          endChars={8}
          showCopyButton={true}
        />
      </div>

      <FadingOverlay variant="info" />
    </div>
  );
}
