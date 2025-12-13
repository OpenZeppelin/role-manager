/**
 * RevokeRoleDialog Component
 * Feature: 014-role-grant-revoke
 *
 * Dialog for revoking a role from an account with confirmation.
 * Accessible from the Roles page via the "Revoke" button on account rows.
 *
 * Implements:
 * - T051: Dialog shell with open/close handling
 * - T052: Read-only account/role display, SelfRevokeWarning, destructive revoke button
 * - T053: Transaction state rendering using DialogTransactionStates
 *
 * Key behaviors:
 * - Pre-filled account and role from context (read-only)
 * - Self-revoke warning when connected wallet matches target account
 * - Destructive button styling for revoke action
 * - Transaction state feedback (pending, success, error, cancelled)
 * - Auto-close after 1.5s success display
 */

import { useCallback, useEffect, useRef } from 'react';

import {
  AddressDisplay,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
} from '@openzeppelin/ui-builder-ui';

import { useRevokeRoleDialog } from '../../hooks/useRevokeRoleDialog';
import {
  DialogCancelledState,
  DialogErrorState,
  DialogPendingState,
  DialogSuccessState,
  SelfRevokeWarning,
} from '../Shared';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for RevokeRoleDialog component
 */
export interface RevokeRoleDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Account address to revoke from (pre-filled) */
  accountAddress: string;
  /** Role ID to revoke */
  roleId: string;
  /** Role name for display */
  roleName: string;
  /** Callback when transaction succeeds (for parent to refresh data) */
  onSuccess?: () => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * RevokeRoleDialog - Dialog for revoking a role from an account with confirmation
 *
 * @example
 * ```tsx
 * <RevokeRoleDialog
 *   open={revokeDialogOpen}
 *   onOpenChange={setRevokeDialogOpen}
 *   accountAddress={targetAccount.address}
 *   roleId={selectedRole.roleId}
 *   roleName={selectedRole.roleName}
 *   onSuccess={() => refetch()}
 * />
 * ```
 */
export function RevokeRoleDialog({
  open,
  onOpenChange,
  accountAddress,
  roleId,
  roleName,
  onSuccess,
}: RevokeRoleDialogProps) {
  // Dialog state and logic
  const {
    step,
    errorMessage,
    txStatus,
    isWalletConnected,
    showSelfRevokeWarning,
    submit,
    retry,
    reset,
  } = useRevokeRoleDialog({
    accountAddress,
    roleId,
    roleName,
    onClose: () => onOpenChange(false),
    onSuccess,
  });

  // Reset state when dialog opens (to clear any stale success/error state)
  const wasOpenRef = useRef(open);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      // Dialog just opened - reset to fresh state
      reset();
    }
    wasOpenRef.current = open;
  }, [open, reset]);

  // Handle dialog close
  const handleClose = useCallback(() => {
    // Don't allow closing during pending/confirming states
    if (step === 'pending' || step === 'confirming') {
      return;
    }
    reset();
    onOpenChange(false);
  }, [step, reset, onOpenChange]);

  // Handle cancel button
  const handleCancel = useCallback(() => {
    handleClose();
  }, [handleClose]);

  // Handle back from cancelled state
  const handleBackFromCancelled = useCallback(() => {
    reset();
  }, [reset]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    await submit();
  }, [submit]);

  // =============================================================================
  // Render Content Based on Step
  // =============================================================================

  const renderContent = () => {
    switch (step) {
      case 'pending':
      case 'confirming':
        return (
          <DialogPendingState
            title="Revoking Role..."
            description="Please confirm the transaction in your wallet"
            txStatus={txStatus}
          />
        );

      case 'success':
        return (
          <DialogSuccessState
            title="Role Revoked!"
            description={`${roleName} role has been revoked from the account.`}
          />
        );

      case 'error':
        return (
          <DialogErrorState
            title="Transaction Failed"
            message={errorMessage || 'An error occurred while processing the transaction.'}
            canRetry={true}
            onRetry={retry}
            onCancel={handleCancel}
          />
        );

      case 'cancelled':
        return (
          <DialogCancelledState
            message="The transaction was cancelled. You can try again or close the dialog."
            onBack={handleBackFromCancelled}
            onClose={handleClose}
          />
        );

      case 'form':
      default:
        return (
          <RevokeRoleConfirmContent
            accountAddress={accountAddress}
            roleName={roleName}
            isWalletConnected={isWalletConnected}
            showSelfRevokeWarning={showSelfRevokeWarning}
            onCancel={handleCancel}
            onSubmit={handleSubmit}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Revoke Role</DialogTitle>
          <DialogDescription>
            Are you sure you want to revoke this role? This action will remove the account&apos;s
            access permissions.
          </DialogDescription>
        </DialogHeader>

        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// RevokeRoleConfirmContent (Internal)
// =============================================================================

interface RevokeRoleConfirmContentProps {
  accountAddress: string;
  roleName: string;
  isWalletConnected: boolean;
  showSelfRevokeWarning: boolean;
  onCancel: () => void;
  onSubmit: () => Promise<void>;
}

function RevokeRoleConfirmContent({
  accountAddress,
  roleName,
  isWalletConnected,
  showSelfRevokeWarning,
  onCancel,
  onSubmit,
}: RevokeRoleConfirmContentProps) {
  // Disable submit if wallet not connected
  const canSubmit = isWalletConnected;

  return (
    <div className="space-y-4 py-4">
      {/* Account Display (Read-only) */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Account</Label>
        <div className="rounded-md border bg-muted/50 px-3 py-2">
          <AddressDisplay address={accountAddress} showCopyButton={true} />
        </div>
      </div>

      {/* Role Display (Read-only) */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Role</Label>
        <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">{roleName}</div>
      </div>

      {/* Self-Revoke Warning */}
      {showSelfRevokeWarning && <SelfRevokeWarning roleName={roleName} />}

      {/* Action Buttons */}
      <DialogFooter className="gap-2 sm:gap-0 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          aria-label="Cancel and close dialog"
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={!canSubmit}
          onClick={onSubmit}
          aria-label="Revoke role from account"
        >
          Revoke Role
        </Button>
      </DialogFooter>
    </div>
  );
}
