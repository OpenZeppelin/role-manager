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

import { Crown, Pencil, Plus, Shield } from 'lucide-react';

import {
  Button,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openzeppelin/ui-components';
import type {
  AdminState,
  OwnershipState,
  PendingAdminTransfer,
  PendingOwnershipTransfer,
} from '@openzeppelin/ui-types';
import { cn } from '@openzeppelin/ui-utils';

import type { RoleWithDescription } from '../../types/roles';
import { AccountRow } from './AccountRow';
import { PendingTransferInfo } from './PendingTransferInfo';

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
  /** Explorer URL for the address */
  explorerUrl?: string;
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
  /** Feature 015 (T020): Accept ownership action (two-step transfer) */
  onAcceptOwnership?: () => void;
  /** Feature 015 (T020): Whether connected wallet can accept ownership */
  canAcceptOwnership?: boolean;
  /**
   * Feature 015 Phase 6 (T026, T027): Pending transfer info for Owner role display
   * Includes pendingOwner address and expiration block
   */
  pendingTransfer?: PendingOwnershipTransfer | null;
  /**
   * Feature 015 Phase 6 (T028): Ownership state for status display
   * 'pending' or 'expired' will trigger PendingTransferInfo display
   */
  ownershipState?: OwnershipState | null;
  /** Explorer URL for the pending recipient address */
  pendingRecipientUrl?: string;
  /** Current block/ledger number for expiration countdown */
  currentBlock?: number | null;

  // =============================================================================
  // Feature 016: Two-Step Admin Assignment
  // =============================================================================

  /**
   * Feature 016: Pending admin transfer info for Admin role display
   * Includes pendingAdmin address and expiration block
   */
  pendingAdminTransfer?: PendingAdminTransfer | null;
  /**
   * Feature 016: Admin state for status display
   * 'pending' or 'expired' will trigger PendingTransferInfo display
   */
  adminState?: AdminState | null;
  /** Feature 016: Accept admin transfer action */
  onAcceptAdminTransfer?: () => void;
  /** Feature 016: Whether connected wallet can accept admin transfer */
  canAcceptAdminTransfer?: boolean;
  /** Feature 016: Explorer URL for the pending admin recipient address */
  pendingAdminRecipientUrl?: string;
  /** Feature 016: Transfer admin action */
  onTransferAdmin?: () => void;

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
  onAcceptOwnership,
  canAcceptOwnership,
  pendingTransfer,
  ownershipState,
  pendingRecipientUrl,
  currentBlock,
  // Feature 016: Admin-related props
  pendingAdminTransfer,
  adminState,
  onAcceptAdminTransfer,
  canAcceptAdminTransfer,
  pendingAdminRecipientUrl,
  onTransferAdmin,
  className,
}: RoleDetailsProps) {
  const hasAccounts = accounts.length > 0;

  return (
    <div className={cn(className)}>
      <CardHeader className="shrink-0 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {role.isOwnerRole && (
                <Crown className="h-4 w-4 text-blue-600" aria-label="Owner role" />
              )}
              {role.isAdminRole && (
                <Shield className="h-4 w-4 text-purple-600" aria-label="Admin role" />
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
            {/* Only show Assign button for enumerable roles (not Owner or Contract Admin) */}
            {/* Owner and Contract Admin are single-account roles transferred via two-step process */}
            {!role.isOwnerRole && !role.isAdminRole && (
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
                  isAdminRole={role.isAdminRole}
                  explorerUrl={account.explorerUrl}
                  onRevoke={onRevoke ? () => onRevoke(account.address) : undefined}
                  onTransferOwnership={onTransferOwnership}
                  onTransferAdmin={onTransferAdmin}
                />
              ))
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {/* T055: Show "No Admin (Renounced)" for renounced admin state */}
                {role.isAdminRole && adminState === 'renounced'
                  ? 'No Admin (Renounced)'
                  : 'No accounts assigned to this role'}
              </div>
            )}
          </div>

          {/* Feature 015 Phase 6 (T026, T027, T028): Pending Transfer Info for Owner role */}
          {role.isOwnerRole &&
            pendingTransfer &&
            (ownershipState === 'pending' || ownershipState === 'expired') && (
              <PendingTransferInfo
                pendingRecipient={pendingTransfer.pendingOwner}
                pendingRecipientUrl={pendingRecipientUrl}
                expirationBlock={pendingTransfer.expirationBlock}
                isExpired={ownershipState === 'expired'}
                canAccept={canAcceptOwnership}
                onAccept={onAcceptOwnership}
                currentBlock={currentBlock}
              />
            )}

          {/* Feature 016: Pending Transfer Info for Admin role */}
          {role.isAdminRole &&
            pendingAdminTransfer &&
            (adminState === 'pending' || adminState === 'expired') && (
              <PendingTransferInfo
                pendingRecipient={pendingAdminTransfer.pendingAdmin}
                pendingRecipientUrl={pendingAdminRecipientUrl}
                expirationBlock={pendingAdminTransfer.expirationBlock}
                isExpired={adminState === 'expired'}
                canAccept={canAcceptAdminTransfer}
                onAccept={onAcceptAdminTransfer}
                currentBlock={currentBlock}
                transferLabel="Admin Role"
                recipientLabel="Admin"
              />
            )}
        </div>
      </CardContent>
    </div>
  );
}
