/**
 * useAccessControlMutations hooks
 * Feature: 006-access-control-service
 *
 * Provides mutation hooks for access control operations:
 * - useGrantRole: Grant a role to an account
 * - useRevokeRole: Revoke a role from an account
 * - useTransferOwnership: Transfer contract ownership
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
  TransactionStatusUpdate,
  TxStatus,
} from '@openzeppelin/ui-builder-types';

import { useAccessControlService } from './useAccessControlService';

// ============================================================================
// Query Keys (must match useContractData.ts)
// ============================================================================

const rolesQueryKey = (address: string) => ['contractRoles', address] as const;
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
 * Arguments for useGrantRole mutation
 */
export interface GrantRoleArgs {
  /** The role identifier to grant */
  roleId: string;
  /** The account address to grant the role to */
  account: string;
  /** Execution configuration (EOA, relayer, etc.) */
  executionConfig: ExecutionConfig;
  /** Optional runtime API key for relayer */
  runtimeApiKey?: string;
}

/**
 * Arguments for useRevokeRole mutation
 */
export interface RevokeRoleArgs {
  /** The role identifier to revoke */
  roleId: string;
  /** The account address to revoke the role from */
  account: string;
  /** Execution configuration (EOA, relayer, etc.) */
  executionConfig: ExecutionConfig;
  /** Optional runtime API key for relayer */
  runtimeApiKey?: string;
}

/**
 * Arguments for useTransferOwnership mutation
 */
export interface TransferOwnershipArgs {
  /** The new owner address */
  newOwner: string;
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
    mutationFn: async (args: GrantRoleArgs): Promise<OperationResult> => {
      if (!service) {
        throw new Error('Access control service not available');
      }

      // Reset status at start
      setStatus('idle');
      setStatusDetails(null);

      return service.grantRole(
        contractAddress,
        args.roleId,
        args.account,
        args.executionConfig,
        handleStatusChange,
        args.runtimeApiKey
      );
    },
    onSuccess: (result) => {
      // Invalidate roles query to refetch updated data (FR-014)
      queryClient.invalidateQueries({
        queryKey: rolesQueryKey(contractAddress),
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
    mutationFn: async (args: RevokeRoleArgs): Promise<OperationResult> => {
      if (!service) {
        throw new Error('Access control service not available');
      }

      // Reset status at start
      setStatus('idle');
      setStatusDetails(null);

      return service.revokeRole(
        contractAddress,
        args.roleId,
        args.account,
        args.executionConfig,
        handleStatusChange,
        args.runtimeApiKey
      );
    },
    onSuccess: (result) => {
      // Invalidate roles query to refetch updated data (FR-014)
      queryClient.invalidateQueries({
        queryKey: rolesQueryKey(contractAddress),
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
