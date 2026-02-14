/**
 * History Transformer Utilities
 * Feature: 012-role-changes-data
 *
 * Data transformation utilities that convert history entries from the
 * AccessControlService's getHistory() API into presentation models for the
 * Role Changes page.
 *
 * Tasks: T002
 */

import { ADMIN_ROLE_ID } from '../constants/roles';
import type { RoleBadgeInfo } from '../types/authorized-accounts';
import {
  CHANGE_TYPE_TO_ACTION,
  type HistoryChangeType,
  type HistoryEntry,
  type HistoryFilterState,
  type RoleChangeAction,
  type RoleChangeEventView,
} from '../types/role-changes';
import type { GetExplorerUrlFn } from './explorer-urls';
import { getRoleName } from './role-name';

// =============================================================================
// Constants
// =============================================================================

/**
 * Mapping from API changeType to UI action.
 * Re-exported from types for convenience in this file.
 */
export const CHANGE_TYPE_MAP: Record<HistoryChangeType, RoleChangeAction> = CHANGE_TYPE_TO_ACTION;

// =============================================================================
// Transform Functions
// =============================================================================

/**
 * Options for transforming history entries.
 */
export interface TransformOptions {
  /** Function to generate transaction URL (typically adapter.getExplorerTxUrl) */
  getTransactionUrl: GetExplorerUrlFn;
  /** Function to generate account URL (typically adapter.getExplorerUrl) */
  getAccountUrl: GetExplorerUrlFn;
}

/**
 * Transform a single history entry from the API into a presentation model.
 *
 * @param entry - Raw history entry from getHistory() API
 * @param options - Transform options with URL generator functions
 * @returns Presentation model for the UI
 *
 * @example
 * ```typescript
 * const event = transformHistoryEntry(entry, {
 *   getTransactionUrl: (hash) => adapter.getExplorerTxUrl?.(hash) ?? null,
 *   getAccountUrl: (address) => adapter.getExplorerUrl?.(address) ?? null,
 * });
 * // { id: '...', timestamp: '...', action: 'grant', accountUrl: '...', ... }
 * ```
 */
export function transformHistoryEntry(
  entry: HistoryEntry,
  options: TransformOptions
): RoleChangeEventView {
  const action = CHANGE_TYPE_MAP[entry.changeType] ?? 'grant';
  const timestamp = entry.timestamp ?? new Date().toISOString();

  // Determine role ID and name - override for admin-related events
  // Admin transfers and admin renounce should use CONTRACT_ADMIN role ID and "Admin" name
  // This ensures filtering works correctly (matches SYNTHETIC_ADMIN_ROLE in filter-roles.ts)
  const isAdminEvent =
    entry.changeType === 'ADMIN_TRANSFER_INITIATED' ||
    entry.changeType === 'ADMIN_TRANSFER_COMPLETED' ||
    entry.changeType === 'ADMIN_RENOUNCED';
  const roleId = isAdminEvent ? ADMIN_ROLE_ID : entry.role.id;
  const roleName = isAdminEvent ? 'Admin' : getRoleName(entry.role.label, entry.role.id);

  return {
    id: `${timestamp}-${entry.changeType}-${roleId}-${entry.account}`,
    timestamp,
    action,
    roleId,
    roleName,
    account: entry.account,
    accountUrl: options.getAccountUrl(entry.account),
    transactionHash: entry.txId ?? null,
    transactionUrl: entry.txId ? options.getTransactionUrl(entry.txId) : null,
    ledger: entry.ledger ?? null,
  };
}

/**
 * Transform an array of history entries into presentation models.
 * Results are sorted by timestamp descending (newest first) per FR-016.
 *
 * @param entries - Array of raw history entries from getHistory() API
 * @param options - Transform options with URL generator functions
 * @returns Array of presentation models sorted by timestamp (newest first)
 *
 * @example
 * ```typescript
 * const events = transformHistoryEntries(data.items, {
 *   getTransactionUrl: (hash) => adapter.getExplorerTxUrl?.(hash) ?? null,
 *   getAccountUrl: (address) => adapter.getExplorerUrl?.(address) ?? null,
 * });
 * // Returns events sorted by timestamp descending
 * ```
 */
export function transformHistoryEntries(
  entries: HistoryEntry[],
  options: TransformOptions
): RoleChangeEventView[] {
  const transformed = entries.map((entry) => transformHistoryEntry(entry, options));
  return sortHistoryEvents(transformed);
}

// =============================================================================
// Sort Functions
// =============================================================================

/**
 * Sort history events by timestamp descending (newest first).
 *
 * Per FR-016: Events should be sorted with newest first by default.
 *
 * @param events - Array of events to sort
 * @returns New sorted array (does not mutate original)
 *
 * @example
 * ```typescript
 * const sorted = sortHistoryEvents(events);
 * // sorted[0] will be the most recent event
 * ```
 */
export function sortHistoryEvents(events: RoleChangeEventView[]): RoleChangeEventView[] {
  return [...events].sort((a, b) => {
    // Sort by timestamp descending (newest first)
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

// =============================================================================
// Filter Functions
// =============================================================================

/**
 * Filter events by action type (client-side filtering).
 *
 * Note: Role filtering is handled server-side via the roleId parameter.
 * This function only handles the action type filter which is client-side.
 *
 * @param events - Array of events to filter
 * @param actionFilter - Action type filter ('all' includes all events)
 * @returns Filtered array of events
 *
 * @example
 * ```typescript
 * const grantEvents = filterByActionType(events, 'grant');
 * // Returns only grant events
 *
 * const allEvents = filterByActionType(events, 'all');
 * // Returns all events unchanged
 * ```
 */
export function filterByActionType(
  events: RoleChangeEventView[],
  actionFilter: RoleChangeAction | 'all'
): RoleChangeEventView[] {
  if (actionFilter === 'all') {
    return events;
  }

  return events.filter((event) => event.action === actionFilter);
}

/**
 * Apply all client-side filters to events.
 *
 * Note: Server-side filters (roleId) are applied via API parameters.
 * This function handles client-side filtering only.
 *
 * @param events - Array of events to filter
 * @param filters - Current filter state
 * @returns Filtered array of events
 *
 * @example
 * ```typescript
 * const filtered = applyHistoryFilters(events, { actionFilter: 'grant', roleFilter: 'all' });
 * ```
 */
export function applyHistoryFilters(
  events: RoleChangeEventView[],
  filters: HistoryFilterState
): RoleChangeEventView[] {
  // Apply action type filter (client-side)
  return filterByActionType(events, filters.actionFilter);
}

// =============================================================================
// Role Extraction
// =============================================================================

/**
 * Extract unique roles from events for the filter dropdown.
 *
 * @param events - Array of events to extract roles from
 * @returns Array of unique role info for filter dropdown
 *
 * @example
 * ```typescript
 * const roles = extractAvailableRoles(events);
 * // [{ id: 'ADMIN_ROLE', name: 'Admin' }, { id: 'MINTER_ROLE', name: 'Minter' }]
 * ```
 */
export function extractAvailableRoles(events: RoleChangeEventView[]): RoleBadgeInfo[] {
  const rolesMap = new Map<string, RoleBadgeInfo>();

  for (const event of events) {
    if (!rolesMap.has(event.roleId)) {
      rolesMap.set(event.roleId, {
        id: event.roleId,
        name: event.roleName,
      });
    }
  }

  // Sort alphabetically by name for consistent dropdown order
  return Array.from(rolesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}
