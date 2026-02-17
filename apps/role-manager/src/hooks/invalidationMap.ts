/**
 * Invalidation Map
 *
 * Declarative mapping from mutation types to the query keys they must
 * invalidate after a successful transaction.
 *
 * Why centralized:
 * - Each mutation previously maintained its own onSuccess invalidation logic,
 *   leading to inconsistent cross-invalidation (e.g. acceptOwnership didn't
 *   invalidate roles, history was never invalidated at all).
 * - A single map makes the "mutation → stale queries" relationship auditable
 *   and easy to extend when new mutation types or query keys are added.
 *
 * Rules:
 * - Every mutation invalidates `contractHistory` (prefix-match) so the Role
 *   Changes page always reflects the latest on-chain state.
 * - Mutations that change role membership also invalidate both the basic and
 *   enriched roles queries.
 * - Admin mutations that affect delay values use `deferredRefetchMs` to
 *   account for RPC propagation delay before the new value is readable.
 */

import { queryKeys } from './queryKeys';

// =============================================================================
// Types
// =============================================================================

/** All mutation types supported by the access control mutations layer */
export type MutationType =
  | 'grantRole'
  | 'revokeRole'
  | 'renounceRole'
  | 'transferOwnership'
  | 'acceptOwnership'
  | 'renounceOwnership'
  | 'transferAdmin'
  | 'acceptAdmin'
  | 'cancelAdmin'
  | 'changeAdminDelay'
  | 'rollbackAdminDelay';

/** Configuration for post-mutation query invalidation */
export interface InvalidationConfig {
  /** Query key factories to invalidate (called with contractAddress) */
  keys: (address: string) => readonly (readonly string[])[];

  /**
   * Optional deferred refetch delay (ms) for RPC propagation lag.
   * When set, the executor will schedule a second invalidation pass
   * after this many milliseconds to pick up values that weren't yet
   * propagated at the time of the initial invalidation.
   */
  deferredRefetchMs?: number;

  /**
   * Query key factories whose results should be awaited (force refetch)
   * rather than just invalidated. This ensures the UI has fresh data
   * before the mutation is considered "done". Called with contractAddress.
   */
  awaitRefetch?: (address: string) => readonly (readonly string[])[];
}

// =============================================================================
// Invalidation Map
// =============================================================================

/**
 * Declarative map of mutation type → invalidation config.
 *
 * Convention:
 * - `keys` lists everything that *might* be stale after this mutation.
 * - `awaitRefetch` lists the keys whose fresh data is critical for the
 *   immediate UI update (e.g. ownership after transferOwnership).
 * - `deferredRefetchMs` is used when the RPC might not yet reflect the
 *   new state (e.g. after admin delay changes on EVM).
 */
export const invalidationMap: Record<MutationType, InvalidationConfig> = {
  // ---- Role mutations ----

  grantRole: {
    keys: (addr) => [
      queryKeys.contractRoles(addr),
      queryKeys.contractRolesEnriched(addr),
      queryKeys.contractHistory(addr),
    ],
  },

  revokeRole: {
    keys: (addr) => [
      queryKeys.contractRoles(addr),
      queryKeys.contractRolesEnriched(addr),
      queryKeys.contractHistory(addr),
    ],
  },

  renounceRole: {
    keys: (addr) => [
      queryKeys.contractRoles(addr),
      queryKeys.contractRolesEnriched(addr),
      queryKeys.contractHistory(addr),
    ],
  },

  // ---- Ownership mutations ----

  transferOwnership: {
    keys: (addr) => [queryKeys.contractOwnership(addr), queryKeys.contractHistory(addr)],
    awaitRefetch: (addr) => [queryKeys.contractOwnership(addr)],
  },

  acceptOwnership: {
    keys: (addr) => [
      queryKeys.contractOwnership(addr),
      queryKeys.contractRoles(addr),
      queryKeys.contractRolesEnriched(addr),
      queryKeys.contractHistory(addr),
    ],
    awaitRefetch: (addr) => [queryKeys.contractOwnership(addr)],
  },

  renounceOwnership: {
    keys: (addr) => [
      queryKeys.contractOwnership(addr),
      queryKeys.contractRoles(addr),
      queryKeys.contractRolesEnriched(addr),
      queryKeys.contractHistory(addr),
    ],
    awaitRefetch: (addr) => [queryKeys.contractOwnership(addr)],
  },

  // ---- Admin mutations ----

  transferAdmin: {
    keys: (addr) => [queryKeys.contractAdminInfo(addr), queryKeys.contractHistory(addr)],
    awaitRefetch: (addr) => [queryKeys.contractAdminInfo(addr)],
  },

  acceptAdmin: {
    keys: (addr) => [
      queryKeys.contractAdminInfo(addr),
      queryKeys.contractRoles(addr),
      queryKeys.contractRolesEnriched(addr),
      queryKeys.contractHistory(addr),
    ],
    awaitRefetch: (addr) => [queryKeys.contractAdminInfo(addr)],
  },

  cancelAdmin: {
    keys: (addr) => [queryKeys.contractAdminInfo(addr), queryKeys.contractHistory(addr)],
    awaitRefetch: (addr) => [queryKeys.contractAdminInfo(addr)],
    deferredRefetchMs: 3000,
  },

  changeAdminDelay: {
    keys: (addr) => [queryKeys.contractAdminInfo(addr), queryKeys.contractHistory(addr)],
    awaitRefetch: (addr) => [queryKeys.contractAdminInfo(addr)],
    deferredRefetchMs: 3000,
  },

  rollbackAdminDelay: {
    keys: (addr) => [queryKeys.contractAdminInfo(addr), queryKeys.contractHistory(addr)],
    awaitRefetch: (addr) => [queryKeys.contractAdminInfo(addr)],
    deferredRefetchMs: 3000,
  },
};
