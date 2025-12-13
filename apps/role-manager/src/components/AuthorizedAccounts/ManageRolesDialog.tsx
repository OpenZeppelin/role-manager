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
 * - T056: Close-during-transaction confirmation prompt (FR-041)
 * - T059: Wallet disconnection handling (FR-039)
 * - T060: Loading skeleton states (FR-034)
 * - T061: Empty state handling (FR-037)
 *
 * Key behaviors:
 * - Single change per transaction (auto-revert constraint)
 * - Self-revoke warning when revoking own role
 * - Transaction state feedback (pending, success, error, cancelled)
 * - Auto-close after 1.5s success display
 * - Confirmation prompt when closing during transaction
 * - Wallet disconnection alert with disabled submit
 * - Loading skeletons during data fetch
 * - Empty state when no roles defined
 */

import { useCallback, useState } from 'react';

import { useDerivedAccountStatus } from '@openzeppelin/ui-builder-react-core';
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
import { useRolesPageData } from '../../hooks/useRolesPageData';
import {
  ConfirmCloseDialog,
  DialogCancelledState,
  DialogErrorState,
  DialogPendingState,
  DialogSuccessState,
  NoRolesEmptyState,
  RoleCheckboxList,
  RoleListSkeleton,
  SelfRevokeWarning,
  WalletDisconnectedAlert,
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
  // Track confirmation dialog state (T056 - FR-041)
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  // Get loading state and available roles count for T060/T061
  const { isRolesLoading, roles } = useRolesPageData();
  const availableRolesCount = roles.filter((r) => !r.isOwnerRole).length;

  // Get wallet connection status (T059 - FR-039)
  const { address: connectedAddress } = useDerivedAccountStatus();
  const isWalletConnected = !!connectedAddress;

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

  // Handle dialog close with confirmation during transaction (T056 - FR-041)
  const handleClose = useCallback(() => {
    // Show confirmation prompt during pending/confirming states
    if (step === 'pending' || step === 'confirming') {
      setShowConfirmClose(true);
      return;
    }
    reset();
    onOpenChange(false);
  }, [step, reset, onOpenChange]);

  // Confirm close during transaction (T056 - FR-041)
  const handleConfirmClose = useCallback(() => {
    setShowConfirmClose(false);
    reset();
    onOpenChange(false);
  }, [reset, onOpenChange]);

  // Cancel confirmation and return to transaction
  const handleCancelConfirmClose = useCallback(() => {
    setShowConfirmClose(false);
  }, []);

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
            canSubmit={canSubmit && isWalletConnected}
            submitLabel={submitLabel}
            showSelfRevokeWarning={showSelfRevokeWarning}
            isLoading={isRolesLoading}
            isWalletConnected={isWalletConnected}
            hasNoRoles={availableRolesCount === 0}
          />
        );
    }
  };

  return (
    <>
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

      {/* Confirmation dialog when closing during transaction (T056 - FR-041) */}
      <ConfirmCloseDialog
        open={showConfirmClose}
        onCancel={handleCancelConfirmClose}
        onConfirm={handleConfirmClose}
      />
    </>
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
  /** Whether role data is loading (T060 - FR-034) */
  isLoading: boolean;
  /** Whether wallet is connected (T059 - FR-039) */
  isWalletConnected: boolean;
  /** Whether contract has no roles defined (T061 - FR-037) */
  hasNoRoles: boolean;
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
  isLoading,
  isWalletConnected,
  hasNoRoles,
}: ManageRolesFormContentProps) {
  return (
    <div className="space-y-4 py-4">
      {/* Wallet Disconnection Alert (T059 - FR-039) */}
      {!isWalletConnected && <WalletDisconnectedAlert />}

      {/* Account Address Display */}
      <div className="space-y-1.5">
        <Label className="text-sm text-muted-foreground">Account</Label>
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <AddressDisplay address={accountAddress} truncate={true} showCopyButton={true} />
        </div>
      </div>

      {/* Role List - with loading and empty states */}
      <div className="space-y-1.5">
        <Label className="text-sm text-muted-foreground">Roles</Label>
        {isLoading ? (
          // Loading skeleton (T060 - FR-034)
          <RoleListSkeleton count={3} />
        ) : hasNoRoles ? (
          // Empty state when no roles defined (T061 - FR-037)
          <NoRolesEmptyState />
        ) : (
          // Role checkbox list
          <RoleCheckboxList items={roleItems} onToggle={onToggleRole} />
        )}
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
            disabled={!canSubmit || isLoading}
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
