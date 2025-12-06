/**
 * RolesList Component
 * Feature: 008-roles-page-layout
 */

import { cn } from '@openzeppelin/ui-builder-utils';

import type { Role } from '../../types/roles';
import { RoleCard } from './RoleCard';

export interface RolesListProps {
  roles: Role[];
  selectedRoleId: string;
  connectedRoleIds: string[];
  onSelectRole: (roleId: string) => void;
  className?: string;
}

export function RolesList({
  roles,
  selectedRoleId,
  connectedRoleIds,
  onSelectRole,
  className,
}: RolesListProps) {
  return (
    <div className={cn('space-y-2 max-h-[600px] overflow-y-auto', className)}>
      {roles.map((role) => (
        <RoleCard
          key={role.id}
          role={role}
          isSelected={selectedRoleId === role.id}
          isConnected={connectedRoleIds.includes(role.id)}
          onClick={() => onSelectRole(role.id)}
        />
      ))}
    </div>
  );
}
