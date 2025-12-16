/**
 * ChangesFilterBar Component
 * Feature: 012-role-changes-data
 *
 * Filter bar with search input, date range picker, and dropdown filters for the Role Changes table.
 * Implements User Story 4: Filter Role Changes
 *
 * Visual Design Requirements:
 * - Horizontal layout with search input (left) + date range + dropdowns (right)
 * - Search input for account address or transaction ID
 * - Date range picker for timestamp filtering
 * - Action type filter: All, Grant, Revoke, Ownership Transfer, Admin Transfer
 * - Role filter: All Roles + available roles from props (Owner/Admin at top with icons)
 *
 * Tasks: T024
 */

import { Search } from 'lucide-react';

import {
  DateRangePicker,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openzeppelin/ui-builder-ui';
import type { DateRange } from '@openzeppelin/ui-builder-ui';
import { cn } from '@openzeppelin/ui-builder-utils';

import {
  ACTION_TYPE_CONFIG,
  type HistoryFilterState,
  type RoleBadgeInfo,
} from '../../types/role-changes';
import { formatToISOLocalString, parseISOString } from '../../utils/date';
import { RoleFilterItem, SelectLoadingPlaceholder } from '../Shared';

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
 * Provides multiple filters:
 * - Search: Filter by account address or transaction ID
 * - Date Range: Filter by timestamp range
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
  const handleSearchChange = (value: string) => {
    onFiltersChange({
      ...filters,
      searchQuery: value,
    });
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    onFiltersChange({
      ...filters,
      // formatToISOLocalString defaults to start of day (00:00:00)
      timestampFrom: range?.from ? formatToISOLocalString(range.from) : undefined,
      // End of day (23:59:59) to include all events on that day
      timestampTo: range?.to ? formatToISOLocalString(range.to, true) : undefined,
    });
  };

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

  // Convert ISO strings back to Date objects for the DateRangePicker
  const dateRangeValue: DateRange | undefined =
    filters.timestampFrom || filters.timestampTo
      ? {
          from: parseISOString(filters.timestampFrom),
          to: parseISOString(filters.timestampTo),
        }
      : undefined;

  return (
    <div
      className={cn('flex flex-col sm:flex-row gap-4 p-4', className)}
      role="search"
      aria-label="Filter role changes"
    >
      {/* Search input with icon */}
      <div className="relative flex-1 max-w-sm">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="text"
          placeholder="Search by full address or transaction hash..."
          value={filters.searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
          aria-label="Search by full address or transaction hash"
        />
      </div>

      {/* Filter controls */}
      <div className="flex flex-wrap gap-2 sm:ml-auto">
        {/* Date range picker */}
        <DateRangePicker
          value={dateRangeValue}
          onChange={handleDateRangeChange}
          placeholder="Filter by date"
          align="end"
        />

        {/* Action type filter */}
        <Select value={filters.actionFilter} onValueChange={handleActionChange}>
          <SelectTrigger className="w-48" aria-label="Filter by action type">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {Object.entries(ACTION_TYPE_CONFIG)
              .filter(([action]) => action !== 'unknown')
              .map(([action, config]) => (
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
                  <RoleFilterItem roleId={role.id} roleName={role.name} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
