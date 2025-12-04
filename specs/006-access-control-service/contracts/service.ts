/**
 * Access Control Service Contracts
 *
 * Defines the interfaces for the Access Control feature integration.
 * These types mirror or re-export the underlying adapter types but defined locally for clarity.
 */

import type {
  AccessControlCapabilities,
  AccessControlService,
  OperationResult,
  OwnershipInfo,
  RoleAssignment,
  TransactionStatusUpdate,
  TxStatus,
} from '@openzeppelin/ui-builder-types';

/**
 * Hook Return: Access Control Service
 */
export interface UseAccessControlServiceReturn {
  /** The service instance or null if adapter not ready */
  service: AccessControlService | null;
  /** Whether the service is ready to use */
  isReady: boolean;
}

/**
 * Hook Return: Contract Capabilities
 */
export interface UseContractCapabilitiesReturn {
  /** Detected capabilities */
  capabilities: AccessControlCapabilities | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Refetch function */
  refetch: () => void;
}

/**
 * Hook Return: Contract Roles
 */
export interface UseContractRolesReturn {
  /** List of roles and members */
  roles: RoleAssignment[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Refetch function */
  refetch: () => void;
}

/**
 * Hook Return: Contract Ownership
 */
export interface UseContractOwnershipReturn {
  /** Ownership info */
  ownership: OwnershipInfo | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Refetch function */
  refetch: () => void;
}

/**
 * Hook Return: Mutation (Grant/Revoke/Transfer)
 */
export interface UseAccessControlMutationReturn<TArgs = unknown> {
  /**
   * Execute the mutation
   * @param args Mutation arguments (address, role/account, etc.)
   */
  mutate: (args: TArgs) => void;
  /** Async execution */
  mutateAsync: (args: TArgs) => Promise<OperationResult>;
  /** Loading state */
  isPending: boolean;
  /** Error state */
  error: Error | null;
  /** Transaction status (for UI feedback) */
  status: TxStatus;
  /** Detailed status update */
  statusDetails: TransactionStatusUpdate | null;
}
