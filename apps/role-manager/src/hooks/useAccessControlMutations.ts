/**
 * useAccessControlMutations hooks
 * Feature: 006-access-control-service
 *
 * Provides mutation hooks for access control operations:
 * - useGrantRole / useRevokeRole / useRenounceRole
 * - useTransferOwnership / useAcceptOwnership / useRenounceOwnership
 * - useTransferAdminRole / useAcceptAdminTransfer / useCancelAdminTransfer
 * - useChangeAdminDelay / useRollbackAdminDelay
 * - useExportSnapshot
 *
 * All hooks implement:
 * - Network disconnection handling (FR-010)
 * - User rejection handling (FR-011)
 * - Centralized query invalidation via invalidationMap (FR-014)
 *
 * Architecture:
 * - A generic `useAccessControlMutation<TArgs>` factory encapsulates all
 *   shared logic (status tracking, error classification, invalidation).
 * - Each exported hook is a thin wrapper that supplies its mutation type,
 *   service method, and optional capability guard.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import type {
  AccessControlService,
  ContractAdapter,
  ExecutionConfig,
  OperationResult,
  RoleAssignment,
  TransactionStatusUpdate,
  TxStatus,
} from '@openzeppelin/ui-types';

import { invalidationMap, type MutationType } from './invalidationMap';
import { queryKeys } from './queryKeys';
import { useAccessControlService } from './useAccessControlService';
import { recordMutationTimestamp, type MutationPreviewData } from './useContractData';

// ============================================================================
// Error Detection Utilities
// ============================================================================

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

/** Detect if an error is a network disconnection error */
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

/** Detect if an error is a user rejection error */
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

/** Common arguments for role mutation operations (grant/revoke) */
export interface RoleMutationArgs {
  roleId: string;
  account: string;
  executionConfig: ExecutionConfig;
  runtimeApiKey?: string;
}

export type GrantRoleArgs = RoleMutationArgs;
export type RevokeRoleArgs = RoleMutationArgs;

export interface TransferOwnershipArgs {
  newOwner: string;
  expirationBlock: number;
  executionConfig: ExecutionConfig;
  runtimeApiKey?: string;
}

export interface AcceptOwnershipArgs {
  executionConfig: ExecutionConfig;
  runtimeApiKey?: string;
}

export interface TransferAdminRoleArgs {
  newAdmin: string;
  expirationBlock: number;
  executionConfig: ExecutionConfig;
  runtimeApiKey?: string;
}

export interface AcceptAdminTransferArgs {
  executionConfig: ExecutionConfig;
  runtimeApiKey?: string;
}

export interface RenounceOwnershipArgs {
  executionConfig: ExecutionConfig;
  runtimeApiKey?: string;
}

export interface RenounceRoleArgs {
  roleId: string;
  account: string;
  executionConfig: ExecutionConfig;
  runtimeApiKey?: string;
}

export interface CancelAdminTransferArgs {
  executionConfig: ExecutionConfig;
  runtimeApiKey?: string;
}

export interface ChangeAdminDelayArgs {
  newDelay: number;
  executionConfig: ExecutionConfig;
  runtimeApiKey?: string;
}

export interface RollbackAdminDelayArgs {
  executionConfig: ExecutionConfig;
  runtimeApiKey?: string;
}

export interface MutationHookOptions {
  onStatusChange?: (status: TxStatus, details: TransactionStatusUpdate) => void;
  onSuccess?: (result: OperationResult) => void;
  onError?: (error: Error) => void;
}

export interface UseAccessControlMutationReturn<TArgs> {
  mutate: (args: TArgs) => void;
  mutateAsync: (args: TArgs) => Promise<OperationResult>;
  isPending: boolean;
  error: Error | null;
  status: TxStatus;
  statusDetails: TransactionStatusUpdate | null;
  isReady: boolean;
  isNetworkError: boolean;
  isUserRejection: boolean;
  reset: () => void;
  /**
   * Execute post-mutation query invalidation explicitly.
   *
   * TanStack Query v5 fires `useMutation.onSuccess` as fire-and-forget
   * (async callbacks are not awaited), so callers must invoke this method
   * themselves after `mutateAsync` resolves to guarantee cache freshness
   * before proceeding (e.g. closing a dialog).
   */
  invalidate: () => Promise<void>;
}

// ============================================================================
// Generic Mutation Factory
// ============================================================================

/**
 * Service method executor — receives the AccessControlService and args,
 * returns the OperationResult promise. Each thin wrapper defines this.
 */
type ServiceExecutor<TArgs> = (
  service: AccessControlService,
  args: TArgs,
  statusCallback: (status: TxStatus, details: TransactionStatusUpdate) => void
) => Promise<OperationResult>;

/**
 * Optional guard that checks whether the service supports the operation.
 * Returns an error message string if the capability is missing, or null if OK.
 */
type CapabilityGuard = (service: AccessControlService) => string | null;

interface FactoryConfig<TArgs> {
  mutationType: MutationType;
  execute: ServiceExecutor<TArgs>;
  guard?: CapabilityGuard;
}

/**
 * Generic mutation factory hook.
 *
 * Encapsulates all shared behaviour:
 * - Transaction status tracking (`useState<TxStatus>`)
 * - Status change callbacks
 * - Error classification (network / user rejection)
 * - Post-mutation query invalidation via invalidation map
 * - Smart enriched-vs-basic observer optimization for role queries
 * - Deferred refetch scheduling (when configured by the map)
 * - Reset function
 */
function useAccessControlMutationFactory<TArgs>(
  adapter: ContractAdapter | null,
  contractAddress: string,
  config: FactoryConfig<TArgs>,
  options?: MutationHookOptions
): UseAccessControlMutationReturn<TArgs> {
  const { service, isReady } = useAccessControlService(adapter);
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<TxStatus>('idle');
  const [statusDetails, setStatusDetails] = useState<TransactionStatusUpdate | null>(null);

  const handleStatusChange = useCallback(
    (newStatus: TxStatus, details: TransactionStatusUpdate) => {
      setStatus(newStatus);
      setStatusDetails(details);
      options?.onStatusChange?.(newStatus, details);
    },
    [options?.onStatusChange]
  );

  /**
   * Smart invalidation for role queries.
   *
   * When the enriched roles query has active observers (e.g. the Authorized
   * Accounts page is mounted), cancel any in-flight basic query to prevent
   * a redundant RPC call — the enriched query will populate the basic cache
   * via `setQueryData` when it resolves.
   */
  const smartInvalidateRoles = useCallback(
    (keys: readonly (readonly string[])[]) => {
      const rolesKey = queryKeys.contractRoles(contractAddress);
      const enrichedKey = queryKeys.contractRolesEnriched(contractAddress);

      const touchesRoles = keys.some((k) => k[0] === rolesKey[0] && k[1] === rolesKey[1]);
      const touchesEnriched = keys.some((k) => k[0] === enrichedKey[0] && k[1] === enrichedKey[1]);

      if (!touchesRoles || !touchesEnriched) return;

      const enrichedQuery = queryClient
        .getQueryCache()
        .find({ queryKey: enrichedKey, exact: true });

      const hasEnrichedObservers = (enrichedQuery?.getObserversCount() ?? 0) > 0;

      if (hasEnrichedObservers) {
        queryClient.cancelQueries({ queryKey: rolesKey });
      }
    },
    [queryClient, contractAddress]
  );

  /**
   * Execute all invalidations from the invalidation map config.
   *
   * Resilience strategy:
   * 1. Schedule deferred refetches FIRST (before error-prone operations)
   *    so they fire even if the immediate invalidation fails.
   * 2. Wrap each invalidation in its own try/catch so one failure doesn't
   *    block the rest.
   * 3. Use refetchType: 'all' on invalidateQueries so it refetches all
   *    matching queries regardless of observer status.
   */
  const executeInvalidation = useCallback(
    async (preview?: MutationPreviewData) => {
      const mapConfig = invalidationMap[config.mutationType];
      const allKeys = mapConfig.keys(contractAddress);

      // 1. Record mutation timestamp with preview context so UI can render
      //    inline ghost/shimmer placeholders while waiting for the RPC.
      recordMutationTimestamp(contractAddress, preview);

      // 2. Schedule deferred retries FIRST — guarantees retries even if
      //    the immediate refetch returns stale data or throws.
      //    Multiple attempts at increasing intervals cover varying RPC lag.
      if (mapConfig.deferredRefetchMs) {
        const base = mapConfig.deferredRefetchMs;
        for (const delay of [base, base * 3, base * 5]) {
          setTimeout(() => {
            for (const key of allKeys) {
              queryClient.invalidateQueries({ queryKey: key, refetchType: 'all' }).catch(() => {});
            }
          }, delay);
        }
      }

      // 3. Apply smart role invalidation optimization
      smartInvalidateRoles(allKeys);

      // 4. Invalidate + refetch all keys. invalidateQueries internally
      //    calls refetchQueries, so we don't need a separate refetch step.
      //    Each key is wrapped individually so one failure doesn't block the rest.
      for (const key of allKeys) {
        try {
          await queryClient.invalidateQueries({ queryKey: key, refetchType: 'all' });
        } catch {
          // Individual key failure — stale marking may still have taken effect
        }
      }
    },
    [queryClient, contractAddress, config.mutationType, smartInvalidateRoles]
  );

  const mutation = useMutation({
    mutationFn: async (args: TArgs): Promise<OperationResult> => {
      if (!service) {
        throw new Error('Access control service not available');
      }

      // Check optional capability guard
      if (config.guard) {
        const guardError = config.guard(service);
        if (guardError) throw new Error(guardError);
      }

      setStatus('idle');
      setStatusDetails(null);

      const result = await config.execute(service, args, handleStatusChange);

      // Run invalidation inside mutationFn so it completes before
      // mutateAsync resolves — this is the most reliable path.
      // Pass mutation type + args so the poll state carries preview context.
      try {
        await executeInvalidation({
          type: config.mutationType,
          args: args as unknown as Record<string, unknown>,
        });
      } catch {
        // Cache invalidation failure must not fail the mutation
      }

      return result;
    },
    onSuccess: async (result) => {
      // NOTE: TanStack Query v5 fires onSuccess as fire-and-forget —
      // async callbacks are NOT awaited by mutateAsync. We still run
      // invalidation here so direct mutateAsync callers benefit from
      // eventual cache refresh. The explicit `invalidate()` method
      // (called by useTransactionExecution) handles the awaited path.
      await executeInvalidation();
      try {
        options?.onSuccess?.(result);
      } catch {
        // External callback errors should not surface to the mutation layer
      }
    },
    onError: (error: Error) => {
      setStatus('error');
      options?.onError?.(error);
    },
  });

  const errorClassification = useMemo(() => {
    const error = mutation.error;
    return {
      isNetworkError: isNetworkDisconnectionError(error),
      isUserRejection: isUserRejectionError(error),
    };
  }, [mutation.error]);

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
    invalidate: executeInvalidation,
  };
}

// ============================================================================
// Thin Wrapper Hooks
// ============================================================================

export function useGrantRole(
  adapter: ContractAdapter | null,
  contractAddress: string,
  options?: MutationHookOptions
): UseAccessControlMutationReturn<GrantRoleArgs> {
  return useAccessControlMutationFactory<GrantRoleArgs>(
    adapter,
    contractAddress,
    {
      mutationType: 'grantRole',
      execute: (service, args, statusCallback) =>
        service.grantRole(
          contractAddress,
          args.roleId,
          args.account,
          args.executionConfig,
          statusCallback,
          args.runtimeApiKey
        ),
    },
    options
  );
}

export function useRevokeRole(
  adapter: ContractAdapter | null,
  contractAddress: string,
  options?: MutationHookOptions
): UseAccessControlMutationReturn<RevokeRoleArgs> {
  return useAccessControlMutationFactory<RevokeRoleArgs>(
    adapter,
    contractAddress,
    {
      mutationType: 'revokeRole',
      execute: (service, args, statusCallback) =>
        service.revokeRole(
          contractAddress,
          args.roleId,
          args.account,
          args.executionConfig,
          statusCallback,
          args.runtimeApiKey
        ),
    },
    options
  );
}

export function useRenounceRole(
  adapter: ContractAdapter | null,
  contractAddress: string,
  options?: MutationHookOptions
): UseAccessControlMutationReturn<RenounceRoleArgs> {
  return useAccessControlMutationFactory<RenounceRoleArgs>(
    adapter,
    contractAddress,
    {
      mutationType: 'renounceRole',
      execute: (service, args, statusCallback) =>
        service.renounceRole!(
          contractAddress,
          args.roleId,
          args.account,
          args.executionConfig,
          statusCallback,
          args.runtimeApiKey
        ),
      guard: (service) =>
        !service.renounceRole ? 'Renounce role is not supported by this adapter' : null,
    },
    options
  );
}

export function useTransferOwnership(
  adapter: ContractAdapter | null,
  contractAddress: string,
  options?: MutationHookOptions
): UseAccessControlMutationReturn<TransferOwnershipArgs> {
  return useAccessControlMutationFactory<TransferOwnershipArgs>(
    adapter,
    contractAddress,
    {
      mutationType: 'transferOwnership',
      execute: (service, args, statusCallback) =>
        service.transferOwnership(
          contractAddress,
          args.newOwner,
          args.expirationBlock,
          args.executionConfig,
          statusCallback,
          args.runtimeApiKey
        ),
    },
    options
  );
}

export function useAcceptOwnership(
  adapter: ContractAdapter | null,
  contractAddress: string,
  options?: MutationHookOptions
): UseAccessControlMutationReturn<AcceptOwnershipArgs> {
  return useAccessControlMutationFactory<AcceptOwnershipArgs>(
    adapter,
    contractAddress,
    {
      mutationType: 'acceptOwnership',
      execute: (service, args, statusCallback) =>
        service.acceptOwnership!(
          contractAddress,
          args.executionConfig,
          statusCallback,
          args.runtimeApiKey
        ),
      guard: (service) =>
        !service.acceptOwnership ? 'Accept ownership is not supported by this adapter' : null,
    },
    options
  );
}

export function useRenounceOwnership(
  adapter: ContractAdapter | null,
  contractAddress: string,
  options?: MutationHookOptions
): UseAccessControlMutationReturn<RenounceOwnershipArgs> {
  return useAccessControlMutationFactory<RenounceOwnershipArgs>(
    adapter,
    contractAddress,
    {
      mutationType: 'renounceOwnership',
      execute: (service, args, statusCallback) =>
        service.renounceOwnership!(
          contractAddress,
          args.executionConfig,
          statusCallback,
          args.runtimeApiKey
        ),
      guard: (service) =>
        !service.renounceOwnership ? 'Renounce ownership is not supported by this adapter' : null,
    },
    options
  );
}

export function useTransferAdminRole(
  adapter: ContractAdapter | null,
  contractAddress: string,
  options?: MutationHookOptions
): UseAccessControlMutationReturn<TransferAdminRoleArgs> {
  return useAccessControlMutationFactory<TransferAdminRoleArgs>(
    adapter,
    contractAddress,
    {
      mutationType: 'transferAdmin',
      execute: (service, args, statusCallback) =>
        service.transferAdminRole!(
          contractAddress,
          args.newAdmin,
          args.expirationBlock,
          args.executionConfig,
          statusCallback,
          args.runtimeApiKey
        ),
      guard: (service) =>
        !service.transferAdminRole ? 'Transfer admin role is not supported by this adapter' : null,
    },
    options
  );
}

export function useAcceptAdminTransfer(
  adapter: ContractAdapter | null,
  contractAddress: string,
  options?: MutationHookOptions
): UseAccessControlMutationReturn<AcceptAdminTransferArgs> {
  return useAccessControlMutationFactory<AcceptAdminTransferArgs>(
    adapter,
    contractAddress,
    {
      mutationType: 'acceptAdmin',
      execute: (service, args, statusCallback) =>
        service.acceptAdminTransfer!(
          contractAddress,
          args.executionConfig,
          statusCallback,
          args.runtimeApiKey
        ),
      guard: (service) =>
        !service.acceptAdminTransfer
          ? 'Accept admin transfer is not supported by this adapter'
          : null,
    },
    options
  );
}

export function useCancelAdminTransfer(
  adapter: ContractAdapter | null,
  contractAddress: string,
  options?: MutationHookOptions
): UseAccessControlMutationReturn<CancelAdminTransferArgs> {
  return useAccessControlMutationFactory<CancelAdminTransferArgs>(
    adapter,
    contractAddress,
    {
      mutationType: 'cancelAdmin',
      execute: (service, args, statusCallback) =>
        service.cancelAdminTransfer!(
          contractAddress,
          args.executionConfig,
          statusCallback,
          args.runtimeApiKey
        ),
      guard: (service) =>
        !service.cancelAdminTransfer
          ? 'Cancel admin transfer is not supported by this adapter'
          : null,
    },
    options
  );
}

export function useChangeAdminDelay(
  adapter: ContractAdapter | null,
  contractAddress: string,
  options?: MutationHookOptions
): UseAccessControlMutationReturn<ChangeAdminDelayArgs> {
  return useAccessControlMutationFactory<ChangeAdminDelayArgs>(
    adapter,
    contractAddress,
    {
      mutationType: 'changeAdminDelay',
      execute: (service, args, statusCallback) =>
        service.changeAdminDelay!(
          contractAddress,
          args.newDelay,
          args.executionConfig,
          statusCallback,
          args.runtimeApiKey
        ),
      guard: (service) =>
        !service.changeAdminDelay ? 'Change admin delay is not supported by this adapter' : null,
    },
    options
  );
}

export function useRollbackAdminDelay(
  adapter: ContractAdapter | null,
  contractAddress: string,
  options?: MutationHookOptions
): UseAccessControlMutationReturn<RollbackAdminDelayArgs> {
  return useAccessControlMutationFactory<RollbackAdminDelayArgs>(
    adapter,
    contractAddress,
    {
      mutationType: 'rollbackAdminDelay',
      execute: (service, args, statusCallback) =>
        service.rollbackAdminDelay!(
          contractAddress,
          args.executionConfig,
          statusCallback,
          args.runtimeApiKey
        ),
      guard: (service) =>
        !service.rollbackAdminDelay
          ? 'Rollback admin delay is not supported by this adapter'
          : null,
    },
    options
  );
}

// ============================================================================
// Access Snapshot Types & Hook (unchanged — not a mutation that needs invalidation)
// ============================================================================

export interface SnapshotRole {
  roleId: string;
  roleName: string;
  members: string[];
}

export interface AccessSnapshot {
  version: '1.0';
  exportedAt: string;
  contract: {
    address: string;
    label: string | null;
    networkId: string;
    networkName: string;
  };
  capabilities: {
    hasAccessControl: boolean;
    hasOwnable: boolean;
    hasEnumerableRoles?: boolean;
  };
  roles: SnapshotRole[];
  ownership: {
    owner: string | null;
    pendingOwner?: string | null;
  };
}

export interface UseExportSnapshotReturn {
  exportSnapshot: () => Promise<void>;
  isExporting: boolean;
  error: Error | null;
  isReady: boolean;
  reset: () => void;
}

export interface ExportSnapshotOptions {
  networkId: string;
  networkName: string;
  label?: string | null;
  filename?: string;
  onSuccess?: (snapshot: AccessSnapshot) => void;
  onError?: (error: Error) => void;
}

const SNAPSHOT_VERSION = '1.0' as const;

function generateFilename(contractAddress: string, customFilename?: string): string {
  if (customFilename) {
    return `${customFilename}.json`;
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const shortAddress = `${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}`;
  return `access-snapshot-${shortAddress}-${timestamp}.json`;
}

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

  URL.revokeObjectURL(url);
}

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
      const [capabilities, ownership, roles] = await Promise.all([
        service.getCapabilities(contractAddress),
        service.getOwnership(contractAddress),
        service.getCurrentRoles(contractAddress),
      ]);

      const snapshotRoles: SnapshotRole[] = roles.map((role: RoleAssignment) => ({
        roleId: role.role.id,
        roleName: role.role.label ?? role.role.id,
        members: role.members,
      }));

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
        },
      };

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
