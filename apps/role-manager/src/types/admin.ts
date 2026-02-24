/**
 * Admin delay types
 * Feature: 017-evm-access-control (T059, US7)
 *
 * View model types for admin transfer delay display and management.
 * Matches the shape of AdminInfo.delayInfo from @openzeppelin/ui-types
 * when populated by the EVM adapter (AccessControlDefaultAdminRules).
 */

/**
 * Pending admin delay change (scheduled but not yet effective).
 */
export interface PendingAdminDelay {
  /** New delay value in seconds */
  newDelay: number;
  /** When the new delay takes effect (UNIX timestamp) */
  effectAt: number;
}

/**
 * Admin transfer delay information.
 * Sourced from AdminInfo.delayInfo when the adapter supports it.
 */
export interface AdminDelayInfo {
  /** Current admin transfer delay in seconds */
  currentDelay: number;
  /** Pending delay change, if any */
  pendingDelay?: PendingAdminDelay;
}
