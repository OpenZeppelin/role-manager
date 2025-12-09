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

import type { RoleBadgeInfo } from '../types/authorized-accounts';
import {
  CHANGE_TYPE_TO_ACTION,
  type HistoryChangeType,
  type HistoryEntry,
  type HistoryFilterState,
  type RoleChangeAction,
  type RoleChangeEventView,
} from '../types/role-changes';
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
 * Function type for generating transaction URLs.
 * Used to delegate URL construction to the adapter's getExplorerTxUrl method.
 */
export type GetTransactionUrlFn = (txHash: string) => string | null;

/**
 * Transform a single history entry from the API into a presentation model.
 *
 * @param entry - Raw history entry from getHistory() API
 * @param getTransactionUrl - Function to generate transaction URL (typically adapter.getExplorerTxUrl)
 * @returns Presentation model for the UI
 *
 * @example
 * ```typescript
 * const event = transformHistoryEntry(entry, (hash) => adapter.getExplorerTxUrl?.(hash) ?? null);
 * // { id: '...', timestamp: '...', action: 'grant', ... }
 * ```
 */
export function transformHistoryEntry(
  entry: HistoryEntry,
  getTransactionUrl: GetTransactionUrlFn
): RoleChangeEventView {
  const action = CHANGE_TYPE_MAP[entry.changeType] ?? 'grant';
  const timestamp = entry.timestamp ?? new Date().toISOString();

  return {
    id: `${timestamp}-${entry.changeType}-${entry.role.id}-${entry.account}`,
    timestamp,
    action,
    roleId: entry.role.id,
    roleName: getRoleName(undefined, entry.role.id),
    account: entry.account,
    transactionHash: entry.txId ?? null,
    transactionUrl: entry.txId ? getTransactionUrl(entry.txId) : null,
    ledger: entry.ledger ?? null,
  };
}

/**
 * Transform an array of history entries into presentation models.
 * Results are sorted by timestamp descending (newest first) per FR-016.
 *
 * @param entries - Array of raw history entries from getHistory() API
 * @param getTransactionUrl - Function to generate transaction URL (typically adapter.getExplorerTxUrl)
 * @returns Array of presentation models sorted by timestamp (newest first)
 *
 * @example
 * ```typescript
 * const events = transformHistoryEntries(data.items, (hash) => adapter.getExplorerTxUrl?.(hash) ?? null);
 * // Returns events sorted by timestamp descending
 * ```
 */
export function transformHistoryEntries(
  entries: HistoryEntry[],
  getTransactionUrl: GetTransactionUrlFn
): RoleChangeEventView[] {
  const transformed = entries.map((entry) => transformHistoryEntry(entry, getTransactionUrl));
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
