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

/** AccessManager mutation types (Feature: 018-access-manager) */
export type AccessManagerMutationType =
  | 'amGrantRole'
  | 'amRevokeRole'
  | 'amRenounceRole'
  | 'amLabelRole'
  | 'amSetRoleAdmin'
  | 'amSetRoleGuardian'
  | 'amSetGrantDelay'
  | 'amSetTargetFunctionRole'
  | 'amSetTargetClosed'
  | 'amSetTargetAdminDelay'
  | 'amUpdateAuthority'
  | 'amSchedule'
  | 'amExecute'
  | 'amCancel';

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
}

// =============================================================================
// Invalidation Map
// =============================================================================

/**
 * Declarative map of mutation type → invalidation config.
 *
 * Convention:
 * - `keys` lists everything that *might* be stale after this mutation.
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
  },

  acceptOwnership: {
    keys: (addr) => [
      queryKeys.contractOwnership(addr),
      queryKeys.contractRoles(addr),
      queryKeys.contractRolesEnriched(addr),
      queryKeys.contractHistory(addr),
    ],
  },

  renounceOwnership: {
    keys: (addr) => [
      queryKeys.contractOwnership(addr),
      queryKeys.contractRoles(addr),
      queryKeys.contractRolesEnriched(addr),
      queryKeys.contractHistory(addr),
    ],
  },

  // ---- Admin mutations ----

  transferAdmin: {
    keys: (addr) => [queryKeys.contractAdminInfo(addr), queryKeys.contractHistory(addr)],
  },

  acceptAdmin: {
    keys: (addr) => [
      queryKeys.contractAdminInfo(addr),
      queryKeys.contractRoles(addr),
      queryKeys.contractRolesEnriched(addr),
      queryKeys.contractHistory(addr),
    ],
  },

  cancelAdmin: {
    keys: (addr) => [queryKeys.contractAdminInfo(addr), queryKeys.contractHistory(addr)],
    deferredRefetchMs: 3000,
  },

  changeAdminDelay: {
    keys: (addr) => [queryKeys.contractAdminInfo(addr), queryKeys.contractHistory(addr)],
    deferredRefetchMs: 3000,
  },

  rollbackAdminDelay: {
    keys: (addr) => [queryKeys.contractAdminInfo(addr), queryKeys.contractHistory(addr)],
    deferredRefetchMs: 3000,
  },
};

// =============================================================================
// AccessManager Invalidation Map (Feature: 018-access-manager)
// =============================================================================

export const accessManagerInvalidationMap: Record<AccessManagerMutationType, InvalidationConfig> = {
  // ── Role mutations ──

  amGrantRole: {
    keys: (addr) => [queryKeys.accessManagerRoles(addr), queryKeys.contractHistory(addr)],
  },

  amRevokeRole: {
    keys: (addr) => [queryKeys.accessManagerRoles(addr), queryKeys.contractHistory(addr)],
  },

  amRenounceRole: {
    keys: (addr) => [queryKeys.accessManagerRoles(addr), queryKeys.contractHistory(addr)],
  },

  amLabelRole: {
    keys: (addr) => [queryKeys.accessManagerRoles(addr), queryKeys.contractHistory(addr)],
  },

  amSetRoleAdmin: {
    keys: (addr) => [queryKeys.accessManagerRoles(addr), queryKeys.contractHistory(addr)],
  },

  amSetRoleGuardian: {
    keys: (addr) => [queryKeys.accessManagerRoles(addr), queryKeys.contractHistory(addr)],
  },

  amSetGrantDelay: {
    keys: (addr) => [queryKeys.accessManagerRoles(addr), queryKeys.contractHistory(addr)],
    deferredRefetchMs: 3000,
  },

  // ── Target mutations ──

  amSetTargetFunctionRole: {
    keys: (addr) => [queryKeys.accessManagerTargets(addr), queryKeys.contractHistory(addr)],
  },

  amSetTargetClosed: {
    keys: (addr) => [queryKeys.accessManagerTargets(addr), queryKeys.contractHistory(addr)],
  },

  amSetTargetAdminDelay: {
    keys: (addr) => [queryKeys.accessManagerTargets(addr), queryKeys.contractHistory(addr)],
    deferredRefetchMs: 3000,
  },

  amUpdateAuthority: {
    keys: (addr) => [queryKeys.accessManagerTargets(addr), queryKeys.contractHistory(addr)],
  },

  // ── Operation lifecycle mutations ──

  amSchedule: {
    keys: (addr) => [queryKeys.accessManagerOperations(addr), queryKeys.contractHistory(addr)],
  },

  amExecute: {
    keys: (addr) => [
      queryKeys.accessManagerOperations(addr),
      queryKeys.accessManagerRoles(addr),
      queryKeys.accessManagerTargets(addr),
      queryKeys.contractHistory(addr),
    ],
  },

  amCancel: {
    keys: (addr) => [queryKeys.accessManagerOperations(addr), queryKeys.contractHistory(addr)],
  },
};
