/**
 * AssignRoleDialog Component
 * Feature: 014-role-grant-revoke
 *
 * Dialog for assigning a role to a new address.
 * Accessible from the Roles page via the "+ Assign" button.
 *
 * Implements:
 * - T037: Dialog shell with open/close handling
 * - T038: Form content with AddressField, role dropdown
 * - T039: react-hook-form integration for address validation
 * - T040: Transaction state rendering using DialogTransactionStates
 * - T057: Close-during-transaction confirmation prompt (FR-041)
 * - T059: Wallet disconnection handling (FR-039)
 * - T060: Loading skeleton states (FR-034)
 * - T061: Empty state handling (FR-037)
 *
 * Key behaviors:
 * - Address validation via adapter.isValidAddress()
 * - Role dropdown with pre-selected initial role
 * - Transaction state feedback (pending, success, error, cancelled)
 * - Auto-close after 1.5s success display
 * - Confirmation prompt when closing during transaction
 * - Wallet disconnection alert with disabled submit
 * - Loading skeletons during data fetch
 * - Empty state when no roles defined
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  AddressField,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  SelectField,
} from '@openzeppelin/ui-builder-ui';

import { getEcosystemAddressExample } from '@/core/ecosystems/registry';

import { useAssignRoleDialog } from '../../hooks/useAssignRoleDialog';
import type { AssignRoleFormData } from '../../hooks/useAssignRoleDialog';
import { useRolesPageData } from '../../hooks/useRolesPageData';
import { useSelectedContract } from '../../hooks/useSelectedContract';
import {
  ConfirmCloseDialog,
  DialogCancelledState,
  DialogErrorState,
  DialogPendingState,
  DialogSuccessState,
  NoRolesEmptyState,
  WalletDisconnectedAlert,
} from '../Shared';
import { Skeleton } from '../Shared/Skeleton';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for AssignRoleDialog component
 */
export interface AssignRoleDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Pre-selected role ID from context */
  initialRoleId: string;
  /** Pre-selected role name for display */
  initialRoleName: string;
  /** Callback when transaction succeeds (for parent to refresh data) */
  onSuccess?: () => void;
}

// =============================================================================
// Component
// =============================================================================

/**
 * AssignRoleDialog - Dialog for assigning a role to a new address
 *
 * @example
 * ```tsx
 * <AssignRoleDialog
 *   open={assignRoleOpen}
 *   onOpenChange={setAssignRoleOpen}
 *   initialRoleId={selectedRole.roleId}
 *   initialRoleName={selectedRole.roleName}
 *   onSuccess={() => refetch()}
 * />
 * ```
 */
export function AssignRoleDialog({
  open,
  onOpenChange,
  initialRoleId,
  initialRoleName,
  onSuccess,
}: AssignRoleDialogProps) {
  // Track confirmation dialog state (T057 - FR-041)
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  // Get loading state (T060 - FR-034)
  const { isRolesLoading, roles } = useRolesPageData();
  const availableRolesCount = roles.filter((r) => !r.isOwnerRole).length;
  const hasNoRoles = availableRolesCount === 0;

  // Dialog state and logic
  const { availableRoles, step, errorMessage, txStatus, isWalletConnected, submit, retry, reset } =
    useAssignRoleDialog({
      initialRoleId,
      onClose: () => onOpenChange(false),
      onSuccess,
    });

  // Get adapter for address validation
  const { adapter, isAdapterLoading } = useSelectedContract();

  // React Hook Form setup
  const form = useForm<AssignRoleFormData>({
    defaultValues: {
      address: '',
      roleId: initialRoleId,
    },
    mode: 'onChange',
  });

  // Transform available roles to SelectField options
  const roleOptions = useMemo(() => {
    return availableRoles.map((role) => ({
      value: role.roleId,
      label: role.roleName,
    }));
  }, [availableRoles]);

  // Reset state when dialog opens (to clear any stale success/error state)
  const wasOpenRef = useRef(open);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      // Dialog just opened - reset to fresh state
      reset();
      form.reset({ address: '', roleId: initialRoleId });
    }
    wasOpenRef.current = open;
  }, [open, reset, form, initialRoleId]);

  // Handle dialog close with confirmation during transaction (T057 - FR-041)
  const handleClose = useCallback(() => {
    // Show confirmation prompt during pending/confirming states
    if (step === 'pending' || step === 'confirming') {
      setShowConfirmClose(true);
      return;
    }
    reset();
    form.reset();
    onOpenChange(false);
  }, [step, reset, form, onOpenChange]);

  // Confirm close during transaction (T057 - FR-041)
  const handleConfirmClose = useCallback(() => {
    setShowConfirmClose(false);
    reset();
    form.reset();
    onOpenChange(false);
  }, [reset, form, onOpenChange]);

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
    reset();
  }, [reset]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: AssignRoleFormData) => {
      await submit(data);
    },
    [submit]
  );

  // Get selected role name for display
  const selectedRoleName = useMemo(() => {
    const selectedRole = availableRoles.find((r) => r.roleId === form.watch('roleId'));
    return selectedRole?.roleName ?? initialRoleName;
  }, [availableRoles, form, initialRoleName]);

  // =============================================================================
  // Render Content Based on Step
  // =============================================================================

  const renderContent = () => {
    switch (step) {
      case 'pending':
      case 'confirming':
        return (
          <DialogPendingState
            title="Granting Role..."
            description="Please confirm the transaction in your wallet"
            txStatus={txStatus}
          />
        );

      case 'success':
        return (
          <DialogSuccessState
            title="Role Assigned!"
            description={`${selectedRoleName} role has been granted to the address.`}
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
          <AssignRoleFormContent
            // Key forces re-mount when adapter becomes available, ensuring validation rules are updated
            key={adapter ? 'with-adapter' : 'no-adapter'}
            form={form}
            adapter={adapter}
            isAdapterLoading={isAdapterLoading}
            isWalletConnected={isWalletConnected}
            roleOptions={roleOptions}
            onCancel={handleCancel}
            onSubmit={handleSubmit}
            isRolesLoading={isRolesLoading}
            hasNoRoles={hasNoRoles}
          />
        );
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>
              Grant a role to a new address. Enter the address and select the role to assign.
            </DialogDescription>
          </DialogHeader>

          {renderContent()}
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog when closing during transaction (T057 - FR-041) */}
      <ConfirmCloseDialog
        open={showConfirmClose}
        onCancel={handleCancelConfirmClose}
        onConfirm={handleConfirmClose}
      />
    </>
  );
}

// =============================================================================
// AssignRoleFormContent (Internal)
// =============================================================================

interface AssignRoleFormContentProps {
  form: ReturnType<typeof useForm<AssignRoleFormData>>;
  adapter: ReturnType<typeof useSelectedContract>['adapter'];
  isAdapterLoading: boolean;
  isWalletConnected: boolean;
  roleOptions: Array<{ value: string; label: string }>;
  onCancel: () => void;
  onSubmit: (data: AssignRoleFormData) => Promise<void>;
  /** Whether role data is loading (T060 - FR-034) */
  isRolesLoading: boolean;
  /** Whether contract has no roles defined (T061 - FR-037) */
  hasNoRoles: boolean;
}

function AssignRoleFormContent({
  form,
  adapter,
  isAdapterLoading,
  isWalletConnected,
  roleOptions,
  onCancel,
  onSubmit,
  isRolesLoading,
  hasNoRoles,
}: AssignRoleFormContentProps) {
  const {
    control,
    handleSubmit,
    formState: { isValid, isSubmitting },
  } = form;

  // Disable submit if adapter is not loaded, wallet not connected, form invalid, or no roles
  const canSubmit =
    isValid &&
    !isSubmitting &&
    !isAdapterLoading &&
    adapter !== null &&
    isWalletConnected &&
    !isRolesLoading &&
    !hasNoRoles;

  // Show empty state if no roles (T061 - FR-037)
  if (!isRolesLoading && hasNoRoles) {
    return (
      <div className="space-y-4 py-4">
        <NoRolesEmptyState />
        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            aria-label="Cancel and close dialog"
          >
            Close
          </Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
      {/* Wallet Disconnection Alert (T059 - FR-039) */}
      {!isWalletConnected && <WalletDisconnectedAlert />}

      {/* Address Field */}
      <div className="space-y-1.5">
        <AddressField
          id="assign-role-address"
          name="address"
          label="Account Address"
          placeholder={
            adapter ? getEcosystemAddressExample(adapter.networkConfig.ecosystem) : '0x...'
          }
          helperText="The account address that will receive this role."
          control={control}
          adapter={adapter ?? undefined}
          validation={{ required: true }}
        />
      </div>

      {/* Role Selection */}
      <div className="space-y-1.5">
        {isRolesLoading ? (
          // Loading skeleton (T060 - FR-034)
          <div className="space-y-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-3 w-48" />
          </div>
        ) : (
          <SelectField
            id="assign-role-role"
            name="roleId"
            label="Role"
            placeholder="Select a role"
            helperText="The role to grant to this account."
            control={control}
            options={roleOptions}
            validation={{ required: true }}
          />
        )}
      </div>

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
        <Button type="submit" disabled={!canSubmit} aria-label="Assign role to address">
          {isAdapterLoading || isRolesLoading ? 'Loading...' : 'Assign Role'}
        </Button>
      </DialogFooter>
    </form>
  );
}
