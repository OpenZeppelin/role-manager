/**
 * Hook Interface Contracts for Ownership Transfer Feature
 *
 * Feature: 015-ownership-transfer
 * This file defines the API contracts for new hooks.
 * Implementation should match these interfaces exactly.
 */

import type {
  ContractAdapter,
  ExecutionConfig,
  OperationResult,
  TransactionStatusUpdate,
  TxStatus,
} from '@openzeppelin/ui-builder-types';

// =============================================================================
// Shared Types
// =============================================================================

/**
 * Dialog transaction step states (consistent with existing patterns)
 */
export type DialogStep = 'form' | 'pending' | 'confirming' | 'success' | 'error' | 'cancelled';

// =============================================================================
// useAcceptOwnership Hook
// =============================================================================

/**
 * Arguments for useAcceptOwnership mutation
 */
export interface AcceptOwnershipArgs {
  /** Execution configuration (EOA, relayer, etc.) */
  executionConfig: ExecutionConfig;
  /** Optional runtime API key for relayer */
  runtimeApiKey?: string;
}

/**
 * Options for useAcceptOwnership hook
 */
export interface AcceptOwnershipOptions {
  /** Callback for transaction status changes */
  onStatusChange?: (status: TxStatus, details: TransactionStatusUpdate) => void;
  /** Callback on successful mutation */
  onSuccess?: (result: OperationResult) => void;
  /** Callback on mutation error */
  onError?: (error: Error) => void;
}

/**
 * Return type for useAcceptOwnership hook
 *
 * Follows same pattern as useTransferOwnership, useGrantRole, useRevokeRole
 */
export interface UseAcceptOwnershipReturn {
  /** Execute the mutation */
  mutate: (args: AcceptOwnershipArgs) => void;
  /** Execute the mutation (async) */
  mutateAsync: (args: AcceptOwnershipArgs) => Promise<OperationResult>;
  /** Whether the mutation is in progress */
  isPending: boolean;
  /** Error from the mutation, if any */
  error: Error | null;
  /** Current transaction status */
  status: TxStatus;
  /** Detailed status update */
  statusDetails: TransactionStatusUpdate | null;
  /** Whether the service is ready */
  isReady: boolean;
  /** Whether the error is a network disconnection error */
  isNetworkError: boolean;
  /** Whether the error is a user rejection error */
  isUserRejection: boolean;
  /** Reset the mutation state */
  reset: () => void;
}

/**
 * Hook for accepting a pending ownership transfer (two-step Ownable).
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
export declare function useAcceptOwnership(
  adapter: ContractAdapter | null,
  contractAddress: string,
  options?: AcceptOwnershipOptions
): UseAcceptOwnershipReturn;

// =============================================================================
// useCurrentLedger Hook
// =============================================================================

/**
 * Options for useCurrentLedger hook
 */
export interface UseCurrentLedgerOptions {
  /** Polling interval in milliseconds (default: 5000) */
  pollInterval?: number;
  /** Whether polling is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Return type for useCurrentLedger hook
 */
export interface UseCurrentLedgerReturn {
  /** Current ledger/block number, null if not yet fetched */
  currentLedger: number | null;
  /** Whether the initial fetch is loading */
  isLoading: boolean;
  /** Error from fetching, if any */
  error: Error | null;
  /** Manually trigger a refresh */
  refetch: () => void;
}

/**
 * Hook for polling the current ledger/block number.
 *
 * Used for:
 * - Displaying current ledger in transfer dialog
 * - Validating expiration input is in the future
 *
 * @param adapter - The contract adapter instance, or null if not loaded
 * @param options - Polling configuration
 * @returns Current ledger and loading/error states
 *
 * @example
 * ```tsx
 * const { currentLedger, isLoading } = useCurrentLedger(adapter, {
 *   pollInterval: 5000,
 *   enabled: hasTwoStepOwnable,
 * });
 *
 * const isExpirationValid = expirationLedger > (currentLedger ?? 0);
 * ```
 */
export declare function useCurrentLedger(
  adapter: ContractAdapter | null,
  options?: UseCurrentLedgerOptions
): UseCurrentLedgerReturn;

// =============================================================================
// useOwnershipTransferDialog Hook
// =============================================================================

/**
 * Form data for transfer ownership dialog
 */
export interface TransferOwnershipFormData {
  /** The new owner's address */
  newOwnerAddress: string;
  /** The ledger number at which the transfer expires (string for form input) */
  expirationLedger: string;
}

/**
 * Options for useOwnershipTransferDialog hook
 */
export interface UseOwnershipTransferDialogOptions {
  /** Current owner address (for self-transfer validation) */
  currentOwner: string;
  /** Whether contract supports two-step transfer */
  hasTwoStepOwnable: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Callback on successful transfer */
  onSuccess?: () => void;
}

/**
 * Return type for useOwnershipTransferDialog hook
 */
export interface UseOwnershipTransferDialogReturn {
  /** Current dialog step */
  step: DialogStep;
  /** Error message if step is 'error' */
  errorMessage: string | null;
  /** Current transaction status */
  txStatus: TxStatus;
  /** Whether wallet is connected */
  isWalletConnected: boolean;
  /** Whether expiration input is required (two-step) */
  requiresExpiration: boolean;
  /** Current ledger for validation (null if not two-step) */
  currentLedger: number | null;
  /** Submit the transfer */
  submit: (data: TransferOwnershipFormData) => Promise<void>;
  /** Retry after error */
  retry: () => void;
  /** Reset to initial state */
  reset: () => void;
}

/**
 * Hook for managing Transfer Ownership dialog state.
 *
 * Orchestrates:
 * - Form validation (address format, self-transfer, expiration)
 * - Transaction execution via useTransferOwnership
 * - Dialog step transitions
 * - Current ledger polling (for two-step)
 *
 * @param options - Dialog configuration and callbacks
 * @returns Dialog state and actions
 */
export declare function useOwnershipTransferDialog(
  options: UseOwnershipTransferDialogOptions
): UseOwnershipTransferDialogReturn;

// =============================================================================
// useAcceptOwnershipDialog Hook
// =============================================================================

/**
 * Options for useAcceptOwnershipDialog hook
 */
export interface UseAcceptOwnershipDialogOptions {
  /** Callback when dialog should close */
  onClose: () => void;
  /** Callback on successful acceptance */
  onSuccess?: () => void;
}

/**
 * Return type for useAcceptOwnershipDialog hook
 */
export interface UseAcceptOwnershipDialogReturn {
  /** Current dialog step */
  step: DialogStep;
  /** Error message if step is 'error' */
  errorMessage: string | null;
  /** Current transaction status */
  txStatus: TxStatus;
  /** Whether wallet is connected */
  isWalletConnected: boolean;
  /** Submit the acceptance */
  submit: () => Promise<void>;
  /** Retry after error */
  retry: () => void;
  /** Reset to initial state */
  reset: () => void;
}

/**
 * Hook for managing Accept Ownership dialog state.
 *
 * Orchestrates:
 * - Transaction execution via useAcceptOwnership
 * - Dialog step transitions
 * - Error handling and retry
 *
 * @param options - Dialog configuration and callbacks
 * @returns Dialog state and actions
 */
export declare function useAcceptOwnershipDialog(
  options: UseAcceptOwnershipDialogOptions
): UseAcceptOwnershipDialogReturn;
