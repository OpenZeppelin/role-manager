/**
 * Roles Page
 * Feature: 008-roles-page-layout
 *
 * Single Card with grid layout: left panel (roles list) + right panel (details)
 */

import { useState } from 'react';

import { Card } from '@openzeppelin/ui-builder-ui';

import {
  getAccountsForRole,
  getConnectedRoleIds,
  mockRoleIdentifiers,
  mockRoles,
  RoleDetails,
  RoleIdentifiersTable,
  RolesList,
  SecurityNotice,
} from '../components/Roles';
import { PageHeader } from '../components/Shared/PageHeader';

export function Roles() {
  const [selectedRoleId, setSelectedRoleId] = useState<string>('OWNER_ROLE');

  const selectedRole = mockRoles.find((role) => role.id === selectedRoleId) ?? mockRoles[0];
  const selectedRoleAccounts = getAccountsForRole(selectedRoleId);
  const connectedRoleIds = getConnectedRoleIds();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <PageHeader
        title="Roles"
        subtitle={
          <span>
            View and manage roles for <span className="font-semibold">Demo Contract</span> on
            Ethereum
          </span>
        }
      />

      {/* Main Layout: Single Card with List-Detail View */}
      <Card className="py-0 overflow-hidden shadow-none">
        <div className="flex flex-col lg:flex-row">
          {/* Left: Roles List (~40% width) */}
          <div className="lg:w-2/5 p-6 border-r">
            <RolesList
              roles={mockRoles}
              selectedRoleId={selectedRoleId}
              connectedRoleIds={connectedRoleIds}
              onSelectRole={setSelectedRoleId}
            />
          </div>

          {/* Right: Role Details (~60% width) */}
          <div className="lg:flex-1 py-6">
            <RoleDetails
              role={selectedRole}
              accounts={selectedRoleAccounts}
              isConnected={connectedRoleIds.includes(selectedRoleId)}
              onAssign={() => {
                // Action placeholder
              }}
              onRevoke={() => {
                // Action placeholder
              }}
              onTransferOwnership={() => {
                // Action placeholder
              }}
            />
          </div>
        </div>
      </Card>

      {/* Role Identifiers Reference Table */}
      <RoleIdentifiersTable identifiers={mockRoleIdentifiers} />

      {/* Security Notice */}
      <SecurityNotice />
    </div>
  );
}
