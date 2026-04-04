/**
 * SyncProgressBanner Component
 * Feature: 018-access-manager
 *
 * Shows a progress banner during AccessManager event sync.
 */

import { Loader2 } from 'lucide-react';

import type { SyncProgress } from '../../types/access-manager';

interface SyncProgressBannerProps {
  syncProgress: SyncProgress;
  isSyncing: boolean;
}

function formatProgress(progress: SyncProgress): string {
  switch (progress.phase) {
    case 'deployment-block':
      return 'Detecting contract deployment block...';
    case 'scanning-events': {
      if (progress.blocksTotal && progress.blocksTotal > 0) {
        const scanned = (progress.blocksScanned ?? 0).toLocaleString();
        const total = progress.blocksTotal.toLocaleString();
        const pct = Math.min(
          100,
          Math.round(((progress.blocksScanned ?? 0) / progress.blocksTotal) * 100)
        );
        return `Scanning blocks for AccessManager events... ${scanned} / ${total} (${pct}%)`;
      }
      return 'Scanning blocks for events...';
    }
    case 'fetching-metadata': {
      const roles = progress.rolesFound ?? 0;
      return `Found ${roles} role${roles !== 1 ? 's' : ''}, fetching member details...`;
    }
    case 'complete':
      return 'Sync complete';
    default:
      return 'Syncing...';
  }
}

export function SyncProgressBanner({
  syncProgress,
  isSyncing,
}: SyncProgressBannerProps): React.ReactElement | null {
  if (!isSyncing) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3">
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-500" />
      <span className="text-sm text-blue-700 dark:text-blue-300">
        {formatProgress(syncProgress)}
      </span>
    </div>
  );
}
