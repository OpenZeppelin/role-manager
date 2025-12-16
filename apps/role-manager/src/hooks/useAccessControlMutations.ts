/**
 * useAccessControlMutations hooks
 * Feature: 006-access-control-service
 *
 * Provides mutation hooks for access control operations:
 * - useGrantRole: Grant a role to an account
 * - useRevokeRole: Revoke a role from an account
 * - useTransferOwnership: Transfer contract ownership
 * - useExportSnapshot: Export current access control state as JSON
 *
 * All hooks implement:
 * - Network disconnection handling (FR-010)
 * - User rejection handling (FR-011)
 * - Query invalidation for concurrent modification safeguards (FR-014)
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import type {
  ContractAdapter,
  ExecutionConfig,
  OperationResult,
  RoleAssignment,
  TransactionStatusUpdate,
  TxStatus,
} from '@openzeppelin/ui-builder-types';

import { useAccessControlService } from './useAccessControlService';
import { adminInfoQueryKey } from './useContractData';

// ============================================================================
// Query Keys (must match useContractRolesEnriched.ts and useContractData.ts)
// ============================================================================

const rolesQueryKey = (address: string) => ['contractRoles', address] as const;
const enrichedRolesQueryKey = (address: string) => ['contractRolesEnriched', address] as const;
const ownershipQueryKey = (address: string) => ['contractOwnership', address] as const;

// ============================================================================
// Error Detection Utilities
// ============================================================================

/**
 * Common patterns for network disconnection errors
 */
const NETWORK_ERROR_PATTERNS = [
  'network',
  'disconnected',
  'connection',
  'timeout',
  'offline',
  'ENOTFOUND',
  'ECONNREFUSED',
  'ENETUNREACH',
  'fetch failed',
];

/**
 * Common patterns for user rejection errors
 */
const USER_REJECTION_PATTERNS = [
  'rejected',
  'cancelled',
  'canceled',
  'denied',
  'user refused',
  'user denied',
  'user rejected',
  'user cancelled',
  'transaction was rejected',
  'Action cancelled',
];

/**
 * Detect if an error is a network disconnection error
 */
function isNetworkDisconnectionError(error: unknown): boolean {
  if (!error) return false;

  const errorMessage =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const errorName = error instanceof Error ? error.name.toLowerCase() : '';

  return (
    NETWORK_ERROR_PATTERNS.some(
      (pattern) => errorMessage.includes(pattern.toLowerCase()) || errorName.includes(pattern)
    ) || errorName === 'networkdisconnectederror'
  );
}

/**
 * Detect if an error is a user rejection error
 */
function isUserRejectionError(error: unknown): boolean {
  if (!error) return false;

  const errorMessage =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const errorName = error instanceof Error ? error.name.toLowerCase() : '';

  return (
    USER_REJECTION_PATTERNS.some(
      (pattern) => errorMessage.includes(pattern.toLowerCase()) || errorName.includes(pattern)
    ) || errorName === 'userrejectederror'
  );
}

// ============================================================================
// Types
// ============================================================================

/**
 * Common arguments for role mutation operations (grant/revoke).
 * Both operations share the same argument structure.
 */
export interface RoleMutationArgs {
  /** The role identifier */
  roleId: string;
  /** The account address */
  account: string;
  /** Execution configuration (EOA, relayer, etc.) */
  executionConfig: ExecutionConfig;
  /** Optional runtime API key for relayer */
  runtimeApiKey?: string;
}

/**
 * Arguments for useGrantRole mutation.
 * Type alias for RoleMutationArgs since grant and revoke share the same structure.
 */
export type GrantRoleArgs = RoleMutationArgs;

/**
 * Arguments for useRevokeRole mutation.
 * Type alias for RoleMutationArgs since grant and revoke share the same structure.
 */
export type RevokeRoleArgs = RoleMutationArgs;

/**
 * Arguments for useTransferOwnership mutation
 */
export interface TransferOwnershipArgs {
  /** The new owner address */
  newOwner: string;
  /**
   * The block or ledger number at which the ownership transfer will expire if not accepted.
   * Used for two-step ownership transfers to set a deadline for the new owner to accept.
   * After this block/ledger, the transfer becomes invalid and must be re-initiated.
   */
  expirationBlock: number;
  /** Execution configuration (EOA, relayer, etc.) */
  executionConfig: ExecutionConfig;
  /** Optional runtime API key for relayer */
  runtimeApiKey?: string;
}

/**
 * Arguments for useAcceptOwnership mutation (Feature: 015-ownership-transfer)
 */
export interface AcceptOwnershipArgs {
  /** Execution configuration (EOA, relayer, etc.) */
  executionConfig: ExecutionConfig;
  /** Optional runtime API key for relayer */
  runtimeApiKey?: string;
}

/**
 * Arguments for useTransferAdminRole mutation (Feature: 016-two-step-admin-assignment)
 */
export interface TransferAdminRoleArgs {
  /** The new admin address */
  newAdmin: string;
  /** The block/ledger number at which the transfer expires if not accepted */
  expirationBlock: number;
  /** Execution configuration (EOA, relayer, etc.) */
  executionConfig: ExecutionConfig;
  /** Optional runtime API key for relayer */
  runtimeApiKey?: string;
}

/**
 * Arguments for useAcceptAdminTransfer mutation (Feature: 016-two-step-admin-assignment)
 */
export interface AcceptAdminTransferArgs {
  /** Execution configuration (EOA, relayer, etc.) */
  executionConfig: ExecutionConfig;
  /** Optional runtime API key for relayer */
  runtimeApiKey?: string;
}

/**
 * Options for mutation hooks
 */
export interface MutationHookOptions {
  /** Callback for transaction status changes */
  onStatusChange?: (status: TxStatus, details: TransactionStatusUpdate) => void;
  /** Callback on successful mutation */
  onSuccess?: (result: OperationResult) => void;
  /** Callback on mutation error */
  onError?: (error: Error) => void;
}

/**
 * Return type for mutation hooks
 */
export interface UseAccessControlMutationReturn<TArgs> {
  /** Execute the mutation */
  mutate: (args: TArgs) => void;
  /** Execute the mutation (async) */
  mutateAsync: (args: TArgs) => Promise<OperationResult>;
  /** Whether the mutation is in progress */
  isPending: boolean;
  /** Error from the mutation, if any */
  error: Error | null;
  /** Current transaction status */
  status: TxStatus;
  /** Detailed status update */
  statusDetails: TransactionStatusUpdate | null;
  /** Whether the service is ready (adapter loaded and supports access control) */
  isReady: boolean;
  /** Whether the error is a network disconnection error */
  isNetworkError: boolean;
  /** Whether the error is a user rejection error */
  isUserRejection: boolean;
  /** Reset the mutation state */
  reset: () => void;
}

// ============================================================================
// useRoleMutation (Internal Factory Hook)
// ============================================================================

/**
 * Internal factory hook for role mutations (grant/revoke).
 * Extracts common logic to avoid duplication between useGrantRole and useRevokeRole.
 *
 * @param adapter - The contract adapter instance
 * @param contractAddress - The contract address to operate on
 * @param operation - 'grant' or 'revoke'
 * @param options - Optional callbacks
 */
function useRoleMutation(
  adapter: ContractAdapter | null,
  contractAddress: string,
  operation: 'grant' | 'revoke',
  options?: MutationHookOptions
): UseAccessControlMutationReturn<RoleMutationArgs> {
  const { service, isReady } = useAccessControlService(adapter);
  const queryClient = useQueryClient();

  // Track transaction status internally
  const [status, setStatus] = useState<TxStatus>('idle');
  const [statusDetails, setStatusDetails] = useState<TransactionStatusUpdate | null>(null);

  // Status change handler that updates internal state and calls external callback
  const handleStatusChange = useCallback(
    (newStatus: TxStatus, details: TransactionStatusUpdate) => {
      setStatus(newStatus);
      setStatusDetails(details);
      options?.onStatusChange?.(newStatus, details);
    },
    [options?.onStatusChange]
  );

  // Smart invalidation logic shared by both grant and revoke
  const invalidateRolesQueries = useCallback(() => {
    // Smart invalidation to prevent double-fetching while ensuring both caches update:
    // - If enrichedRoles has active observers (Authorized Accounts page), cancel basic
    //   query to prevent double-fetch - enriched will populate basic via setQueryData
    // - Otherwise, invalidate both - only the one with observers will refetch,
    //   the other is just marked stale for when user navigates there
    const enrichedQuery = queryClient
      .getQueryCache()
      .find({ queryKey: enrichedRolesQueryKey(contractAddress), exact: true });

    const hasEnrichedObservers = (enrichedQuery?.getObserversCount() ?? 0) > 0;

    if (hasEnrichedObservers) {
      // Authorized Accounts page - enriched query will populate basic via setQueryData.
      // Cancel any in-flight basic query to prevent race conditions, then invalidate
      // to mark it stale (won't refetch since basic has no active observers here).
      queryClient.cancelQueries({ queryKey: rolesQueryKey(contractAddress) });
      queryClient.invalidateQueries({ queryKey: rolesQueryKey(contractAddress) });
      queryClient.invalidateQueries({ queryKey: enrichedRolesQueryKey(contractAddress) });
    } else {
      // Roles page or no observers - invalidate both
      // Only the one with active observers will refetch; the other is marked stale
      queryClient.invalidateQueries({ queryKey: rolesQueryKey(contractAddress) });
      queryClient.invalidateQueries({ queryKey: enrichedRolesQueryKey(contractAddress) });
    }
  }, [queryClient, contractAddress]);

  const mutation = useMutation({
    mutationFn: async (args: RoleMutationArgs): Promise<OperationResult> => {
      if (!service) {
        throw new Error('Access control service not available');
      }

      // Reset status at start
      setStatus('idle');
      setStatusDetails(null);

      // Call the appropriate service method based on operation type
      const serviceMethod = operation === 'grant' ? service.grantRole : service.revokeRole;
      return serviceMethod.call(
        service,
        contractAddress,
        args.roleId,
        args.account,
        args.executionConfig,
        handleStatusChange,
        args.runtimeApiKey
      );
    },
    onSuccess: (result) => {
      invalidateRolesQueries();
      options?.onSuccess?.(result);
    },
    onError: (error: Error) => {
      setStatus('error');
      options?.onError?.(error);
    },
  });

  // Compute error classification
  const errorClassification = useMemo(() => {
    const error = mutation.error;
    return {
      isNetworkError: isNetworkDisconnectionError(error),
      isUserRejection: isUserRejectionError(error),
    };
  }, [mutation.error]);

  // Reset function
  const reset = useCallback(() => {
    mutation.reset();
    setStatus('idle');
    setStatusDetails(null);
  }, [mutation]);

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as Error | null,
    status,
    statusDetails,
    isReady,
    isNetworkError: errorClassification.isNetworkError,
    isUserRejection: errorClassification.isUserRejection,
    reset,
  };
}

// ============================================================================
// useGrantRole Hook
// ============================================================================

/**
 * Hook for granting a role to an account.
 *
 * Provides mutation functionality with:
 * - Transaction status tracking
 * - Network disconnection detection (FR-010)
 * - User rejection detection (FR-011)
 * - Automatic query invalidation on success (FR-014)
 *
 * @param adapter - The contract adapter instance, or null if not loaded
 * @param contractAddress - The contract address to operate on
 * @param options - Optional callbacks for status changes and completion
 * @returns Mutation controls and state
 *
 * @example
 * ```tsx
 * const { mutate, isPending, error } = useGrantRole(adapter, contractAddress);
 *
 * const handleGrant = () => {
 *   mutate({
 *     roleId: 'MINTER_ROLE',
 *     account: '0x...',
 *     executionConfig: { method: 'eoa' },
 *   });
 * };
 * ```
 */
export function useGrantRole(
  adapter: ContractAdapter | null,
  contractAddress: string,
  options?: MutationHookOptions
): UseAccessControlMutationReturn<GrantRoleArgs> {
  return useRoleMutation(adapter, contractAddress, 'grant', options);
}

// ============================================================================
// useRevokeRole Hook
// ============================================================================

/**
 * Hook for revoking a role from an account.
 *
 * Provides mutation functionality with:
 * - Transaction status tracking
 * - Network disconnection detection (FR-010)
 * - User rejection detection (FR-011)
 * - Automatic query invalidation on success (FR-014)
 *
 * @param adapter - The contract adapter instance, or null if not loaded
 * @param contractAddress - The contract address to operate on
 * @param options - Optional callbacks for status changes and completion
 * @returns Mutation controls and state
 *
 * @example
 * ```tsx
 * const { mutate, isPending, error } = useRevokeRole(adapter, contractAddress);
 *
 * const handleRevoke = () => {
 *   mutate({
 *     roleId: 'MINTER_ROLE',
 *     account: '0x...',
 *     executionConfig: { method: 'eoa' },
 *   });
 * };
 * ```
 */
export function useRevokeRole(
  adapter: ContractAdapter | null,
  contractAddress: string,
  options?: MutationHookOptions
): UseAccessControlMutationReturn<RevokeRoleArgs> {
  return useRoleMutation(adapter, contractAddress, 'revoke', options);
}

// ============================================================================
// useTransferOwnership Hook
// ============================================================================

/**
 * Hook for transferring contract ownership.
 *
 * Provides mutation functionality with:
 * - Transaction status tracking
 * - Network disconnection detection (FR-010)
 * - User rejection detection (FR-011)
 * - Automatic query invalidation on success (FR-014)
 *
 * @param adapter - The contract adapter instance, or null if not loaded
 * @param contractAddress - The contract address to operate on
 * @param options - Optional callbacks for status changes and completion
 * @returns Mutation controls and state
 *
 * @example
 * ```tsx
 * const { mutate, isPending, error } = useTransferOwnership(adapter, contractAddress);
 *
 * const handleTransfer = () => {
 *   mutate({
 *     newOwner: '0x...',
 *     executionConfig: { method: 'eoa' },
 *   });
 * };
 * ```
 */
export function useTransferOwnership(
  adapter: ContractAdapter | null,
  contractAddress: string,
  options?: MutationHookOptions
): UseAccessControlMutationReturn<TransferOwnershipArgs> {
  const { service, isReady } = useAccessControlService(adapter);
  const queryClient = useQueryClient();

  // Track transaction status internally
  const [status, setStatus] = useState<TxStatus>('idle');
  const [statusDetails, setStatusDetails] = useState<TransactionStatusUpdate | null>(null);

  // Status change handler that updates internal state and calls external callback
  const handleStatusChange = useCallback(
    (newStatus: TxStatus, details: TransactionStatusUpdate) => {
      setStatus(newStatus);
      setStatusDetails(details);
      options?.onStatusChange?.(newStatus, details);
    },
    [options]
  );

  const mutation = useMutation({
    mutationFn: async (args: TransferOwnershipArgs): Promise<OperationResult> => {
      if (!service) {
        throw new Error('Access control service not available');
      }

      // Reset status at start
      setStatus('idle');
      setStatusDetails(null);

      return service.transferOwnership(
        contractAddress,
        args.newOwner,
        args.expirationBlock,
        args.executionConfig,
        handleStatusChange,
        args.runtimeApiKey
      );
    },
    onSuccess: (result) => {
      // Invalidate ownership query to refetch updated data (FR-014)
      queryClient.invalidateQueries({
        queryKey: ownershipQueryKey(contractAddress),
      });
      options?.onSuccess?.(result);
    },
    onError: (error: Error) => {
      setStatus('error');
      options?.onError?.(error);
    },
  });

  // Compute error classification
  const errorClassification = useMemo(() => {
    const error = mutation.error;
    return {
      isNetworkError: isNetworkDisconnectionError(error),
      isUserRejection: isUserRejectionError(error),
    };
  }, [mutation.error]);

  // Reset function
  const reset = useCallback(() => {
    mutation.reset();
    setStatus('idle');
    setStatusDetails(null);
  }, [mutation]);

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as Error | null,
    status,
    statusDetails,
    isReady,
    isNetworkError: errorClassification.isNetworkError,
    isUserRejection: errorClassification.isUserRejection,
    reset,
  };
}

// ============================================================================
// useAcceptOwnership Hook (Feature: 015-ownership-transfer)
// ============================================================================

/**
 * Hook for accepting a pending ownership transfer (two-step Ownable).
 *
 * Provides mutation functionality with:
 * - Transaction status tracking
 * - Network disconnection detection (FR-010)
 * - User rejection detection (FR-011)
 * - Automatic query invalidation on success (FR-014)
 *
 * @param adapter - The contract adapter instance, or null if not loaded
 * @param contractAddress - The contract address to operate on
 * @param options - Optional callbacks for status changes and completion
 * @returns Mutation controls and state
 *
 * @example
 * ```tsx
 * const { mutate, isPending, error } = useAcceptOwnership(adapter, contractAddress);
 *
 * const handleAccept = () => {
 *   mutate({ executionConfig: { method: 'eoa' } });
 * };
 * ```
 */
export function useAcceptOwnership(
  adapter: ContractAdapter | null,
  contractAddress: string,
  options?: MutationHookOptions
): UseAccessControlMutationReturn<AcceptOwnershipArgs> {
  const { service, isReady } = useAccessControlService(adapter);
  const queryClient = useQueryClient();

  // Track transaction status internally
  const [status, setStatus] = useState<TxStatus>('idle');
  const [statusDetails, setStatusDetails] = useState<TransactionStatusUpdate | null>(null);

  // Status change handler that updates internal state and calls external callback
  const handleStatusChange = useCallback(
    (newStatus: TxStatus, details: TransactionStatusUpdate) => {
      setStatus(newStatus);
      setStatusDetails(details);
      options?.onStatusChange?.(newStatus, details);
    },
    [options]
  );

  const mutation = useMutation({
    mutationFn: async (args: AcceptOwnershipArgs): Promise<OperationResult> => {
      if (!service) {
        throw new Error('Access control service not available');
      }

      if (!service.acceptOwnership) {
        throw new Error('Accept ownership is not supported by this adapter');
      }

      // Reset status at start
      setStatus('idle');
      setStatusDetails(null);

      return service.acceptOwnership(
        contractAddress,
        args.executionConfig,
        handleStatusChange,
        args.runtimeApiKey
      );
    },
    onSuccess: (result) => {
      // Invalidate ownership query to refetch updated data (FR-014)
      queryClient.invalidateQueries({
        queryKey: ownershipQueryKey(contractAddress),
      });
      options?.onSuccess?.(result);
    },
    onError: (error: Error) => {
      setStatus('error');
      options?.onError?.(error);
    },
  });

  // Compute error classification
  const errorClassification = useMemo(() => {
    const error = mutation.error;
    return {
      isNetworkError: isNetworkDisconnectionError(error),
      isUserRejection: isUserRejectionError(error),
    };
  }, [mutation.error]);

  // Reset function
  const reset = useCallback(() => {
    mutation.reset();
    setStatus('idle');
    setStatusDetails(null);
  }, [mutation]);

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as Error | null,
    status,
    statusDetails,
    isReady,
    isNetworkError: errorClassification.isNetworkError,
    isUserRejection: errorClassification.isUserRejection,
    reset,
  };
}

// ============================================================================
// useTransferAdminRole Hook (Feature: 016-two-step-admin-assignment)
// ============================================================================

/**
 * Hook for transferring admin role (two-step admin transfer).
 *
 * Provides mutation functionality with:
 * - Transaction status tracking
 * - Network disconnection detection (FR-010)
 * - User rejection detection (FR-011)
 * - Automatic query invalidation on success (FR-014)
 *
 * @param adapter - The contract adapter instance, or null if not loaded
 * @param contractAddress - The contract address to operate on
 * @param options - Optional callbacks for status changes and completion
 * @returns Mutation controls and state
 *
 * @example
 * ```tsx
 * const { mutate, isPending, error } = useTransferAdminRole(adapter, contractAddress);
 *
 * const handleTransfer = () => {
 *   mutate({
 *     newAdmin: '0x...',
 *     expirationBlock: 12345678,
 *     executionConfig: { method: 'eoa' },
 *   });
 * };
 * ```
 */
export function useTransferAdminRole(
  adapter: ContractAdapter | null,
  contractAddress: string,
  options?: MutationHookOptions
): UseAccessControlMutationReturn<TransferAdminRoleArgs> {
  const { service, isReady } = useAccessControlService(adapter);
  const queryClient = useQueryClient();

  // Track transaction status internally
  const [status, setStatus] = useState<TxStatus>('idle');
  const [statusDetails, setStatusDetails] = useState<TransactionStatusUpdate | null>(null);

  // Status change handler that updates internal state and calls external callback
  const handleStatusChange = useCallback(
    (newStatus: TxStatus, details: TransactionStatusUpdate) => {
      setStatus(newStatus);
      setStatusDetails(details);
      options?.onStatusChange?.(newStatus, details);
    },
    [options]
  );

  const mutation = useMutation({
    mutationFn: async (args: TransferAdminRoleArgs): Promise<OperationResult> => {
      if (!service) {
        throw new Error('Access control service not available');
      }

      if (!service.transferAdminRole) {
        throw new Error('Transfer admin role is not supported by this adapter');
      }

      // Reset status at start
      setStatus('idle');
      setStatusDetails(null);

      return service.transferAdminRole(
        contractAddress,
        args.newAdmin,
        args.expirationBlock,
        args.executionConfig,
        handleStatusChange,
        args.runtimeApiKey
      );
    },
    onSuccess: async (result) => {
      // Invalidate AND refetch admin info query to ensure UI updates (FR-014)
      // First invalidate to mark stale, then refetch to get fresh data
      await queryClient.invalidateQueries({
        queryKey: adminInfoQueryKey(contractAddress),
      });
      await queryClient.refetchQueries({
        queryKey: adminInfoQueryKey(contractAddress),
        type: 'active',
      });
      options?.onSuccess?.(result);
    },
    onError: (error: Error) => {
      setStatus('error');
      options?.onError?.(error);
    },
  });

  // Compute error classification
  const errorClassification = useMemo(() => {
    const error = mutation.error;
    return {
      isNetworkError: isNetworkDisconnectionError(error),
      isUserRejection: isUserRejectionError(error),
    };
  }, [mutation.error]);

  // Reset function
  const reset = useCallback(() => {
    mutation.reset();
    setStatus('idle');
    setStatusDetails(null);
  }, [mutation]);

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as Error | null,
    status,
    statusDetails,
    isReady,
    isNetworkError: errorClassification.isNetworkError,
    isUserRejection: errorClassification.isUserRejection,
    reset,
  };
}

// ============================================================================
// useAcceptAdminTransfer Hook (Feature: 016-two-step-admin-assignment)
// ============================================================================

/**
 * Hook for accepting a pending admin transfer (two-step admin).
 *
 * Provides mutation functionality with:
 * - Transaction status tracking
 * - Network disconnection detection (FR-010)
 * - User rejection detection (FR-011)
 * - Automatic query invalidation on success (FR-014)
 *
 * @param adapter - The contract adapter instance, or null if not loaded
 * @param contractAddress - The contract address to operate on
 * @param options - Optional callbacks for status changes and completion
 * @returns Mutation controls and state
 *
 * @example
 * ```tsx
 * const { mutate, isPending, error } = useAcceptAdminTransfer(adapter, contractAddress);
 *
 * const handleAccept = () => {
 *   mutate({ executionConfig: { method: 'eoa' } });
 * };
 * ```
 */
export function useAcceptAdminTransfer(
  adapter: ContractAdapter | null,
  contractAddress: string,
  options?: MutationHookOptions
): UseAccessControlMutationReturn<AcceptAdminTransferArgs> {
  const { service, isReady } = useAccessControlService(adapter);
  const queryClient = useQueryClient();

  // Track transaction status internally
  const [status, setStatus] = useState<TxStatus>('idle');
  const [statusDetails, setStatusDetails] = useState<TransactionStatusUpdate | null>(null);

  // Status change handler that updates internal state and calls external callback
  const handleStatusChange = useCallback(
    (newStatus: TxStatus, details: TransactionStatusUpdate) => {
      setStatus(newStatus);
      setStatusDetails(details);
      options?.onStatusChange?.(newStatus, details);
    },
    [options]
  );

  const mutation = useMutation({
    mutationFn: async (args: AcceptAdminTransferArgs): Promise<OperationResult> => {
      if (!service) {
        throw new Error('Access control service not available');
      }

      if (!service.acceptAdminTransfer) {
        throw new Error('Accept admin transfer is not supported by this adapter');
      }

      // Reset status at start
      setStatus('idle');
      setStatusDetails(null);

      return service.acceptAdminTransfer(
        contractAddress,
        args.executionConfig,
        handleStatusChange,
        args.runtimeApiKey
      );
    },
    onSuccess: async (result) => {
      // Invalidate AND refetch admin info query to ensure UI updates (FR-014)
      // First invalidate to mark stale, then refetch to get fresh data
      await queryClient.invalidateQueries({
        queryKey: adminInfoQueryKey(contractAddress),
      });
      await queryClient.refetchQueries({
        queryKey: adminInfoQueryKey(contractAddress),
        type: 'active',
      });
      options?.onSuccess?.(result);
    },
    onError: (error: Error) => {
      setStatus('error');
      options?.onError?.(error);
    },
  });

  // Compute error classification
  const errorClassification = useMemo(() => {
    const error = mutation.error;
    return {
      isNetworkError: isNetworkDisconnectionError(error),
      isUserRejection: isUserRejectionError(error),
    };
  }, [mutation.error]);

  // Reset function
  const reset = useCallback(() => {
    mutation.reset();
    setStatus('idle');
    setStatusDetails(null);
  }, [mutation]);

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error as Error | null,
    status,
    statusDetails,
    isReady,
    isNetworkError: errorClassification.isNetworkError,
    isUserRejection: errorClassification.isUserRejection,
    reset,
  };
}

// ============================================================================
// Access Snapshot Types
// ============================================================================

/**
 * Role entry in the snapshot format.
 * Matches access-snapshot.schema.json format.
 */
export interface SnapshotRole {
  /** Role identifier (bytes32 hash or similar) */
  roleId: string;
  /** Human-readable role name */
  roleName: string;
  /** List of addresses with this role */
  members: string[];
}

/**
 * Complete snapshot of a contract's access control state.
 * This structure is serialized to JSON for export.
 * Matches access-snapshot.schema.json format.
 */
export interface AccessSnapshot {
  /** Schema version for forward compatibility */
  version: '1.0';
  /** ISO 8601 timestamp of when the snapshot was exported */
  exportedAt: string;
  /** Contract identification information */
  contract: {
    /** Full contract address */
    address: string;
    /** User-defined contract label/name */
    label: string | null;
    /** Network identifier (e.g., 'stellar-mainnet') */
    networkId: string;
    /** Human-readable network name */
    networkName: string;
  };
  /** Detected access control capabilities */
  capabilities: {
    /** Whether contract implements AccessControl interface */
    hasAccessControl: boolean;
    /** Whether contract implements Ownable interface */
    hasOwnable: boolean;
    /** Whether contract supports enumerable roles */
    hasEnumerableRoles?: boolean;
  };
  /** List of roles and their members */
  roles: SnapshotRole[];
  /** Contract ownership information */
  ownership: {
    /** Current owner address, or null if no owner */
    owner: string | null;
    /** Pending owner address for two-step transfers */
    pendingOwner?: string | null;
  };
}

/**
 * Return type for useExportSnapshot hook
 */
export interface UseExportSnapshotReturn {
  /** Export snapshot and trigger download */
  exportSnapshot: () => Promise<void>;
  /** Whether the export is in progress */
  isExporting: boolean;
  /** Error from the export, if any */
  error: Error | null;
  /** Whether the service is ready */
  isReady: boolean;
  /** Reset the error state */
  reset: () => void;
}

/**
 * Options for the useExportSnapshot hook
 */
export interface ExportSnapshotOptions {
  /** Network identifier for metadata */
  networkId: string;
  /** Human-readable network name */
  networkName: string;
  /** User-defined contract label/name (optional) */
  label?: string | null;
  /** Custom filename (without extension). Defaults to "access-snapshot-{address}-{timestamp}" */
  filename?: string;
  /** Callback when export succeeds */
  onSuccess?: (snapshot: AccessSnapshot) => void;
  /** Callback when export fails */
  onError?: (error: Error) => void;
}

// ============================================================================
// useExportSnapshot Hook
// ============================================================================

/**
 * Snapshot format version for compatibility tracking.
 * Matches access-snapshot.schema.json version.
 */
const SNAPSHOT_VERSION = '1.0' as const;

/**
 * Generate a filename for the snapshot export
 */
function generateFilename(contractAddress: string, customFilename?: string): string {
  if (customFilename) {
    return `${customFilename}.json`;
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const shortAddress = `${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}`;
  return `access-snapshot-${shortAddress}-${timestamp}.json`;
}

/**
 * Trigger a file download in the browser
 */
function downloadJson(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Hook for exporting a snapshot of the contract's access control state.
 *
 * Aggregates capabilities, ownership, and role data from the AccessControlService
 * and exports it as a downloadable JSON file.
 *
 * @param adapter - The contract adapter instance, or null if not loaded
 * @param contractAddress - The contract address to export state for
 * @param options - Export options including networkId and optional callbacks
 * @returns Export controls and state
 *
 * @example
 * ```tsx
 * const { exportSnapshot, isExporting, error } = useExportSnapshot(
 *   adapter,
 *   contractAddress,
 *   {
 *     networkId: 'stellar:testnet',
 *     onSuccess: () => toast.success('Snapshot exported!'),
 *   }
 * );
 *
 * return (
 *   <Button onClick={exportSnapshot} disabled={isExporting}>
 *     {isExporting ? 'Exporting...' : 'Export Snapshot'}
 *   </Button>
 * );
 * ```
 */
export function useExportSnapshot(
  adapter: ContractAdapter | null,
  contractAddress: string,
  options: ExportSnapshotOptions
): UseExportSnapshotReturn {
  const { service, isReady } = useAccessControlService(adapter);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const exportSnapshot = useCallback(async (): Promise<void> => {
    if (!service) {
      const err = new Error('Access control service not available');
      setError(err);
      options.onError?.(err);
      return;
    }

    if (!contractAddress) {
      const err = new Error('Contract address is required');
      setError(err);
      options.onError?.(err);
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      // Fetch all data in parallel for better performance
      const [capabilities, ownership, roles] = await Promise.all([
        service.getCapabilities(contractAddress),
        service.getOwnership(contractAddress),
        service.getCurrentRoles(contractAddress),
      ]);

      // Transform roles to schema format (roleId/roleName instead of role.id/role.label)
      // Fallback to role.id if label is not available
      const snapshotRoles: SnapshotRole[] = roles.map((role: RoleAssignment) => ({
        roleId: role.role.id,
        roleName: role.role.label ?? role.role.id,
        members: role.members,
      }));

      // Construct the snapshot object matching access-snapshot.schema.json
      const snapshot: AccessSnapshot = {
        version: SNAPSHOT_VERSION,
        exportedAt: new Date().toISOString(),
        contract: {
          address: contractAddress,
          label: options.label ?? null,
          networkId: options.networkId,
          networkName: options.networkName,
        },
        capabilities: {
          hasAccessControl: capabilities.hasAccessControl,
          hasOwnable: capabilities.hasOwnable,
          hasEnumerableRoles: capabilities.hasEnumerableRoles,
        },
        roles: snapshotRoles,
        ownership: {
          owner: ownership?.owner ?? null,
          // Note: pendingOwner is not currently provided by the adapter's OwnershipInfo
          // It will be undefined in the snapshot until adapter support is added
        },
      };

      // Generate filename and trigger download
      const filename = generateFilename(contractAddress, options.filename);
      downloadJson(snapshot, filename);

      options.onSuccess?.(snapshot);
    } catch (err) {
      const exportError = err instanceof Error ? err : new Error(String(err));
      setError(exportError);
      options.onError?.(exportError);
    } finally {
      setIsExporting(false);
    }
  }, [service, contractAddress, options]);

  const reset = useCallback(() => {
    setError(null);
    setIsExporting(false);
  }, []);

  return {
    exportSnapshot,
    isExporting,
    error,
    isReady,
    reset,
  };
}
