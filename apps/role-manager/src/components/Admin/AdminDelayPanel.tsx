/**
 * AdminDelayPanel Component
 * Feature: 017-evm-access-control (T065, US7)
 *
 * Displays current admin transfer delay, pending change (if any), and actions:
 * - Change delay: opens dialog to enter new delay (seconds)
 * - Rollback: cancels pending delay change (only when pending)
 */
import { Clock, RotateCcw, Settings } from 'lucide-react';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@openzeppelin/ui-components';
import { cn, formatSecondsToReadable } from '@openzeppelin/ui-utils';

import type { AdminDelayInfo } from '../../types/admin';
import { formatEffectAtDate } from '../../utils/delay-format';
import { GhostPendingDelay } from '../Shared/MutationPreviews';

export interface AdminDelayPanelProps {
  /** Delay info from adapter (adminInfo.delayInfo) */
  delayInfo: AdminDelayInfo;
  /** Open change-delay dialog */
  onChangeDelayClick: () => void;
  /** Open rollback dialog (only shown when pendingDelay exists) */
  onRollbackClick: () => void;
  /** Ghost preview: new delay (seconds) for a pending changeAdminDelay mutation */
  ghostNewDelay?: number | null;
  /** Additional CSS classes */
  className?: string;
}

export function AdminDelayPanel({
  delayInfo,
  onChangeDelayClick,
  onRollbackClick,
  ghostNewDelay,
  className,
}: AdminDelayPanelProps) {
  const { currentDelay, pendingDelay } = delayInfo;
  const hasPendingChange = !!pendingDelay;

  return (
    <Card className={cn('border border-slate-200', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Clock className="h-4 w-4 text-slate-600" aria-hidden="true" />
          Admin Transfer Delay
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Current delay:</span>
          <span className="font-medium">{formatSecondsToReadable(currentDelay)}</span>
        </div>

        {hasPendingChange && pendingDelay && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
            <p className="font-medium text-amber-800">Pending change</p>
            <p className="text-amber-700">
              New delay: {formatSecondsToReadable(pendingDelay.newDelay)} · Effective:{' '}
              {formatEffectAtDate(pendingDelay.effectAt)}
            </p>
          </div>
        )}

        {/* Ghost preview: shimmer placeholder while RPC confirms the delay change */}
        {!hasPendingChange && ghostNewDelay != null && (
          <GhostPendingDelay newDelay={ghostNewDelay} />
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onChangeDelayClick}
            aria-label="Change admin transfer delay"
          >
            <Settings className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            Change delay
          </Button>
          {hasPendingChange && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRollbackClick}
              className="text-amber-700 border-amber-200 hover:bg-amber-50"
              aria-label="Rollback pending delay change"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              Rollback
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
