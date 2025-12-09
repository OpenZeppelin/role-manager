/**
 * ChangesFilterBar Component
 * Feature: 012-role-changes-data
 *
 * Filter bar with dropdown filters for the Role Changes table.
 * Implements User Story 4: Filter Role Changes
 *
 * Visual Design Requirements:
 * - Horizontal layout with action type dropdown + role dropdown
 * - Action type filter: All, Grant, Revoke, Ownership Transfer
 * - Role filter: All Roles + available roles from props
 *
 * Tasks: T024
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openzeppelin/ui-builder-ui';
import { cn } from '@openzeppelin/ui-builder-utils';

import {
  ACTION_TYPE_CONFIG,
  type HistoryFilterState,
  type RoleBadgeInfo,
} from '../../types/role-changes';
import { SelectLoadingPlaceholder } from '../Shared';

/**
 * Props for ChangesFilterBar component
 */
export interface ChangesFilterBarProps {
  /** Current filter state */
  filters: HistoryFilterState;
  /** Available roles for the role filter dropdown */
  availableRoles: RoleBadgeInfo[];
  /** Whether roles are still loading (disables role select and shows loader) */
  availableRolesLoading?: boolean;
  /** Callback when filter state changes */
  onFiltersChange: (filters: HistoryFilterState) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ChangesFilterBar - Filter bar for Role Changes table
 *
 * Provides two filter dropdowns:
 * - Action Type: Filter by event type (grant, revoke, ownership-transfer)
 * - Role: Filter by role ID (server-side filter)
 *
 * @param filters - Current filter state
 * @param availableRoles - List of roles for the roles dropdown
 * @param onFiltersChange - Callback when filter values change
 */
export function ChangesFilterBar({
  filters,
  availableRoles,
  availableRolesLoading = false,
  onFiltersChange,
  className,
}: ChangesFilterBarProps) {
  const handleActionChange = (value: string) => {
    onFiltersChange({
      ...filters,
      actionFilter: value as HistoryFilterState['actionFilter'],
    });
  };

  const handleRoleChange = (value: string) => {
    onFiltersChange({
      ...filters,
      roleFilter: value,
    });
  };

  return (
    <div className={cn('flex flex-col sm:flex-row gap-4 p-4', className)}>
      {/* Filter dropdowns */}
      <div className="flex gap-2 sm:ml-auto">
        {/* Action type filter */}
        <Select value={filters.actionFilter} onValueChange={handleActionChange}>
          <SelectTrigger className="w-48" aria-label="Filter by action type">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {Object.entries(ACTION_TYPE_CONFIG).map(([action, config]) => (
              <SelectItem key={action} value={action}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Roles filter */}
        {availableRolesLoading ? (
          <SelectLoadingPlaceholder label="Loading roles…" />
        ) : (
          <Select value={filters.roleFilter} onValueChange={handleRoleChange}>
            <SelectTrigger className="w-40" aria-label="Filter by role">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {availableRoles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
