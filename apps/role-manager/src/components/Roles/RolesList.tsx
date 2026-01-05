/**
 * RolesList Component
 * Feature: 008-roles-page-layout, 009-roles-page-data
 *
 * Scrollable list of role cards.
 * Updated in spec 009 to accept RoleWithDescription[] (T030).
 */

import { cn } from '@openzeppelin/ui-utils';

import type { RoleWithDescription } from '../../types/roles';
import { RoleCard } from './RoleCard';

export interface RolesListProps {
  /** Array of roles to display */
  roles: RoleWithDescription[];
  /** Currently selected role ID (nullable for real data) */
  selectedRoleId: string | null;
  /** Role IDs that the connected user belongs to */
  connectedRoleIds: string[];
  /** Callback when a role is selected */
  onSelectRole: (roleId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

export function RolesList({
  roles,
  selectedRoleId,
  connectedRoleIds,
  onSelectRole,
  className,
}: RolesListProps) {
  if (roles.length === 0) {
    return (
      <div className={cn('py-8 text-center text-sm text-muted-foreground', className)}>
        No roles found
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)} role="listbox" aria-label="Roles">
      {roles.map((role) => (
        <RoleCard
          key={role.roleId}
          role={role}
          isSelected={selectedRoleId === role.roleId}
          isConnected={connectedRoleIds.includes(role.roleId)}
          onClick={() => onSelectRole(role.roleId)}
        />
      ))}
    </div>
  );
}
