/**
 * GhostAccountRow Component
 *
 * Shimmer placeholder that mirrors the real AccountRow layout.
 * Shown in the member list when a grantRole mutation has been submitted
 * and the app is waiting for the RPC to propagate the new member.
 *
 * Uses the same AddressDisplay component and layout as AccountRow so
 * the ghost row visually matches the real row it will become.
 * A heavy blur overlay with a static label + spinner indicates pending state.
 */
import { AddressDisplay } from '@openzeppelin/ui-components';
import { cn } from '@openzeppelin/ui-utils';

import { FadingOverlay } from './FadingOverlay';

export interface GhostAccountRowProps {
  /** The address being assigned (from mutation args) */
  address: string;
  className?: string;
}

export function GhostAccountRow({ address, className }: GhostAccountRowProps) {
  return (
    <div
      className={cn('relative overflow-hidden p-3', className)}
      role="status"
      aria-label={`Assigning account ${address}`}
    >
      {/* Underlying row content — barely visible behind the blur */}
      <div className="flex items-center gap-2">
        <AddressDisplay
          address={address}
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
