/**
 * AccessManager types and service interface
 * Feature: 018-access-manager
 *
 * OpenZeppelin AccessManager (OZ 5.x) uses a fundamentally different model
 * from AccessControl: uint64 role IDs, target-function-role mappings,
 * execution delays, and operation scheduling.
 *
 * This file defines all domain types and the service interface locally
 * (fork/extend approach — not upstream in @openzeppelin/ui-types).
 */

import type {
  ExecutionConfig,
  OperationResult,
  TransactionStatusUpdate,
  TxStatus,
} from '@openzeppelin/ui-types';

// =============================================================================
// Status Callback
// =============================================================================

/** Callback for transaction status updates during mutations */
export type AccessManagerStatusCallback = (
  status: TxStatus,
  details: TransactionStatusUpdate
) => void;

// =============================================================================
// Role Domain Types
// =============================================================================

/**
 * A member of an AccessManager role with execution delay metadata.
 */
export interface AccessManagerMember {
  /** Member address */
  address: string;
  /** Timestamp (uint48) when the member's role became active */
  since: number;
  /** Current execution delay in seconds (uint32) */
  executionDelay: number;
  /** Pending delay change, if any */
  pendingDelay?: {
    /** New delay value in seconds */
    newDelay: number;
    /** Timestamp when the new delay takes effect */
    effect: number;
  };
}

/**
 * An AccessManager role with full metadata.
 *
 * Unlike AccessControl's bytes32 roles, AccessManager uses uint64 role IDs
 * and attaches admin/guardian hierarchy and grant delays to each role.
 */
export interface AccessManagerRole {
  /** Role ID as string (uint64) */
  roleId: string;
  /** Human-readable label set via labelRole(), or null */
  label: string | null;
  /** Admin role ID (uint64) — the role that can grant/revoke this role */
  adminRoleId: string;
  /** Guardian role ID (uint64) — the role that can cancel grants of this role */
  guardianRoleId: string;
  /** Delay in seconds before a role grant becomes effective */
  grantDelay: number;
  /** Members of this role */
  members: AccessManagerMember[];
}

// =============================================================================
// Target Domain Types
// =============================================================================

/**
 * A function-to-role mapping on a managed target contract.
 */
export interface FunctionRoleMapping {
  /** Function selector (bytes4, e.g. "0x12345678") */
  selector: string;
  /** Resolved function name from ABI, if available */
  functionName?: string;
  /** Role ID required to call this function (uint64 as string) */
  roleId: string;
}

/**
 * Configuration for a target contract managed by the AccessManager.
 */
export interface TargetConfig {
  /** Target contract address */
  target: string;
  /** Whether the target is closed (all calls rejected) */
  isClosed: boolean;
  /** Current admin delay in seconds (uint32) */
  adminDelay: number;
  /** Pending admin delay change, if any */
  pendingAdminDelay?: {
    /** New delay value in seconds */
    newDelay: number;
    /** Timestamp when the new delay takes effect */
    since: number;
  };
  /** Function-to-role mappings for this target */
  functionRoles: FunctionRoleMapping[];
}

// =============================================================================
// Scheduled Operation Types
// =============================================================================

/**
 * A scheduled operation in the AccessManager's timelock queue.
 */
export interface ScheduledOperation {
  /** Operation ID (bytes32 hash) */
  operationId: string;
  /** Operation nonce (uint32) */
  nonce: number;
  /** Scheduled execution timestamp (uint48) */
  schedule: number;
  /** Address that initiated the operation */
  caller: string;
  /** Target contract address */
  target: string;
  /** Encoded calldata (bytes) */
  data: string;
  /** Whether the operation is ready to execute (schedule reached, not expired) */
  isReady: boolean;
  /** Whether the operation has expired past the expiration window */
  isExpired: boolean;
}

/**
 * Result of a canCall() check.
 */
export interface CanCallResult {
  /** Whether the caller can execute immediately (no delay) */
  immediate: boolean;
  /** Execution delay in seconds (uint32). 0 if immediate is true */
  delay: number;
}

// =============================================================================
// Sync Progress Types
// =============================================================================

/** Progress phases during AccessManager event sync */
export type SyncPhase = 'deployment-block' | 'scanning-events' | 'fetching-metadata' | 'complete';

/** Progress report during sync operations */
export interface SyncProgress {
  phase: SyncPhase;
  /** Number of blocks scanned so far */
  blocksScanned?: number;
  /** Total blocks to scan */
  blocksTotal?: number;
  /** Number of roles discovered */
  rolesFound?: number;
  /** Number of targets discovered */
  targetsFound?: number;
}

/** Callback for sync progress updates */
export type SyncProgressCallback = (progress: SyncProgress) => void;

/** Options for read operations that support incremental sync */
export interface SyncReadOptions {
  /** Block to start scanning from (for incremental sync) */
  fromBlock?: bigint;
  /** Progress callback */
  onProgress?: SyncProgressCallback;
}

// =============================================================================
// Service Interface
// =============================================================================

/**
 * Service interface for AccessManager operations.
 *
 * Separate from AccessControlService because AccessManager has fundamentally
 * different semantics (uint64 roles, target management, operation scheduling).
 */
export interface AccessManagerService {
  // ── Read Operations ──

  /** Get the deployment block of the contract */
  getDeploymentBlock(managerAddress: string): Promise<bigint>;

  /** Get raw event history (all AccessManager events with block info) */
  getEventHistory?(
    managerAddress: string,
    options?: SyncReadOptions
  ): Promise<
    Array<{
      type: 'grant' | 'revoke' | 'target-role' | 'label';
      blockNumber: number;
      transactionHash: string;
      timestamp: number;
      roleId?: string;
      account?: string;
      target?: string;
      selector?: string;
      label?: string;
    }>
  >;

  /** Fetch all roles with their metadata and members */
  getRoles(managerAddress: string, options?: SyncReadOptions): Promise<AccessManagerRole[]>;

  /** Fetch all managed target configurations */
  getTargets(managerAddress: string, options?: SyncReadOptions): Promise<TargetConfig[]>;

  /** Fetch all pending scheduled operations */
  getScheduledOperations(
    managerAddress: string,
    options?: SyncReadOptions
  ): Promise<ScheduledOperation[]>;

  /** Check if a caller can call a specific function on a target */
  canCall(
    managerAddress: string,
    caller: string,
    target: string,
    selector: string
  ): Promise<CanCallResult>;

  /** Check if an account has a specific role */
  hasRole(
    managerAddress: string,
    roleId: string,
    account: string
  ): Promise<{ isMember: boolean; executionDelay: number }>;

  // ── Role Management Mutations ──

  /** Grant a role to an account with an execution delay */
  grantRole(
    managerAddress: string,
    roleId: string,
    account: string,
    executionDelay: number,
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult>;

  /** Revoke a role from an account */
  revokeRole(
    managerAddress: string,
    roleId: string,
    account: string,
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult>;

  /** Renounce a role (caller must confirm their own address) */
  renounceRole(
    managerAddress: string,
    roleId: string,
    callerConfirmation: string,
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult>;

  /** Set a human-readable label for a role */
  labelRole(
    managerAddress: string,
    roleId: string,
    label: string,
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult>;

  /** Set the admin role for a role */
  setRoleAdmin(
    managerAddress: string,
    roleId: string,
    adminId: string,
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult>;

  /** Set the guardian role for a role */
  setRoleGuardian(
    managerAddress: string,
    roleId: string,
    guardianId: string,
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult>;

  /** Set the grant delay for a role */
  setGrantDelay(
    managerAddress: string,
    roleId: string,
    delay: number,
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult>;

  // ── Target Management Mutations ──

  /** Set the role required for specific function selectors on a target */
  setTargetFunctionRole(
    managerAddress: string,
    target: string,
    selectors: string[],
    roleId: string,
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult>;

  /** Open or close a target (closed targets reject all calls) */
  setTargetClosed(
    managerAddress: string,
    target: string,
    closed: boolean,
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult>;

  /** Set the admin delay for a target */
  setTargetAdminDelay(
    managerAddress: string,
    target: string,
    delay: number,
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult>;

  /** Update the authority (AccessManager) for a target contract */
  updateAuthority(
    managerAddress: string,
    target: string,
    newAuthority: string,
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult>;

  // ── Operation Lifecycle Mutations ──

  /** Schedule a delayed operation */
  schedule(
    managerAddress: string,
    target: string,
    data: string,
    when: number,
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult>;

  /** Execute a previously scheduled operation (or an immediate one) */
  execute(
    managerAddress: string,
    target: string,
    data: string,
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult>;

  /** Cancel a scheduled operation */
  cancel(
    managerAddress: string,
    caller: string,
    target: string,
    data: string,
    config: ExecutionConfig,
    onStatus: AccessManagerStatusCallback
  ): Promise<OperationResult>;
}
