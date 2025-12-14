/**
 * AccountRow Component
 * Feature: 008-roles-page-layout, 009-roles-page-data
 *
 * Displays account with AddressDisplay from UI Builder for consistent styling.
 *
 * Updated in spec 009 (T031, T032, T033):
 * - Real member data props
 * - "You" badge detection (case-insensitive address comparison)
 * - Assignment date display/hide logic (hide when unavailable)
 */

import { Crown, Trash2 } from 'lucide-react';

import { AddressDisplay, Button } from '@openzeppelin/ui-builder-ui';
import { cn } from '@openzeppelin/ui-builder-utils';

import { formatDate } from '../../utils/date';
import { YouBadge } from '../Shared/YouBadge';

/**
 * Props for AccountRow component - updated for real member data (T031)
 */
export interface AccountRowProps {
  /** Account address */
  address: string;
  /** Assignment date (optional - hide when unavailable per FR-013) */
  assignedAt?: Date;
  /** Whether this is the connected user (for "You" badge per FR-012) */
  isCurrentUser: boolean;
  /** Whether to show Owner-specific actions */
  isOwnerRole: boolean;
  /** Revoke action handler (non-owner roles) */
  onRevoke?: () => void;
  /** Transfer ownership handler (owner role only) */
  onTransferOwnership?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * AccountRow - Single account in the assigned accounts list
 *
 * Implements:
 * - T032: "You" badge detection using case-insensitive address comparison
 * - T033: Assignment date display/hide logic (hide when unavailable)
 */
export function AccountRow({
  address,
  assignedAt,
  isCurrentUser,
  isOwnerRole,
  onRevoke,
  onTransferOwnership,
  className,
}: AccountRowProps) {
  return (
    <div className={cn('p-3 flex items-center justify-between hover:bg-muted/50', className)}>
      <div className="flex items-center gap-2">
        <AddressDisplay
          address={address}
          truncate={true}
          startChars={10}
          endChars={8}
          showCopyButton={true}
        />
        {/* T032: "You" badge - shown when isCurrentUser is true */}
        {isCurrentUser && <YouBadge />}
      </div>
      <div className="flex items-center gap-2">
        {!isOwnerRole ? (
          <>
            {/* T033: Only show assignment date when available */}
            {assignedAt && (
              <span className="text-xs text-muted-foreground">
                {formatDate(assignedAt instanceof Date ? assignedAt.toISOString() : assignedAt)}
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={onRevoke}
              className="h-7 px-2 text-xs"
              disabled={!onRevoke}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Revoke
            </Button>
          </>
        ) : (
          // FR-006: Transfer Ownership button only visible when connected wallet is current owner
          isCurrentUser &&
          onTransferOwnership && (
            <Button
              size="sm"
              variant="outline"
              onClick={onTransferOwnership}
              className="h-7 px-3 text-xs border-blue-600 text-blue-700 hover:bg-blue-50"
            >
              <Crown className="h-3 w-3 mr-1" />
              Transfer Ownership
            </Button>
          )
        )}
      </div>
    </div>
  );
}
