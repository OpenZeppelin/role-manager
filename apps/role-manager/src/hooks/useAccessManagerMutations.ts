/**
 * useAccessManagerMutations hooks
 * Feature: 018-access-manager
 *
 * Mutation hooks for AccessManager operations, following the same factory
 * pattern as useAccessControlMutations.ts but using AccessManagerService.
 *
 * Covers:
 * - Role management: grant, revoke, renounce, label, setAdmin, setGuardian, setGrantDelay
 * - Target management: setTargetFunctionRole, setTargetClosed, setTargetAdminDelay, updateAuthority
 * - Operation lifecycle: schedule, execute, cancel
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  ExecutionConfig,
  OperationResult,
  TransactionStatusUpdate,
  TxStatus,
} from '@openzeppelin/ui-types';

import type { AccessManagerService, AccessManagerStatusCallback } from '../types/access-manager';
import { accessManagerInvalidationMap, type AccessManagerMutationType } from './invalidationMap';
import { useAccessManagerService } from './useAccessManagerService';

// ============================================================================
// Error Detection (reused from useAccessControlMutations)
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

function isNetworkDisconnectionError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const name = error instanceof Error ? error.name.toLowerCase() : '';
  return (
    NETWORK_ERROR_PATTERNS.some((p) => msg.includes(p.toLowerCase()) || name.includes(p)) ||
    name === 'networkdisconnectederror'
  );
}

function isUserRejectionError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const name = error instanceof Error ? error.name.toLowerCase() : '';
  return (
    USER_REJECTION_PATTERNS.some((p) => msg.includes(p.toLowerCase()) || name.includes(p)) ||
    name === 'userrejectederror'
  );
}

// ============================================================================
// Types
// ============================================================================

export interface AccessManagerMutationHookOptions {
  onStatusChange?: (status: TxStatus, details: TransactionStatusUpdate) => void;
  onSuccess?: (result: OperationResult) => void;
  onError?: (error: Error) => void;
}

export interface UseAccessManagerMutationReturn<TArgs> {
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
  invalidate: () => Promise<void>;
}

// ── Mutation Arg Types ──

export interface AMGrantRoleArgs {
  roleId: string;
  account: string;
  executionDelay: number;
  executionConfig: ExecutionConfig;
}

export interface AMRevokeRoleArgs {
  roleId: string;
  account: string;
  executionConfig: ExecutionConfig;
}

export interface AMRenounceRoleArgs {
  roleId: string;
  callerConfirmation: string;
  executionConfig: ExecutionConfig;
}

export interface AMLabelRoleArgs {
  roleId: string;
  label: string;
  executionConfig: ExecutionConfig;
}

export interface AMSetRoleAdminArgs {
  roleId: string;
  adminId: string;
  executionConfig: ExecutionConfig;
}

export interface AMSetRoleGuardianArgs {
  roleId: string;
  guardianId: string;
  executionConfig: ExecutionConfig;
}

export interface AMSetGrantDelayArgs {
  roleId: string;
  delay: number;
  executionConfig: ExecutionConfig;
}

export interface AMSetTargetFunctionRoleArgs {
  target: string;
  selectors: string[];
  roleId: string;
  executionConfig: ExecutionConfig;
}

export interface AMSetTargetClosedArgs {
  target: string;
  closed: boolean;
  executionConfig: ExecutionConfig;
}

export interface AMSetTargetAdminDelayArgs {
  target: string;
  delay: number;
  executionConfig: ExecutionConfig;
}

export interface AMUpdateAuthorityArgs {
  target: string;
  newAuthority: string;
  executionConfig: ExecutionConfig;
}

export interface AMScheduleArgs {
  target: string;
  data: string;
  when: number;
  executionConfig: ExecutionConfig;
}

export interface AMExecuteArgs {
  target: string;
  data: string;
  executionConfig: ExecutionConfig;
}

export interface AMCancelArgs {
  caller: string;
  target: string;
  data: string;
  executionConfig: ExecutionConfig;
}

// ============================================================================
// Generic Mutation Factory
// ============================================================================

type ServiceExecutor<TArgs> = (
  service: AccessManagerService,
  args: TArgs,
  statusCallback: AccessManagerStatusCallback
) => Promise<OperationResult>;

interface FactoryConfig<TArgs> {
  mutationType: AccessManagerMutationType;
  execute: ServiceExecutor<TArgs>;
}

function useAccessManagerMutationFactory<TArgs>(
  runtime: unknown,
  contractAddress: string,
  config: FactoryConfig<TArgs>,
  options?: AccessManagerMutationHookOptions
): UseAccessManagerMutationReturn<TArgs> {
  const { service, isReady } = useAccessManagerService(
    runtime as import('../core/runtimeAdapter').RoleManagerRuntime | null
  );
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<TxStatus>('idle');
  const [statusDetails, setStatusDetails] = useState<TransactionStatusUpdate | null>(null);
  const deferredTimerIds = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      for (const id of deferredTimerIds.current) clearTimeout(id);
      deferredTimerIds.current = [];
    };
  }, []);

  const handleStatusChange = useCallback(
    (newStatus: TxStatus, details: TransactionStatusUpdate) => {
      setStatus(newStatus);
      setStatusDetails(details);
      options?.onStatusChange?.(newStatus, details);
    },
    [options?.onStatusChange]
  );

  const executeInvalidation = useCallback(async () => {
    const mapConfig = accessManagerInvalidationMap[config.mutationType];
    const allKeys = mapConfig.keys(contractAddress);

    if (mapConfig.deferredRefetchMs) {
      const base = mapConfig.deferredRefetchMs;
      for (const delay of [base, base * 3, base * 5]) {
        const id = setTimeout(() => {
          deferredTimerIds.current = deferredTimerIds.current.filter((t) => t !== id);
          for (const key of allKeys) {
            queryClient.invalidateQueries({ queryKey: key, refetchType: 'all' }).catch(() => {});
          }
        }, delay);
        deferredTimerIds.current.push(id);
      }
    }

    for (const key of allKeys) {
      try {
        await queryClient.invalidateQueries({ queryKey: key, refetchType: 'all' });
      } catch {
        // Individual key failure is non-fatal
      }
    }
  }, [queryClient, contractAddress, config.mutationType]);

  const mutation = useMutation({
    mutationFn: async (args: TArgs): Promise<OperationResult> => {
      if (!service) throw new Error('AccessManager service not available');

      setStatus('idle');
      setStatusDetails(null);

      const result = await config.execute(service, args, handleStatusChange);

      try {
        await executeInvalidation();
      } catch {
        /* non-fatal */
      }

      return result;
    },
    onSuccess: async (result) => {
      await executeInvalidation();
      try {
        options?.onSuccess?.(result);
      } catch {
        /* non-fatal */
      }
    },
    onError: (error: Error) => {
      setStatus('error');
      options?.onError?.(error);
    },
  });

  const errorClassification = useMemo(
    () => ({
      isNetworkError: isNetworkDisconnectionError(mutation.error),
      isUserRejection: isUserRejectionError(mutation.error),
    }),
    [mutation.error]
  );

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
// Role Mutation Hooks
// ============================================================================

export function useAMGrantRole(
  runtime: unknown,
  contractAddress: string,
  options?: AccessManagerMutationHookOptions
): UseAccessManagerMutationReturn<AMGrantRoleArgs> {
  return useAccessManagerMutationFactory(
    runtime,
    contractAddress,
    {
      mutationType: 'amGrantRole',
      execute: (service, args, onStatus) =>
        service.grantRole(
          contractAddress,
          args.roleId,
          args.account,
          args.executionDelay,
          args.executionConfig,
          onStatus
        ),
    },
    options
  );
}

export function useAMRevokeRole(
  runtime: unknown,
  contractAddress: string,
  options?: AccessManagerMutationHookOptions
): UseAccessManagerMutationReturn<AMRevokeRoleArgs> {
  return useAccessManagerMutationFactory(
    runtime,
    contractAddress,
    {
      mutationType: 'amRevokeRole',
      execute: (service, args, onStatus) =>
        service.revokeRole(
          contractAddress,
          args.roleId,
          args.account,
          args.executionConfig,
          onStatus
        ),
    },
    options
  );
}

export function useAMRenounceRole(
  runtime: unknown,
  contractAddress: string,
  options?: AccessManagerMutationHookOptions
): UseAccessManagerMutationReturn<AMRenounceRoleArgs> {
  return useAccessManagerMutationFactory(
    runtime,
    contractAddress,
    {
      mutationType: 'amRenounceRole',
      execute: (service, args, onStatus) =>
        service.renounceRole(
          contractAddress,
          args.roleId,
          args.callerConfirmation,
          args.executionConfig,
          onStatus
        ),
    },
    options
  );
}

export function useAMLabelRole(
  runtime: unknown,
  contractAddress: string,
  options?: AccessManagerMutationHookOptions
): UseAccessManagerMutationReturn<AMLabelRoleArgs> {
  return useAccessManagerMutationFactory(
    runtime,
    contractAddress,
    {
      mutationType: 'amLabelRole',
      execute: (service, args, onStatus) =>
        service.labelRole(contractAddress, args.roleId, args.label, args.executionConfig, onStatus),
    },
    options
  );
}

export function useAMSetRoleAdmin(
  runtime: unknown,
  contractAddress: string,
  options?: AccessManagerMutationHookOptions
): UseAccessManagerMutationReturn<AMSetRoleAdminArgs> {
  return useAccessManagerMutationFactory(
    runtime,
    contractAddress,
    {
      mutationType: 'amSetRoleAdmin',
      execute: (service, args, onStatus) =>
        service.setRoleAdmin(
          contractAddress,
          args.roleId,
          args.adminId,
          args.executionConfig,
          onStatus
        ),
    },
    options
  );
}

export function useAMSetRoleGuardian(
  runtime: unknown,
  contractAddress: string,
  options?: AccessManagerMutationHookOptions
): UseAccessManagerMutationReturn<AMSetRoleGuardianArgs> {
  return useAccessManagerMutationFactory(
    runtime,
    contractAddress,
    {
      mutationType: 'amSetRoleGuardian',
      execute: (service, args, onStatus) =>
        service.setRoleGuardian(
          contractAddress,
          args.roleId,
          args.guardianId,
          args.executionConfig,
          onStatus
        ),
    },
    options
  );
}

export function useAMSetGrantDelay(
  runtime: unknown,
  contractAddress: string,
  options?: AccessManagerMutationHookOptions
): UseAccessManagerMutationReturn<AMSetGrantDelayArgs> {
  return useAccessManagerMutationFactory(
    runtime,
    contractAddress,
    {
      mutationType: 'amSetGrantDelay',
      execute: (service, args, onStatus) =>
        service.setGrantDelay(
          contractAddress,
          args.roleId,
          args.delay,
          args.executionConfig,
          onStatus
        ),
    },
    options
  );
}

// ============================================================================
// Target Mutation Hooks
// ============================================================================

export function useAMSetTargetFunctionRole(
  runtime: unknown,
  contractAddress: string,
  options?: AccessManagerMutationHookOptions
): UseAccessManagerMutationReturn<AMSetTargetFunctionRoleArgs> {
  return useAccessManagerMutationFactory(
    runtime,
    contractAddress,
    {
      mutationType: 'amSetTargetFunctionRole',
      execute: (service, args, onStatus) =>
        service.setTargetFunctionRole(
          contractAddress,
          args.target,
          args.selectors,
          args.roleId,
          args.executionConfig,
          onStatus
        ),
    },
    options
  );
}

export function useAMSetTargetClosed(
  runtime: unknown,
  contractAddress: string,
  options?: AccessManagerMutationHookOptions
): UseAccessManagerMutationReturn<AMSetTargetClosedArgs> {
  return useAccessManagerMutationFactory(
    runtime,
    contractAddress,
    {
      mutationType: 'amSetTargetClosed',
      execute: (service, args, onStatus) =>
        service.setTargetClosed(
          contractAddress,
          args.target,
          args.closed,
          args.executionConfig,
          onStatus
        ),
    },
    options
  );
}

export function useAMSetTargetAdminDelay(
  runtime: unknown,
  contractAddress: string,
  options?: AccessManagerMutationHookOptions
): UseAccessManagerMutationReturn<AMSetTargetAdminDelayArgs> {
  return useAccessManagerMutationFactory(
    runtime,
    contractAddress,
    {
      mutationType: 'amSetTargetAdminDelay',
      execute: (service, args, onStatus) =>
        service.setTargetAdminDelay(
          contractAddress,
          args.target,
          args.delay,
          args.executionConfig,
          onStatus
        ),
    },
    options
  );
}

export function useAMUpdateAuthority(
  runtime: unknown,
  contractAddress: string,
  options?: AccessManagerMutationHookOptions
): UseAccessManagerMutationReturn<AMUpdateAuthorityArgs> {
  return useAccessManagerMutationFactory(
    runtime,
    contractAddress,
    {
      mutationType: 'amUpdateAuthority',
      execute: (service, args, onStatus) =>
        service.updateAuthority(
          contractAddress,
          args.target,
          args.newAuthority,
          args.executionConfig,
          onStatus
        ),
    },
    options
  );
}

// ============================================================================
// Operation Lifecycle Hooks
// ============================================================================

export function useAMSchedule(
  runtime: unknown,
  contractAddress: string,
  options?: AccessManagerMutationHookOptions
): UseAccessManagerMutationReturn<AMScheduleArgs> {
  return useAccessManagerMutationFactory(
    runtime,
    contractAddress,
    {
      mutationType: 'amSchedule',
      execute: (service, args, onStatus) =>
        service.schedule(
          contractAddress,
          args.target,
          args.data,
          args.when,
          args.executionConfig,
          onStatus
        ),
    },
    options
  );
}

export function useAMExecute(
  runtime: unknown,
  contractAddress: string,
  options?: AccessManagerMutationHookOptions
): UseAccessManagerMutationReturn<AMExecuteArgs> {
  return useAccessManagerMutationFactory(
    runtime,
    contractAddress,
    {
      mutationType: 'amExecute',
      execute: (service, args, onStatus) =>
        service.execute(contractAddress, args.target, args.data, args.executionConfig, onStatus),
    },
    options
  );
}

export function useAMCancel(
  runtime: unknown,
  contractAddress: string,
  options?: AccessManagerMutationHookOptions
): UseAccessManagerMutationReturn<AMCancelArgs> {
  return useAccessManagerMutationFactory(
    runtime,
    contractAddress,
    {
      mutationType: 'amCancel',
      execute: (service, args, onStatus) =>
        service.cancel(
          contractAddress,
          args.caller,
          args.target,
          args.data,
          args.executionConfig,
          onStatus
        ),
    },
    options
  );
}
