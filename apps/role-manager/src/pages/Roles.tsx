/**
 * Roles Page
 * Feature: 008-roles-page-layout, 009-roles-page-data, 014-role-grant-revoke
 *
 * Single Card with grid layout: left panel (roles list) + right panel (details)
 *
 * Updated in spec 009 (T035-T043):
 * - Integrated with useRolesPageData hook
 * - Real data from adapter
 * - Loading, error, and empty state handling
 * - Partial data handling (FR-022)
 *
 * Phase 5 (T050-T052):
 * - Added refresh button with subtle loading indicator
 * - Contract switching handled via react-query key changes
 *
 * Phase 6: Edit role dialog for description editing
 *
 * Spec 014 (T041):
 * - Added AssignRoleDialog for granting roles to new addresses
 */

import { FileSearch, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@openzeppelin/ui-components';
import { cn } from '@openzeppelin/ui-utils';

import {
  AcceptAdminTransferDialog,
  CancelAdminTransferDialog,
  TransferAdminDialog,
} from '../components/Admin';
import { AcceptOwnershipDialog, TransferOwnershipDialog } from '../components/Ownership';
import {
  AssignRoleDialog,
  EditRoleDialog,
  RevokeRoleDialog,
  RoleDetails,
  RoleIdentifiersTable,
  RolesEmptyState,
  RolesErrorState,
  RolesList,
  RolesLoadingSkeleton,
  SecurityNotice,
} from '../components/Roles';
import type { AccountData } from '../components/Roles/RoleDetails';
import { PageEmptyState } from '../components/Shared/PageEmptyState';
import { PageHeader } from '../components/Shared/PageHeader';
import { TypeToConfirmDialog } from '../components/Shared/TypeToConfirmDialog';
import { useAllNetworks, useRolesPageData } from '../hooks';
import { useAdminDelayDialog } from '../hooks/useAdminDelayDialog';
import { useRenounceDialog, type RenounceType } from '../hooks/useRenounceDialog';
import { useSelectedContract } from '../hooks/useSelectedContract';
import { createGetAccountUrl } from '../utils/explorer-urls';

export function Roles() {
  // URL search params for deep linking to specific role
  const [searchParams, setSearchParams] = useSearchParams();
  const roleFromUrl = searchParams.get('role');

  // T035: Use useRolesPageData hook
  const {
    roles,
    selectedRoleId,
    setSelectedRoleId,
    selectedRole,
    hasContractSelected,
    capabilities, // Feature 015: for hasTwoStepOwnable
    isLoading,
    isRefreshing, // T051: Subtle refresh loading state
    isSupported,
    hasError,
    errorMessage,
    canRetry,
    refetch,
    updateRoleDescription,
    connectedAddress,
    connectedRoleIds,
    roleIdentifiers,
    pendingOwner, // Feature 015 (T021): for Accept Ownership button
    pendingTransfer, // Feature 015 Phase 6 (T026, T027): for pending transfer display
    ownershipState, // Feature 015 Phase 6 (T028): for expired status display
    currentBlock, // For expiration countdown
    // Feature 016: Admin-related data
    adminInfo,
    pendingAdminTransfer,
    adminState,
  } = useRolesPageData();

  // Effect to handle deep linking: select role from URL param
  useEffect(() => {
    if (roleFromUrl && roles.length > 0) {
      // Find the role by ID (URL-decoded)
      const decodedRoleId = decodeURIComponent(roleFromUrl);
      const roleExists = roles.some((r) => r.roleId === decodedRoleId);
      if (roleExists) {
        setSelectedRoleId(decodedRoleId);
        // Clear the URL param after selecting to avoid re-selection on refresh
        setSearchParams((params) => {
          params.delete('role');
          return params;
        });
      }
    }
  }, [roleFromUrl, roles, setSelectedRoleId, setSearchParams]);

  // Phase 6: Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Spec 014: Assign Role dialog state (T041)
  const [isAssignRoleDialogOpen, setIsAssignRoleDialogOpen] = useState(false);

  // Spec 014: Revoke Role dialog state (T054)
  const [revokeTarget, setRevokeTarget] = useState<{
    address: string;
    roleId: string;
    roleName: string;
  } | null>(null);

  // Spec 015 (T014): Transfer Ownership dialog state
  const [isTransferOwnershipDialogOpen, setIsTransferOwnershipDialogOpen] = useState(false);

  // Spec 015 (T021): Accept Ownership dialog state
  const [isAcceptOwnershipDialogOpen, setIsAcceptOwnershipDialogOpen] = useState(false);

  // Spec 016 (T027): Transfer Admin dialog state
  const [isTransferAdminDialogOpen, setIsTransferAdminDialogOpen] = useState(false);

  // Spec 016 (T037): Accept Admin Transfer dialog state
  const [isAcceptAdminTransferDialogOpen, setIsAcceptAdminTransferDialogOpen] = useState(false);

  // Feature 017 (T054): Renounce dialog state
  const [renounceDialogOpen, setRenounceDialogOpen] = useState(false);
  const [renounceConfig, setRenounceConfig] = useState<{
    type: RenounceType;
    roleId?: string;
    roleName?: string;
  }>({ type: 'ownership' });

  // Feature 017 (T066): Cancel admin transfer dialog state
  const [isCancelAdminTransferDialogOpen, setIsCancelAdminTransferDialogOpen] = useState(false);

  // Get contract info for display
  const { selectedContract, adapter } = useSelectedContract();
  const contractLabel = selectedContract?.label || selectedContract?.address || 'Unknown Contract';

  // Create URL generator function for explorer links
  const getAccountUrl = useMemo(() => createGetAccountUrl(adapter), [adapter]);

  // Get network name from networkId
  const { networks } = useAllNetworks();
  const network = networks.find((n) => n.id === selectedContract?.networkId);
  const networkName = network?.name || '';

  // T050: Handle refresh with toast notification on error
  const handleRefresh = useCallback(async () => {
    try {
      await refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh roles data';
      toast.error(message);
    }
  }, [refetch]);

  // T036: Transform role members to AccountData format
  const selectedRoleAccounts = useMemo((): AccountData[] => {
    if (!selectedRole) return [];

    return selectedRole.members.map((address) => ({
      address,
      assignedAt: undefined, // Assignment dates not available from adapter yet
      isCurrentUser: connectedAddress
        ? address.toLowerCase() === connectedAddress.toLowerCase()
        : false,
      explorerUrl: getAccountUrl(address) ?? undefined,
    }));
  }, [selectedRole, connectedAddress, getAccountUrl]);

  // Phase 6: Open edit dialog
  const handleOpenEditDialog = useCallback(() => {
    setIsEditDialogOpen(true);
  }, []);

  // Spec 014 (T041): Open assign role dialog
  const handleAssignRole = useCallback(() => {
    setIsAssignRoleDialogOpen(true);
  }, []);

  // Spec 014 (T054): Open revoke role dialog
  const handleRevokeRole = useCallback(
    (address: string) => {
      if (selectedRole) {
        setRevokeTarget({
          address,
          roleId: selectedRole.roleId,
          roleName: selectedRole.roleName,
        });
      }
    },
    [selectedRole]
  );

  // Spec 015 (T014): Open transfer ownership dialog
  const handleTransferOwnership = useCallback(() => {
    setIsTransferOwnershipDialogOpen(true);
  }, []);

  // Spec 015 (T021): Open accept ownership dialog
  const handleAcceptOwnership = useCallback(() => {
    setIsAcceptOwnershipDialogOpen(true);
  }, []);

  // Spec 016 (T028): Open transfer admin dialog
  const handleTransferAdmin = useCallback(() => {
    setIsTransferAdminDialogOpen(true);
  }, []);

  // Spec 016 (T038): Open accept admin transfer dialog
  const handleAcceptAdminTransfer = useCallback(() => {
    setIsAcceptAdminTransferDialogOpen(true);
  }, []);

  // Feature 017 (T054): Open renounce ownership dialog
  const handleRenounceOwnership = useCallback(() => {
    setRenounceConfig({ type: 'ownership' });
    setRenounceDialogOpen(true);
  }, []);

  // Feature 017 (T054): Open renounce role dialog
  const handleRenounceRole = useCallback((roleId: string, roleName: string) => {
    setRenounceConfig({ type: 'role', roleId, roleName });
    setRenounceDialogOpen(true);
  }, []);

  // Feature 017 (T066): Open cancel admin transfer dialog
  const handleCancelAdminTransfer = useCallback(() => {
    setIsCancelAdminTransferDialogOpen(true);
  }, []);

  // Feature 017 (T064, T067): Admin delay change/rollback dialog
  const adminDelayDialog = useAdminDelayDialog({
    onSuccess: refetch,
  });

  // Feature 017 (T068): delayInfo from adminInfo for AdminDelayPanel
  const delayInfo =
    adminInfo && 'delayInfo' in adminInfo
      ? (
          adminInfo as {
            delayInfo: {
              currentDelay: number;
              pendingDelay?: { newDelay: number; effectAt: number };
            };
          }
        ).delayInfo
      : undefined;

  // Spec 015 (T021): Check if connected wallet can accept ownership (is the pending owner)
  const canAcceptOwnership = useMemo(() => {
    if (!pendingOwner || !connectedAddress) return false;
    return pendingOwner.toLowerCase() === connectedAddress.toLowerCase();
  }, [pendingOwner, connectedAddress]);

  // Spec 016 (T035): Check if connected wallet can accept admin transfer (is the pending admin)
  const canAcceptAdminTransfer = useMemo(() => {
    if (!pendingAdminTransfer?.pendingAdmin || !connectedAddress) return false;
    return pendingAdminTransfer.pendingAdmin.toLowerCase() === connectedAddress.toLowerCase();
  }, [pendingAdminTransfer, connectedAddress]);

  // Feature 017 (T054): Renounce dialog hook
  const renounceDialog = useRenounceDialog({
    type: renounceConfig.type,
    roleId: renounceConfig.roleId,
    roleName: renounceConfig.roleName,
    onClose: () => setRenounceDialogOpen(false),
    onSuccess: () => {
      refetch();
    },
  });

  // Phase 6: Handle description save from dialog
  const handleSaveDescription = useCallback(
    async (roleId: string, description: string) => {
      try {
        await updateRoleDescription(roleId, description);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save description';
        toast.error(message);
        throw error; // Re-throw to let dialog show the error
      }
    },
    [updateRoleDescription]
  );

  // T037: Loading state
  if (isLoading) {
    return <RolesLoadingSkeleton />;
  }

  // T038: Error state with retry
  if (hasError) {
    return (
      <RolesErrorState
        message={errorMessage || 'Failed to load roles data'}
        canRetry={canRetry}
        onRetry={refetch}
      />
    );
  }

  // Empty state when no contract is selected
  if (!hasContractSelected) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader title="Roles" subtitle="Select a contract to view roles" />
        <Card className="p-0 shadow-none overflow-hidden">
          <div className="py-16 px-4">
            <PageEmptyState
              title="No Contract Selected"
              description="Select a contract from the dropdown above to view its roles and access control configuration."
              icon={FileSearch}
            />
          </div>
        </Card>
      </div>
    );
  }

  // T039: Empty state for unsupported contracts
  if (!isSupported) {
    return <RolesEmptyState contractName={contractLabel} />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <PageHeader
        title="Roles"
        subtitle={
          <span>
            View and manage roles for <span className="font-semibold">{contractLabel}</span>
            {networkName && (
              <>
                {' '}
                on <span className="font-medium">{networkName}</span>
              </>
            )}
          </span>
        }
        actions={
          // T050: Refresh button with T051: subtle loading indicator
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh roles data"
          >
            <RefreshCw
              className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')}
              aria-hidden="true"
            />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        }
      />

      {/* Main Layout: Single Card with List-Detail View */}
      <Card className="py-0 overflow-hidden shadow-none">
        <div className="flex flex-col lg:flex-row h-[600px]">
          {/* Left: Roles List (1/3 width) */}
          <div className="lg:w-1/3 p-6 border-r overflow-y-auto">
            {/* T040: Wire role selection to hook */}
            <RolesList
              roles={roles}
              selectedRoleId={selectedRoleId}
              connectedRoleIds={connectedRoleIds}
              onSelectRole={setSelectedRoleId}
            />
          </div>

          {/* Right: Role Details (2/3 width) */}
          <div className="lg:w-2/3 overflow-y-auto">
            {selectedRole ? (
              <RoleDetails
                role={selectedRole}
                accounts={selectedRoleAccounts}
                isConnected={connectedRoleIds.includes(selectedRole.roleId)}
                onEdit={handleOpenEditDialog}
                onAssign={handleAssignRole}
                onRevoke={handleRevokeRole}
                onTransferOwnership={handleTransferOwnership}
                onAcceptOwnership={handleAcceptOwnership}
                canAcceptOwnership={canAcceptOwnership}
                pendingTransfer={pendingTransfer}
                ownershipState={ownershipState}
                pendingRecipientUrl={
                  pendingTransfer?.pendingOwner
                    ? (getAccountUrl(pendingTransfer.pendingOwner) ?? undefined)
                    : undefined
                }
                currentBlock={currentBlock}
                // Feature 016: Admin-related props
                onTransferAdmin={handleTransferAdmin}
                pendingAdminTransfer={pendingAdminTransfer}
                adminState={adminState}
                pendingAdminRecipientUrl={
                  pendingAdminTransfer?.pendingAdmin
                    ? (getAccountUrl(pendingAdminTransfer.pendingAdmin) ?? undefined)
                    : undefined
                }
                // Phase 5 (T036): Accept admin transfer props
                canAcceptAdminTransfer={canAcceptAdminTransfer}
                onAcceptAdminTransfer={handleAcceptAdminTransfer}
                // Feature 017 (T054): Renounce props
                hasRenounceOwnership={capabilities?.hasRenounceOwnership ?? false}
                onRenounceOwnership={handleRenounceOwnership}
                hasRenounceRole={capabilities?.hasRenounceRole ?? false}
                onRenounceRole={handleRenounceRole}
                // Feature 017 (T066, T067): Cancel admin transfer & admin delay
                hasCancelAdminTransfer={capabilities?.hasCancelAdminTransfer ?? false}
                onCancelAdminTransfer={handleCancelAdminTransfer}
                hasAdminDelayManagement={capabilities?.hasAdminDelayManagement ?? false}
                delayInfo={delayInfo}
                onChangeDelayClick={adminDelayDialog.openChangeDialog}
                onRollbackClick={adminDelayDialog.openRollbackDialog}
                isChangeDelayPending={adminDelayDialog.isChangePending}
                isRollbackPending={adminDelayDialog.isRollbackPending}
              />
            ) : (
              <div className="flex items-center justify-center h-full p-6 text-muted-foreground">
                Select a role to view details
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Role Identifiers Reference Table */}
      {roleIdentifiers.length > 0 && <RoleIdentifiersTable identifiers={roleIdentifiers} />}

      {/* Security Notice */}
      <SecurityNotice />

      {/* Phase 6: Edit Role Dialog */}
      <EditRoleDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        role={selectedRole}
        onSaveDescription={handleSaveDescription}
      />

      {/* Spec 014 (T041): Assign Role Dialog */}
      {/* Note: onSuccess callback removed - query invalidation in mutations handles data refresh */}
      {selectedRole && (
        <AssignRoleDialog
          open={isAssignRoleDialogOpen}
          onOpenChange={setIsAssignRoleDialogOpen}
          initialRoleId={selectedRole.roleId}
          initialRoleName={selectedRole.roleName}
        />
      )}

      {/* Spec 014 (T054): Revoke Role Dialog */}
      {/* Note: onSuccess callback removed - query invalidation in mutations handles data refresh */}
      {revokeTarget && (
        <RevokeRoleDialog
          open={!!revokeTarget}
          onOpenChange={(open) => !open && setRevokeTarget(null)}
          accountAddress={revokeTarget.address}
          roleId={revokeTarget.roleId}
          roleName={revokeTarget.roleName}
        />
      )}

      {/* Spec 015 (T014): Transfer Ownership Dialog */}
      {/* Get current owner from the Owner role (first member of owner role) */}
      {(() => {
        const ownerRole = roles.find((r) => r.isOwnerRole);
        const currentOwner = ownerRole?.members[0] ?? '';
        // T033: Check if there's an existing pending transfer
        const hasPendingTransfer = !!(pendingTransfer && ownershipState === 'pending');
        return (
          <TransferOwnershipDialog
            open={isTransferOwnershipDialogOpen}
            onOpenChange={setIsTransferOwnershipDialogOpen}
            currentOwner={currentOwner}
            hasTwoStepOwnable={capabilities?.hasTwoStepOwnable ?? false}
            hasPendingTransfer={hasPendingTransfer}
            onSuccess={refetch}
          />
        );
      })()}

      {/* Spec 015 (T021): Accept Ownership Dialog */}
      <AcceptOwnershipDialog
        open={isAcceptOwnershipDialogOpen}
        onOpenChange={setIsAcceptOwnershipDialogOpen}
        onSuccess={refetch}
      />

      {/* Spec 016 (T027): Transfer Admin Dialog */}
      {(() => {
        const adminRole = roles.find((r) => r.isAdminRole);
        const currentAdmin = adminRole?.members[0] ?? adminInfo?.admin ?? '';
        const hasPendingAdminTransferFlag = !!(pendingAdminTransfer && adminState === 'pending');
        return (
          <TransferAdminDialog
            open={isTransferAdminDialogOpen}
            onOpenChange={setIsTransferAdminDialogOpen}
            currentAdmin={currentAdmin}
            hasPendingAdminTransfer={hasPendingAdminTransferFlag}
            onSuccess={refetch}
          />
        );
      })()}

      {/* Spec 016 (T037): Accept Admin Transfer Dialog */}
      <AcceptAdminTransferDialog
        open={isAcceptAdminTransferDialogOpen}
        onOpenChange={setIsAcceptAdminTransferDialogOpen}
        onSuccess={refetch}
      />

      {/* Feature 017 (T066): Cancel Admin Transfer Dialog */}
      <CancelAdminTransferDialog
        open={isCancelAdminTransferDialogOpen}
        onOpenChange={setIsCancelAdminTransferDialogOpen}
        onSuccess={refetch}
      />

      {/* Feature 017 (T064): Change Admin Delay Dialog */}
      {adminDelayDialog.isChangeDialogOpen && (
        <Dialog
          open={adminDelayDialog.isChangeDialogOpen}
          onOpenChange={(open) => !open && adminDelayDialog.closeChangeDialog()}
        >
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Change Admin Delay</DialogTitle>
              <DialogDescription>
                Enter the new admin transfer delay in seconds. The change will take effect after the
                current delay period.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="admin-delay-input" className="text-sm font-medium">
                  New delay (seconds)
                </label>
                <input
                  id="admin-delay-input"
                  type="number"
                  min={1}
                  value={adminDelayDialog.newDelayInput}
                  onChange={(e) => adminDelayDialog.setNewDelayInput(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              {adminDelayDialog.changeStep === 'error' && adminDelayDialog.changeErrorMessage && (
                <p className="text-sm text-destructive">{adminDelayDialog.changeErrorMessage}</p>
              )}
              {(adminDelayDialog.changeStep === 'pending' ||
                adminDelayDialog.changeStep === 'confirming') && (
                <p className="text-sm text-muted-foreground">Confirm in your wallet...</p>
              )}
              {adminDelayDialog.changeStep === 'success' && (
                <p className="text-sm text-green-700">Delay change scheduled successfully.</p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={adminDelayDialog.closeChangeDialog}
                  disabled={adminDelayDialog.isChangePending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={adminDelayDialog.submitChangeDelay}
                  disabled={
                    adminDelayDialog.isChangePending ||
                    !adminDelayDialog.newDelayInput ||
                    parseInt(adminDelayDialog.newDelayInput, 10) <= 0
                  }
                >
                  {adminDelayDialog.isChangePending ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Feature 017 (T064): Rollback Admin Delay Dialog */}
      {adminDelayDialog.isRollbackDialogOpen && (
        <Dialog
          open={adminDelayDialog.isRollbackDialogOpen}
          onOpenChange={(open) => !open && adminDelayDialog.closeRollbackDialog()}
        >
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Rollback Delay Change</DialogTitle>
              <DialogDescription>
                This will cancel the pending delay change. The current delay will remain in effect.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {adminDelayDialog.rollbackStep === 'error' &&
                adminDelayDialog.rollbackErrorMessage && (
                  <p className="text-sm text-destructive">
                    {adminDelayDialog.rollbackErrorMessage}
                  </p>
                )}
              {(adminDelayDialog.rollbackStep === 'pending' ||
                adminDelayDialog.rollbackStep === 'confirming') && (
                <p className="text-sm text-muted-foreground">Confirm in your wallet...</p>
              )}
              {adminDelayDialog.rollbackStep === 'success' && (
                <p className="text-sm text-green-700">Rollback successful.</p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={adminDelayDialog.closeRollbackDialog}
                  disabled={adminDelayDialog.isRollbackPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={adminDelayDialog.submitRollback}
                  disabled={adminDelayDialog.isRollbackPending}
                >
                  {adminDelayDialog.isRollbackPending ? 'Submitting...' : 'Rollback'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Feature 017 (T054): Renounce Confirmation Dialog */}
      <TypeToConfirmDialog
        open={renounceDialogOpen}
        onOpenChange={setRenounceDialogOpen}
        title={renounceDialog.title}
        warningText={renounceDialog.warningText}
        confirmKeyword={renounceDialog.confirmKeyword}
        submitLabel={renounceDialog.submitLabel}
        successMessage={renounceDialog.successMessage}
        step={renounceDialog.step}
        errorMessage={renounceDialog.errorMessage}
        txStatus={renounceDialog.txStatus}
        isWalletConnected={renounceDialog.isWalletConnected}
        isPending={renounceDialog.isPending}
        onSubmit={renounceDialog.submit}
        onRetry={renounceDialog.retry}
        onReset={renounceDialog.reset}
      />
    </div>
  );
}
