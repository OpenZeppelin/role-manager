/**
 * useFilterAnalytics hook
 *
 * Emits a `filter_applied` analytics event for each filter field that changed
 * since the last reported state. Pages wrap their `setFilters` with the
 * returned callback so tracking stays out of the filter bar components.
 *
 * The last reported state lives in a ref (not the render closure) so several
 * updates in one tick are each diffed against the true previous state rather
 * than a stale render value.
 *
 * Privacy: free-form fields (search text, date bounds) are reported only as
 * "set"/"cleared" — a search query may contain a wallet address.
 */
import { useCallback, useEffect, useRef } from 'react';

import { getAnalyticsNetworkContext, useRoleManagerAnalytics } from './useRoleManagerAnalytics';
import { useSelectedContract } from './useSelectedContract';

// =============================================================================
// Types & constants
// =============================================================================

/** Filter states are plain objects whose values are primitives or undefined. */
type FilterValue = unknown;

/** Filter fields whose raw value must never be sent to analytics. */
const FREE_FORM_FILTER_FIELDS: ReadonlySet<string> = new Set([
  'searchQuery',
  'timestampFrom',
  'timestampTo',
]);

const FILTER_VALUE_SET = 'set';
const FILTER_VALUE_CLEARED = 'cleared';

// =============================================================================
// Helpers
// =============================================================================

function isEmptyFilterValue(value: FilterValue): boolean {
  return value === undefined || value === '';
}

/**
 * Map a filter value to what is safe to report.
 * Free-form fields collapse to set/cleared; enumerated fields report their value.
 */
export function toAnalyticsFilterValue(field: string, value: FilterValue): string {
  if (FREE_FORM_FILTER_FIELDS.has(field)) {
    return isEmptyFilterValue(value) ? FILTER_VALUE_CLEARED : FILTER_VALUE_SET;
  }
  return isEmptyFilterValue(value) ? FILTER_VALUE_CLEARED : String(value);
}

/**
 * Compute the `[field, reportedValue]` pairs that changed between two states.
 *
 * Free-form fields only produce a change when they cross the empty/non-empty
 * boundary so typing into a search box does not emit an event per keystroke.
 */
export function diffFilterStates<T extends object>(previous: T, next: T): Array<[string, string]> {
  const previousValues = previous as Record<string, FilterValue>;
  const nextValues = next as Record<string, FilterValue>;
  const fields = new Set([...Object.keys(previousValues), ...Object.keys(nextValues)]);
  const changes: Array<[string, string]> = [];

  for (const field of fields) {
    const before = toAnalyticsFilterValue(field, previousValues[field]);
    const after = toAnalyticsFilterValue(field, nextValues[field]);
    if (before !== after) {
      changes.push([field, after]);
    }
  }

  return changes;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Returns a callback that reports filter changes for the given page.
 *
 * @param page - Page name as used in the `filter_applied.page` dimension
 * @param currentFilters - The page's current filter state; keeps the baseline
 *   in sync when filters change outside the returned callback (e.g. reset)
 *
 * @example
 * ```tsx
 * const trackFilterChanges = useFilterAnalytics('Role Changes', filters);
 * const handleFiltersChange = (next: HistoryFilterState) => {
 *   trackFilterChanges(next);
 *   setFilters(next);
 * };
 * ```
 */
export function useFilterAnalytics<T extends object>(page: string, currentFilters: T) {
  const { runtime } = useSelectedContract();
  const { trackFilterApplied } = useRoleManagerAnalytics();

  // Last state we diffed against. Updated synchronously in the callback so
  // rapid successive calls (before React re-renders) see the real previous
  // state; re-synced from props so external resets don't produce phantom diffs.
  const lastReportedRef = useRef<T>(currentFilters);
  useEffect(() => {
    lastReportedRef.current = currentFilters;
  }, [currentFilters]);

  return useCallback(
    (next: T) => {
      const changes = diffFilterStates(lastReportedRef.current, next);
      lastReportedRef.current = next;
      if (changes.length === 0) return;

      const network = getAnalyticsNetworkContext(runtime);
      for (const [field, value] of changes) {
        trackFilterApplied(page, field, value, network);
      }
    },
    [page, runtime, trackFilterApplied]
  );
}
