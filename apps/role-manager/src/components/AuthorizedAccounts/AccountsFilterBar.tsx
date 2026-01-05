/**
 * AccountsFilterBar Component
 * Feature: 010-authorized-accounts-page
 * Updated by: 011-accounts-real-data
 *
 * Filter bar with search input and dropdown filters for the Authorized Accounts table.
 *
 * User Story 1 (Phase 3): UI shell with disabled/placeholder controls
 * User Story 3 (Phase 5): Fully functional with state management
 *
 * Visual Design Requirements (from spec):
 * - Card container with search input (left) + dropdowns (right), horizontal layout
 * - Search input with magnifying glass icon
 * - Status dropdown: All Status, Active, Pending
 * - Roles dropdown: All Roles + available roles from props
 */

import { Search } from 'lucide-react';

import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openzeppelin/ui-components';
import { cn } from '@openzeppelin/ui-utils';

import type { AccountsFilterState, RoleBadgeInfo } from '../../types/authorized-accounts';
import { RoleFilterItem } from '../Shared';

/**
 * Props for AccountsFilterBar component
 */
export interface AccountsFilterBarProps {
  /** Current filter state */
  filters: AccountsFilterState;
  /** Available roles for the role filter dropdown (id for filtering, name for display) */
  availableRoles: RoleBadgeInfo[];
  /** Callback when filter state changes */
  onFiltersChange: (filters: AccountsFilterState) => void;
  /** Whether the filter bar is disabled (used for initial shell state) */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * AccountsFilterBar - Filter bar for Authorized Accounts table
 *
 * Phase 3 (US1): Renders as disabled UI shell
 * Phase 5 (US3): Fully interactive with controlled state
 *
 * @param filters - Current filter state
 * @param availableRoles - List of role names for the roles dropdown
 * @param onFiltersChange - Callback when filter values change
 * @param disabled - When true, renders as non-interactive UI shell (US1)
 */
export function AccountsFilterBar({
  filters,
  availableRoles,
  onFiltersChange,
  disabled = false,
  className,
}: AccountsFilterBarProps) {
  const handleSearchChange = (value: string) => {
    if (!disabled) {
      onFiltersChange({ ...filters, searchQuery: value });
    }
  };

  const handleStatusChange = (value: string) => {
    if (!disabled) {
      onFiltersChange({
        ...filters,
        statusFilter: value as typeof filters.statusFilter,
      });
    }
  };

  const handleRoleChange = (value: string) => {
    if (!disabled) {
      onFiltersChange({ ...filters, roleFilter: value });
    }
  };

  return (
    <div className={cn('flex flex-col sm:flex-row gap-4 p-4', className)}>
      {/* Search input with icon */}
      <div className="relative flex-1 max-w-sm">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="text"
          placeholder="Search by address or ENS..."
          value={filters.searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          disabled={disabled}
          className="pl-9"
          aria-label="Search accounts"
        />
      </div>

      {/* Filter dropdowns */}
      <div className="flex gap-2 sm:ml-auto">
        {/* Status filter */}
        <Select value={filters.statusFilter} onValueChange={handleStatusChange} disabled={disabled}>
          <SelectTrigger className="w-40" aria-label="Filter by status">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>

        {/* Roles filter */}
        <Select value={filters.roleFilter} onValueChange={handleRoleChange} disabled={disabled}>
          <SelectTrigger className="w-40" aria-label="Filter by role">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {availableRoles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                <RoleFilterItem roleId={role.id} roleName={role.name} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
