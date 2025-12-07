/**
 * RoleDetails Component
 * Feature: 008-roles-page-layout, 009-roles-page-data
 *
 * Right panel showing selected role details:
 * - Role name with icon (Crown for Owner, Shield for others)
 * - Role description (with optional inline editing - Phase 6)
 * - "Assigned Accounts (N)" header with "+ Assign" button (non-owner only)
 * - List of AccountRow components
 * - Empty state: "No accounts assigned to this role" (centered, py-8, text-muted)
 *
 * Updated in spec 009 (T034) to accept RoleWithDescription type.
 */

import { Crown, Plus } from 'lucide-react';

import {
  Button,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openzeppelin/ui-builder-ui';
import { cn } from '@openzeppelin/ui-builder-utils';

import type { RoleWithDescription } from '../../types/roles';
import { AccountRow } from './AccountRow';

/**
 * Account data for display in role details
 */
export interface AccountData {
  /** Blockchain address */
  address: string;
  /** Assignment date (if available from adapter) */
  assignedAt?: Date;
  /** Whether this is the connected user */
  isCurrentUser: boolean;
}

/**
 * Props for RoleDetails component - updated for real data (T034)
 */
export interface RoleDetailsProps {
  /** Selected role data */
  role: RoleWithDescription;
  /** Member accounts with metadata */
  accounts: AccountData[];
  /** Whether connected user has this role */
  isConnected?: boolean;
  /** Custom description update handler (Phase 6) */
  onDescriptionChange?: (description: string) => Promise<void>;
  /** Assign action (placeholder for future) */
  onAssign?: () => void;
  /** Revoke action (placeholder for future) */
  onRevoke?: (address: string) => void;
  /** Transfer ownership action (placeholder for future) */
  onTransferOwnership?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * RoleDetails - Details panel for selected role
 */
export function RoleDetails({
  role,
  accounts,
  isConnected,
  onDescriptionChange: _onDescriptionChange, // TODO: Use in Phase 6 for inline editing
  onAssign,
  onRevoke,
  onTransferOwnership,
  className,
}: RoleDetailsProps) {
  const hasAccounts = accounts.length > 0;

  return (
    <div className={cn(className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {role.isOwnerRole && (
                <Crown className="h-4 w-4 text-blue-600" aria-label="Owner role" />
              )}
              <CardTitle>{role.roleName}</CardTitle>
              {isConnected && (
                <span className="text-xs bg-blue-50 text-blue-700 border border-blue-300 rounded-full px-2 py-0.5">
                  Connected
                </span>
              )}
            </div>
            <div className="mt-1">
              {role.description ? (
                <CardDescription>
                  {role.description}
                  {role.isCustomDescription && (
                    <span className="ml-1 text-xs text-muted-foreground/60">(custom)</span>
                  )}
                </CardDescription>
              ) : (
                <CardDescription className="text-muted-foreground/60 italic">
                  Click to add description
                </CardDescription>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Assigned Accounts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Assigned Accounts ({accounts.length})</h3>
            {!role.isOwnerRole && (
              <Button size="sm" onClick={onAssign} disabled={!onAssign}>
                <Plus className="h-4 w-4 mr-1" />
                Assign
              </Button>
            )}
          </div>
          <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
            {hasAccounts ? (
              accounts.map((account) => (
                <AccountRow
                  key={account.address}
                  address={account.address}
                  assignedAt={account.assignedAt}
                  isCurrentUser={account.isCurrentUser}
                  isOwnerRole={role.isOwnerRole}
                  onRevoke={onRevoke ? () => onRevoke(account.address) : undefined}
                  onTransferOwnership={onTransferOwnership}
                />
              ))
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No accounts assigned to this role
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </div>
  );
}
