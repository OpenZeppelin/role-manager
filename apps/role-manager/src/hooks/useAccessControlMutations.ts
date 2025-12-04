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
  AccessControlCapabilities,
  ContractAdapter,
  ExecutionConfig,
  OperationResult,
  OwnershipInfo,
  RoleAssignment,
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

// ============================================================================
// Access Snapshot Types
// ============================================================================

/**
 * Complete snapshot of a contract's access control state.
 * This structure is serialized to JSON for export.
 */
export interface AccessSnapshot {
  /** Contract address */
  contractAddress: string;
  /** Network identifier */
  networkId: string;
  /** Timestamp when snapshot was taken (ISO 8601 format) */
  timestamp: string;
  /** Detected capabilities of the contract */
  capabilities: AccessControlCapabilities;
  /** Ownership information (null if contract doesn't support Ownable) */
  ownership: OwnershipInfo | null;
  /** Role assignments (empty array if contract doesn't support AccessControl) */
  roles: RoleAssignment[];
  /** Export metadata */
  metadata: {
    /** Version of the snapshot format */
    version: string;
    /** Application that generated the snapshot */
    generatedBy: string;
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
 * Snapshot format version for compatibility tracking
 */
const SNAPSHOT_VERSION = '1.0.0';

/**
 * Application identifier for snapshot metadata
 */
const GENERATED_BY = 'OpenZeppelin Role Manager';

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

      // Construct the snapshot object
      const snapshot: AccessSnapshot = {
        contractAddress,
        networkId: options.networkId,
        timestamp: new Date().toISOString(),
        capabilities,
        ownership,
        roles,
        metadata: {
          version: SNAPSHOT_VERSION,
          generatedBy: GENERATED_BY,
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
