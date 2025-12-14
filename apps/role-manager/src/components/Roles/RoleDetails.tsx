/**
 * RoleDetails Component
 * Feature: 008-roles-page-layout, 009-roles-page-data
 *
 * Right panel showing selected role details:
 * - Role name with icon (Crown for Owner, Shield for others)
 * - Role description (static display with Edit button)
 * - "Assigned Accounts (N)" header with "+ Assign" button (non-owner only)
 * - List of AccountRow components
 * - Empty state: "No accounts assigned to this role" (centered, py-8, text-muted)
 *
 * Updated in spec 009 (T034) to accept RoleWithDescription type.
 * Phase 6: Edit button opens EditRoleDialog for description editing.
 */

import { Crown, Pencil, Plus } from 'lucide-react';

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
  /** Handler to open edit dialog (Phase 6) */
  onEdit?: () => void;
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
  onEdit,
  onAssign,
  onRevoke,
  onTransferOwnership,
  className,
}: RoleDetailsProps) {
  const hasAccounts = accounts.length > 0;

  return (
    <div className={cn(className)}>
      <CardHeader className="shrink-0 pt-6 pb-4">
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
            {/* Description display */}
            <div className="mt-1">
              {role.description ? (
                <CardDescription>{role.description}</CardDescription>
              ) : (
                <CardDescription className="text-muted-foreground/60 italic">
                  No description
                </CardDescription>
              )}
            </div>
          </div>
          {/* Edit button */}
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit} aria-label="Edit role">
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-6">
        {/* Assigned Accounts */}
        <div>
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h3 className="text-sm font-medium">Assigned Accounts ({accounts.length})</h3>
            {!role.isOwnerRole && (
              <Button size="sm" onClick={onAssign} disabled={!onAssign}>
                <Plus className="h-4 w-4 mr-1" />
                Assign
              </Button>
            )}
          </div>
          <div className="border rounded-lg divide-y max-h-[460px] overflow-y-auto">
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
