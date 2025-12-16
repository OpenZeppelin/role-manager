/**
 * RoleFilterItem Component
 *
 * Renders a role name with an optional icon for special roles (Owner, Admin).
 * Used in filter dropdowns to display roles with visual indicators.
 *
 * Icons:
 * - Crown (blue): Owner role
 * - Shield (purple): Contract Admin role
 *
 * @example
 * ```tsx
 * <SelectItem value={role.id}>
 *   <RoleFilterItem roleId={role.id} roleName={role.name} />
 * </SelectItem>
 * ```
 */

import { Crown, Shield } from 'lucide-react';

import { isAdminRole, isOwnerRole } from '../../utils/filter-roles';

export interface RoleFilterItemProps {
  /** The role ID to check for special icons */
  roleId: string;
  /** The display name of the role */
  roleName: string;
}

/**
 * RoleFilterItem - Displays a role name with icon for special roles
 *
 * Shows:
 * - Crown icon (blue) for Owner role
 * - Shield icon (purple) for Contract Admin role
 * - No icon for regular enumerated roles
 */
export function RoleFilterItem({ roleId, roleName }: RoleFilterItemProps) {
  const showOwnerIcon = isOwnerRole(roleId);
  const showAdminIcon = isAdminRole(roleId);

  return (
    <span className="flex items-center gap-1.5">
      {showOwnerIcon && <Crown className="h-3 w-3 text-blue-600" aria-hidden="true" />}
      {showAdminIcon && <Shield className="h-3 w-3 text-purple-600" aria-hidden="true" />}
      {roleName}
    </span>
  );
}
