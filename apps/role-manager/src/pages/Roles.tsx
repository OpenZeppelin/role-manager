/**
 * Roles Page
 * Feature: 008-roles-page-layout, 009-roles-page-data
 *
 * Single Card with grid layout: left panel (roles list) + right panel (details)
 *
 * Updated in spec 009 (T035-T043):
 * - Integrated with useRolesPageData hook
 * - Real data from adapter
 * - Loading, error, and empty state handling
 * - Partial data handling (FR-022)
 */

import { useMemo } from 'react';

import { Card } from '@openzeppelin/ui-builder-ui';

import {
  RoleDetails,
  RoleIdentifiersTable,
  RolesEmptyState,
  RolesErrorState,
  RolesList,
  RolesLoadingSkeleton,
  SecurityNotice,
} from '../components/Roles';
import type { AccountData } from '../components/Roles/RoleDetails';
import { PageHeader } from '../components/Shared/PageHeader';
import { useRolesPageData } from '../hooks';
import { useSelectedContract } from '../hooks/useSelectedContract';

export function Roles() {
  // T035: Use useRolesPageData hook
  const {
    roles,
    selectedRoleId,
    setSelectedRoleId,
    selectedRole,
    isLoading,
    isSupported,
    hasError,
    errorMessage,
    canRetry,
    refetch,
    connectedAddress,
    connectedRoleIds,
    roleIdentifiers,
  } = useRolesPageData();

  // Get contract info for display
  const { selectedContract } = useSelectedContract();
  const contractLabel = selectedContract?.label || selectedContract?.address || 'Unknown Contract';
  const networkId = selectedContract?.networkId || '';

  // T036: Transform role members to AccountData format
  const selectedRoleAccounts = useMemo((): AccountData[] => {
    if (!selectedRole) return [];

    return selectedRole.members.map((address) => ({
      address,
      assignedAt: undefined, // Assignment dates not available from adapter yet
      isCurrentUser: connectedAddress
        ? address.toLowerCase() === connectedAddress.toLowerCase()
        : false,
    }));
  }, [selectedRole, connectedAddress]);

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
            {networkId && (
              <>
                {' '}
                on <span className="font-medium">{networkId}</span>
              </>
            )}
          </span>
        }
      />

      {/* Main Layout: Single Card with List-Detail View */}
      <Card className="py-0 overflow-hidden shadow-none">
        <div className="flex flex-col lg:flex-row">
          {/* Left: Roles List (~40% width) */}
          <div className="lg:w-2/5 p-6 border-r">
            {/* T040: Wire role selection to hook */}
            <RolesList
              roles={roles}
              selectedRoleId={selectedRoleId}
              connectedRoleIds={connectedRoleIds}
              onSelectRole={setSelectedRoleId}
            />
          </div>

          {/* Right: Role Details (~60% width) */}
          <div className="lg:flex-1 py-6">
            {selectedRole ? (
              <RoleDetails
                role={selectedRole}
                accounts={selectedRoleAccounts}
                isConnected={connectedRoleIds.includes(selectedRole.roleId)}
                onAssign={() => {
                  // Action placeholder for future mutations (spec 010)
                }}
                onRevoke={() => {
                  // Action placeholder for future mutations (spec 010)
                }}
                onTransferOwnership={() => {
                  // Action placeholder for future mutations (spec 010)
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full py-16 text-muted-foreground">
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
    </div>
  );
}
