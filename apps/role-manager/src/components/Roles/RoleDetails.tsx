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
  ExpirationMetadata,
  OwnershipState,
  PendingAdminTransfer,
  PendingOwnershipTransfer,
} from '@openzeppelin/ui-types';
import { cn } from '@openzeppelin/ui-utils';

import type { MutationPreviewData } from '../../hooks/useContractData';
import type { RoleWithDescription } from '../../types/roles';
import { AdminDelayPanel } from '../Admin/AdminDelayPanel';
import { FadingOverlay, GhostAccountRow, GhostPendingTransfer } from '../Shared/MutationPreviews';
import { RoleNameDisplay } from '../Shared/RoleNameDisplay';
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
  /** Adapter-driven expiration metadata for ownership pending transfers */
  ownershipExpirationMetadata?: ExpirationMetadata;
  /** Adapter-driven expiration metadata for admin pending transfers */
  adminExpirationMetadata?: ExpirationMetadata;

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

  // =============================================================================
  // Feature 017: Renounce Operations
  // =============================================================================

  /** Feature 017 (T052): Whether contract supports renouncing ownership */
  hasRenounceOwnership?: boolean;
  /** Feature 017 (T052): Renounce ownership handler */
  onRenounceOwnership?: () => void;
  /** Feature 017 (T053): Whether contract supports renouncing roles */
  hasRenounceRole?: boolean;
  /** Feature 017 (T053): Renounce role handler */
  onRenounceRole?: (roleId: string, roleName: string) => void;

  // =============================================================================
  // Feature 017: Cancel Admin Transfer & Admin Delay (US7)
  // =============================================================================

  /** Feature 017 (T066): Whether contract supports canceling pending admin transfer */
  hasCancelAdminTransfer?: boolean;
  /** Feature 017 (T066): Cancel admin transfer handler (only when pending) */
  onCancelAdminTransfer?: () => void;
  /** Feature 017 (T067): Whether contract supports admin delay management */
  hasAdminDelayManagement?: boolean;
  /** Feature 017 (T067, T068): Delay info for AdminDelayPanel (from adminInfo.delayInfo) */
  delayInfo?: { currentDelay: number; pendingDelay?: { newDelay: number; effectAt: number } };
  /** Feature 017 (T067): Open change-delay dialog */
  onChangeDelayClick?: () => void;
  /** Feature 017 (T067): Open rollback dialog */
  onRollbackClick?: () => void;

  /** Active mutation preview data for context-specific inline indicators */
  mutationPreview?: MutationPreviewData | null;

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
  ownershipExpirationMetadata,
  adminExpirationMetadata,
  // Feature 016: Admin-related props
  pendingAdminTransfer,
  adminState,
  onAcceptAdminTransfer,
  canAcceptAdminTransfer,
  pendingAdminRecipientUrl,
  onTransferAdmin,
  // Feature 017: Renounce props
  hasRenounceOwnership,
  onRenounceOwnership,
  hasRenounceRole,
  onRenounceRole,
  // Feature 017 US7: Cancel admin transfer & admin delay
  hasCancelAdminTransfer,
  onCancelAdminTransfer,
  hasAdminDelayManagement,
  delayInfo,
  onChangeDelayClick,
  onRollbackClick,
  // Reactivity feedback
  mutationPreview,
  className,
}: RoleDetailsProps) {
  const hasAccounts = accounts.length > 0;

  // ---------------------------------------------------------------------------
  // Mutation preview helpers — derive context-specific visibility from the
  // central preview data. Each helper is only true when the preview matches
  // the currently selected role.
  // ---------------------------------------------------------------------------

  const previewType = mutationPreview?.type;
  const previewArgs = mutationPreview?.args;
  const previewRoleId = previewArgs?.roleId as string | undefined;

  // Grant: ghost row for a new member being added to THIS role
  const isGrantPreview = previewType === 'grantRole' && previewRoleId === role.roleId;
  const grantPreviewAddress = isGrantPreview ? (previewArgs?.account as string) : null;

  // Revoke / renounce role: fading overlay on the specific member in THIS role
  const isRemovePreview =
    (previewType === 'revokeRole' || previewType === 'renounceRole') &&
    previewRoleId === role.roleId;
  const removePreviewAddress = isRemovePreview
    ? (previewArgs?.account as string)?.toLowerCase()
    : null;

  // Renounce ownership: fading overlay on the owner row
  const isRenounceOwnershipPreview = previewType === 'renounceOwnership' && role.isOwnerRole;

  // Transfer ownership: ghost pending transfer (only when no real pending exists)
  const isTransferOwnershipPreview =
    previewType === 'transferOwnership' && role.isOwnerRole && !pendingTransfer;

  // Transfer admin: ghost pending transfer (only when no real pending exists)
  const isTransferAdminPreview =
    previewType === 'transferAdmin' && role.isAdminRole && !pendingAdminTransfer;

  // Change admin delay: ghost pending delay (only when no real pending exists)
  const isChangeDelayPreview =
    previewType === 'changeAdminDelay' && role.isAdminRole && !delayInfo?.pendingDelay;

  // Rollback admin delay: fading overlay on the pending delay box
  const isRollbackDelayPreview = previewType === 'rollbackAdminDelay' && role.isAdminRole;

  // Cancel admin transfer: fading overlay on the pending transfer section
  const isCancelAdminPreview = previewType === 'cancelAdmin' && role.isAdminRole;

  // Accept ownership: fading overlay on the pending ownership transfer
  const isAcceptOwnershipPreview = previewType === 'acceptOwnership' && role.isOwnerRole;

  // Accept admin: fading overlay on the pending admin transfer
  const isAcceptAdminPreview = previewType === 'acceptAdmin' && role.isAdminRole;

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
              <CardTitle>
                <RoleNameDisplay
                  roleName={role.roleName}
                  roleId={role.roleId}
                  isHashDisplay={role.isHashDisplay}
                />
              </CardTitle>
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
          <div className="border rounded-lg divide-y max-h-[460px] overflow-y-auto [clip-path:inset(0_round_0.5rem)]">
            {/* Ghost row for grantRole — prepended because new accounts appear at the top */}
            {grantPreviewAddress && <GhostAccountRow address={grantPreviewAddress} />}

            {hasAccounts ? (
              accounts.map((account) => {
                const isFading =
                  (removePreviewAddress !== null &&
                    account.address.toLowerCase() === removePreviewAddress) ||
                  (isRenounceOwnershipPreview && account.isCurrentUser);

                return (
                  <div key={account.address} className="relative">
                    <AccountRow
                      address={account.address}
                      assignedAt={account.assignedAt}
                      isCurrentUser={account.isCurrentUser}
                      isOwnerRole={role.isOwnerRole}
                      isAdminRole={role.isAdminRole}
                      explorerUrl={account.explorerUrl}
                      onRevoke={onRevoke ? () => onRevoke(account.address) : undefined}
                      onTransferOwnership={onTransferOwnership}
                      onTransferAdmin={onTransferAdmin}
                      hasRenounceOwnership={hasRenounceOwnership}
                      onRenounceOwnership={onRenounceOwnership}
                      hasRenounceRole={hasRenounceRole}
                      onRenounceRole={
                        onRenounceRole
                          ? () => onRenounceRole(role.roleId, role.roleName)
                          : undefined
                      }
                    />
                    {isFading && <FadingOverlay />}
                  </div>
                );
              })
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
              <div className="relative rounded-lg [clip-path:inset(0_round_0.5rem)]">
                <PendingTransferInfo
                  pendingRecipient={pendingTransfer.pendingOwner}
                  pendingRecipientUrl={pendingRecipientUrl}
                  expirationBlock={pendingTransfer.expirationBlock}
                  isExpired={ownershipState === 'expired'}
                  canAccept={canAcceptOwnership}
                  onAccept={onAcceptOwnership}
                  currentBlock={currentBlock}
                  expirationMetadata={ownershipExpirationMetadata}
                />
                {/* Fading overlay when accept ownership is pending */}
                {isAcceptOwnershipPreview && <FadingOverlay variant="info" />}
              </div>
            )}

          {/* Ghost preview: ownership transfer being confirmed */}
          {isTransferOwnershipPreview && (
            <GhostPendingTransfer
              recipient={previewArgs?.newOwner as string}
              transferLabel="Ownership"
            />
          )}

          {/* Feature 016: Pending Transfer Info for Admin role */}
          {role.isAdminRole &&
            pendingAdminTransfer &&
            (adminState === 'pending' || adminState === 'expired') && (
              <div className="relative rounded-lg [clip-path:inset(0_round_0.5rem)]">
                <PendingTransferInfo
                  pendingRecipient={pendingAdminTransfer.pendingAdmin}
                  pendingRecipientUrl={pendingAdminRecipientUrl}
                  expirationBlock={pendingAdminTransfer.expirationBlock}
                  isExpired={adminState === 'expired'}
                  canAccept={canAcceptAdminTransfer}
                  onAccept={onAcceptAdminTransfer}
                  currentBlock={currentBlock}
                  expirationMetadata={adminExpirationMetadata}
                  transferLabel="Admin Role"
                  recipientLabel="Admin"
                />
                {/* Fading overlay when cancel is pending */}
                {isCancelAdminPreview && <FadingOverlay />}
                {/* Fading overlay when accept admin is pending */}
                {isAcceptAdminPreview && <FadingOverlay variant="info" />}
                {/* Feature 017 (T066): Cancel Admin Transfer when pending */}
                {adminState === 'pending' &&
                  hasCancelAdminTransfer &&
                  onCancelAdminTransfer &&
                  !isCancelAdminPreview && (
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={onCancelAdminTransfer}
                        className="text-amber-700 border-amber-200 hover:bg-amber-50"
                      >
                        Cancel Admin Transfer
                      </Button>
                    </div>
                  )}
              </div>
            )}

          {/* Ghost preview: admin transfer being confirmed */}
          {isTransferAdminPreview && (
            <GhostPendingTransfer
              recipient={previewArgs?.newAdmin as string}
              transferLabel="Admin Role"
            />
          )}

          {/* Feature 017 (T067): Admin Delay Panel for Admin role when capability present */}
          {role.isAdminRole &&
            hasAdminDelayManagement &&
            delayInfo &&
            onChangeDelayClick &&
            onRollbackClick && (
              <div className="mt-4 relative rounded-lg [clip-path:inset(0_round_0.5rem)]">
                <AdminDelayPanel
                  delayInfo={delayInfo}
                  onChangeDelayClick={onChangeDelayClick}
                  onRollbackClick={onRollbackClick}
                  ghostNewDelay={
                    isChangeDelayPreview ? (previewArgs?.newDelay as number) : undefined
                  }
                />
                {/* Fading overlay on existing pending delay when rollback is in progress */}
                {isRollbackDelayPreview && delayInfo.pendingDelay && (
                  <FadingOverlay className="rounded-lg" />
                )}
              </div>
            )}
        </div>
      </CardContent>
    </div>
  );
}
