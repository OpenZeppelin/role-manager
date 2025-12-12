/**
 * ManageRolesDialog Component
 * Feature: 014-role-grant-revoke
 *
 * Dialog for managing roles for a specific account.
 * Displays a checkbox list of available roles where:
 * - Checked = account has the role
 * - Unchecked = account doesn't have the role
 *
 * Implements:
 * - T024: Dialog shell with open/close handling
 * - T025: Form content with RoleCheckboxList, SelfRevokeWarning
 * - T026: Transaction state rendering using DialogTransactionStates
 *
 * Key behaviors:
 * - Single change per transaction (auto-revert constraint)
 * - Self-revoke warning when revoking own role
 * - Transaction state feedback (pending, success, error, cancelled)
 * - Auto-close after 1.5s success display
 */

import { useCallback } from 'react';

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

import { useManageRolesDialog } from '../../hooks/useManageRolesDialog';
import {
  DialogCancelledState,
  DialogErrorState,
  DialogPendingState,
  DialogSuccessState,
  RoleCheckboxList,
  SelfRevokeWarning,
} from '../Shared';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for ManageRolesDialog component
 */
export interface ManageRolesDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Target account address */
  accountAddress: string;
  /** Callback when transaction succeeds (for parent to refresh data) */
  onSuccess?: () => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * ManageRolesDialog - Dialog for managing an account's role assignments
 *
 * @example
 * ```tsx
 * <ManageRolesDialog
 *   open={!!manageRolesAccount}
 *   onOpenChange={(open) => !open && setManageRolesAccount(null)}
 *   accountAddress={manageRolesAccount ?? ''}
 *   onSuccess={() => refetch()}
 * />
 * ```
 */
export function ManageRolesDialog({
  open,
  onOpenChange,
  accountAddress,
  onSuccess,
}: ManageRolesDialogProps) {
  // Dialog state and logic
  const {
    roleItems,
    pendingChange,
    step,
    errorMessage,
    txStatus,
    toggleRole,
    submit,
    retry,
    reset,
    canSubmit,
    submitLabel,
    showSelfRevokeWarning,
  } = useManageRolesDialog({
    accountAddress,
    onClose: () => onOpenChange(false),
    onSuccess,
  });

  // Handle dialog close
  const handleClose = useCallback(() => {
    // Don't allow closing during pending/confirming states
    if (step === 'pending' || step === 'confirming') {
      // Could show confirmation prompt here per FR-041
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
    // Return to form state with preserved pending change
    reset();
  }, [reset]);

  // =============================================================================
  // Render Content Based on Step
  // =============================================================================

  const renderContent = () => {
    switch (step) {
      case 'pending':
      case 'confirming':
        return (
          <DialogPendingState
            title={pendingChange?.type === 'grant' ? 'Granting Role...' : 'Revoking Role...'}
            description="Please confirm the transaction in your wallet"
            txStatus={txStatus}
          />
        );

      case 'success':
        return (
          <DialogSuccessState
            title={pendingChange?.type === 'grant' ? 'Role Granted!' : 'Role Revoked!'}
            description={`${pendingChange?.roleName} role has been ${pendingChange?.type === 'grant' ? 'granted to' : 'revoked from'} the account.`}
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
          <ManageRolesFormContent
            accountAddress={accountAddress}
            roleItems={roleItems}
            pendingChange={pendingChange}
            onToggleRole={toggleRole}
            onCancel={handleCancel}
            onSubmit={submit}
            canSubmit={canSubmit}
            submitLabel={submitLabel}
            showSelfRevokeWarning={showSelfRevokeWarning}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Manage Roles</DialogTitle>
          <DialogDescription>
            Grant or revoke roles for this account. Only one role change can be made per
            transaction.
          </DialogDescription>
        </DialogHeader>

        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// ManageRolesFormContent (Internal)
// =============================================================================

interface ManageRolesFormContentProps {
  accountAddress: string;
  roleItems: ReturnType<typeof useManageRolesDialog>['roleItems'];
  pendingChange: ReturnType<typeof useManageRolesDialog>['pendingChange'];
  onToggleRole: (roleId: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
  submitLabel: string;
  showSelfRevokeWarning: boolean;
}

function ManageRolesFormContent({
  accountAddress,
  roleItems,
  pendingChange,
  onToggleRole,
  onCancel,
  onSubmit,
  canSubmit,
  submitLabel,
  showSelfRevokeWarning,
}: ManageRolesFormContentProps) {
  return (
    <div className="space-y-4 py-4">
      {/* Account Address Display */}
      <div className="space-y-1.5">
        <Label className="text-sm text-muted-foreground">Account</Label>
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <AddressDisplay address={accountAddress} truncate={true} showCopyButton={true} />
        </div>
      </div>

      {/* Role Checkbox List */}
      <div className="space-y-1.5">
        <Label className="text-sm text-muted-foreground">Roles</Label>
        <RoleCheckboxList items={roleItems} onToggle={onToggleRole} />
      </div>

      {/* Self-Revoke Warning */}
      {showSelfRevokeWarning && pendingChange && (
        <SelfRevokeWarning roleName={pendingChange.roleName} />
      )}

      {/* Action Buttons */}
      <DialogFooter className="gap-2 sm:gap-0">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          aria-label="Cancel and close dialog"
        >
          Cancel
        </Button>
        {pendingChange && (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            variant={pendingChange.type === 'revoke' ? 'destructive' : 'default'}
            aria-label={submitLabel}
          >
            {submitLabel}
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}
