/**
 * AccountRow Component
 * Feature: 008-roles-page-layout
 *
 * Displays account with AddressDisplay from UI Builder for consistent styling.
 */

import { Crown, Trash2 } from 'lucide-react';

import { AddressDisplay, Button } from '@openzeppelin/ui-builder-ui';
import { cn } from '@openzeppelin/ui-builder-utils';

import type { RoleAccount } from '../../types/roles';
import { formatDate } from '../../utils/date';

export interface AccountRowProps {
  account: RoleAccount;
  isOwnerRole: boolean;
  onAction?: () => void;
  className?: string;
}

export function AccountRow({ account, isOwnerRole, onAction, className }: AccountRowProps) {
  return (
    <div className={cn('p-3 flex items-center justify-between hover:bg-muted/50', className)}>
      <div className="flex items-center gap-2">
        <AddressDisplay
          address={account.address}
          truncate={true}
          startChars={10}
          endChars={8}
          showCopyButton={true}
        />
        {account.isCurrentUser && (
          <span className="text-xs bg-blue-50 text-blue-700 border border-blue-300 rounded-full px-2 py-0.5">
            You
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {!isOwnerRole ? (
          <>
            {account.assignedAt && (
              <span className="text-xs text-muted-foreground">
                {formatDate(account.assignedAt)}
              </span>
            )}
            <Button size="sm" variant="outline" onClick={onAction} className="h-7 px-2 text-xs">
              <Trash2 className="h-3 w-3 mr-1" />
              Revoke
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={onAction}
            className="h-7 px-3 text-xs border-blue-600 text-blue-700 hover:bg-blue-50"
          >
            <Crown className="h-3 w-3 mr-1" />
            Transfer Ownership
          </Button>
        )}
      </div>
    </div>
  );
}
