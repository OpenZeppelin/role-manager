/**
 * PendingChangesCard Component
 * Feature: 015-ownership-transfer (Phase 6.5)
 *
 * Card displaying pending role changes and ownership transfers.
 * Shows a table of pending transfers with action buttons.
 *
 * Tasks: T049
 */

import { Clock, Loader2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@openzeppelin/ui-components';
import { cn } from '@openzeppelin/ui-utils';

import type { PendingTransfer } from '../../types/pending-transfers';
import { EmptyState } from '../Shared/EmptyState';
import { PendingTransfersTable } from './PendingTransfersTable';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for PendingChangesCard component
 */
export interface PendingChangesCardProps {
  /** Optional additional CSS classes */
  className?: string;
  /** List of pending transfers to display */
  transfers?: PendingTransfer[];
  /** Current block number for time estimation */
  currentBlock?: number | null;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Callback when Accept button is clicked */
  onAccept?: (transfer: PendingTransfer) => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * PendingChangesCard - Displays pending role changes in a card
 *
 * Shows:
 * - Loading state while fetching data
 * - Empty state when no pending changes
 * - Table of pending transfers with actions
 */
export function PendingChangesCard({
  className,
  transfers = [],
  currentBlock,
  isLoading = false,
  onAccept,
}: PendingChangesCardProps) {
  const hasTransfers = transfers.length > 0 && !isLoading;

  return (
    <Card className={cn('w-full flex flex-col shadow-none pt-0 lg:min-h-[300px]', className)}>
      <CardHeader className={cn('pt-6', hasTransfers && 'pb-6')}>
        <CardTitle className="text-lg font-medium">Pending Role Changes</CardTitle>
      </CardHeader>
      {/* Remove padding when showing table so it sits flush with card edges */}
      <CardContent className={cn('flex-1 flex flex-col', hasTransfers && 'p-0')}>
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Loading pending changes...</p>
          </div>
        ) : transfers.length === 0 ? (
          <EmptyState
            title="No pending role changes"
            description="There are no pending role changes for this contract."
            icon={Clock}
            className="h-full"
          />
        ) : (
          <PendingTransfersTable
            transfers={transfers}
            currentBlock={currentBlock}
            onAccept={onAccept}
          />
        )}
      </CardContent>
    </Card>
  );
}
