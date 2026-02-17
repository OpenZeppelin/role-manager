/**
 * Query Key Registry
 *
 * Single source of truth for all React Query cache keys used across the app.
 * Every hook that creates or invalidates a query MUST import its key from here.
 *
 * Why centralized:
 * - Mutations need to know which queries to invalidate after success.
 * - Having keys scattered across files leads to silent invalidation bugs
 *   when a key string is renamed in one file but not another.
 * - A single registry makes the "mutation → affected queries" relationship
 *   auditable from one place (see invalidationMap.ts).
 */

// =============================================================================
// Query Key Factories
// =============================================================================

export const queryKeys = {
  /** Role assignments (basic format — used by Roles page) */
  contractRoles: (address: string) => ['contractRoles', address] as const,

  /** Enriched role assignments with timestamps (used by Authorized Accounts / Dashboard) */
  contractRolesEnriched: (address: string) => ['contractRolesEnriched', address] as const,

  /** Ownership info including pending transfer */
  contractOwnership: (address: string) => ['contractOwnership', address] as const,

  /** Admin info including pending transfer and delay info */
  contractAdminInfo: (address: string) => ['contractAdminInfo', address] as const,

  /** Contract capability detection (hasAccessControl, hasOwnable, etc.) */
  contractCapabilities: (address: string) => ['contractCapabilities', address] as const,

  /**
   * History entries (prefix key for invalidation).
   * Individual queries append filter params as a second element;
   * `invalidateQueries({ queryKey: queryKeys.contractHistory(addr) })`
   * matches all filter variations via React Query's prefix matching.
   */
  contractHistory: (address: string) => ['contract-history', address] as const,

  /** Current block/ledger number (keyed by network) */
  currentBlock: (networkId: string | undefined) => ['currentBlock', networkId] as const,

  /** Expiration metadata (keyed by contract + transfer type + network) */
  expirationMetadata: (
    contractAddress: string,
    transferType: 'ownership' | 'admin',
    networkId: string | undefined
  ) => ['expirationMetadata', contractAddress, transferType, networkId] as const,
} as const;
