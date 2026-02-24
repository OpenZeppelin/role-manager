/**
 * GhostPendingDelay Component
 *
 * Shimmer placeholder shown in the AdminDelayPanel when a changeAdminDelay
 * mutation has been submitted. Previews the upcoming pending delay change
 * box before the RPC confirms it.
 */
import { formatSecondsToReadable } from '@openzeppelin/ui-utils';

import { FadingOverlay } from './FadingOverlay';

export interface GhostPendingDelayProps {
  /** The new delay value in seconds (from mutation args) */
  newDelay: number;
}

export function GhostPendingDelay({ newDelay }: GhostPendingDelayProps) {
  return (
    <div
      className="relative rounded-lg border border-amber-200/60 bg-amber-50/40 p-3 text-sm [clip-path:inset(0_round_0.5rem)]"
      role="status"
      aria-label="Pending delay change being confirmed"
    >
      {/* Content — faintly visible behind the breathing overlay */}
      <p className="font-medium text-amber-700/60">Pending change</p>
      <p className="text-amber-600/50">New delay: {formatSecondsToReadable(newDelay)}</p>

      <FadingOverlay variant="warning" />
    </div>
  );
}
