/**
 * usePendingTransfers hook
 * Feature: 015-ownership-transfer (Phase 6.5)
 * Updated by: 016-two-step-admin-assignment (Phase 6)
 *
 * Aggregates pending transfers from multiple sources for Dashboard display.
 * Currently supports ownership transfers and admin role transfers.
 *
 * Tasks: T045, T040, T041
 */

import { useCallback, useMemo } from 'react';

import type {
  ContractAdapter,
  OwnershipInfo,
  PendingAdminTransfer,
  PendingOwnershipTransfer,
} from '@openzeppelin/ui-types';

import type { PendingTransfer, UsePendingTransfersReturn } from '../types/pending-transfers';
import { createGetAccountUrl } from '../utils/explorer-urls';
import { useContractCapabilities } from './useContractCapabilities';
import { useContractAdminInfo, useContractOwnership } from './useContractData';
import { useCurrentBlock } from './useCurrentBlock';
import { useSelectedContract } from './useSelectedContract';

// =============================================================================
// Types
// =============================================================================

/**
 * Options for usePendingTransfers hook
 */
export interface UsePendingTransfersOptions {
  /** Connected wallet address for canAccept determination */
  connectedAddress?: string | null;
  /** Whether to include expired transfers (default: false) */
  includeExpired?: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if two addresses are equal (case-insensitive)
 */
function addressesEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Transform ownership pending transfer to unified PendingTransfer model
 */
function transformOwnershipTransfer(
  contractAddress: string,
  owner: string,
  pendingTransfer: PendingOwnershipTransfer,
  currentBlock: number | null,
  connectedAddress: string | null | undefined,
  adapter: ContractAdapter | null
): PendingTransfer {
  const expirationBlock = pendingTransfer.expirationBlock ?? 0;
  const isExpired = currentBlock !== null && currentBlock >= expirationBlock;
  const isPendingOwner = addressesEqual(connectedAddress, pendingTransfer.pendingOwner);

  // Generate explorer URLs for addresses
  const getAccountUrl = createGetAccountUrl(adapter);

  return {
    id: `ownership-${contractAddress}`,
    type: 'ownership',
    label: 'Owner',
    currentHolder: owner,
    currentHolderUrl: getAccountUrl(owner) ?? undefined,
    pendingRecipient: pendingTransfer.pendingOwner,
    pendingRecipientUrl: getAccountUrl(pendingTransfer.pendingOwner) ?? undefined,
    expirationBlock,
    isExpired,
    step: { current: 1, total: 2 },
    canAccept: isPendingOwner && !isExpired,
    initiatedAt: undefined, // Not available in current API
  };
}

/**
 * Transform admin pending transfer to unified PendingTransfer model
 * Feature: 016-two-step-admin-assignment (T040, T041)
 */
function transformAdminTransfer(
  contractAddress: string,
  admin: string,
  pendingTransfer: PendingAdminTransfer,
  currentBlock: number | null,
  connectedAddress: string | null | undefined,
  adapter: ContractAdapter | null
): PendingTransfer {
  const expirationBlock = pendingTransfer.expirationBlock ?? 0;
  const isExpired = currentBlock !== null && currentBlock >= expirationBlock;
  const isPendingAdmin = addressesEqual(connectedAddress, pendingTransfer.pendingAdmin);

  // Generate explorer URLs for addresses
  const getAccountUrl = createGetAccountUrl(adapter);

  return {
    id: `admin-${contractAddress}`,
    type: 'admin',
    label: 'Admin',
    currentHolder: admin,
    currentHolderUrl: getAccountUrl(admin) ?? undefined,
    pendingRecipient: pendingTransfer.pendingAdmin,
    pendingRecipientUrl: getAccountUrl(pendingTransfer.pendingAdmin) ?? undefined,
    expirationBlock,
    isExpired,
    step: { current: 1, total: 2 },
    canAccept: isPendingAdmin && !isExpired,
    initiatedAt: undefined, // Not available in current API
  };
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook that aggregates pending transfers from various sources.
 *
 * Currently aggregates:
 * - Ownership transfers from useContractOwnership
 * - Admin role transfers from useContractAdminInfo (Feature 016)
 *
 * Future extensions:
 * - Multisig signer changes
 *
 * @param options - Configuration options
 * @returns Object containing pending transfers and state
 *
 * @example
 * ```tsx
 * const { transfers, isLoading, hasError } = usePendingTransfers({
 *   connectedAddress: address,
 *   includeExpired: false,
 * });
 *
 * return (
 *   <PendingTransfersTable
 *     transfers={transfers}
 *     onAccept={handleAccept}
 *   />
 * );
 * ```
 */
export function usePendingTransfers(
  options: UsePendingTransfersOptions = {}
): UsePendingTransfersReturn {
  const { connectedAddress, includeExpired = false } = options;

  // Get contract context
  const { selectedContract, adapter, isContractRegistered } = useSelectedContract();
  const contractAddress = selectedContract?.address ?? '';

  // Feature 016: Get capabilities to check for two-step admin support
  const { capabilities } = useContractCapabilities(adapter, contractAddress, isContractRegistered);
  const hasTwoStepAdmin = capabilities?.hasTwoStepAdmin ?? false;

  // Fetch ownership data (includes pendingTransfer if available)
  const {
    ownership,
    isLoading: isOwnershipLoading,
    isFetching: isOwnershipFetching,
    hasError: ownershipHasError,
    errorMessage: ownershipErrorMessage,
    refetch: refetchOwnership,
  } = useContractOwnership(adapter, contractAddress, isContractRegistered);

  // Feature 016: Fetch admin info (only when contract supports two-step admin)
  const {
    adminInfo,
    isLoading: isAdminLoading,
    isFetching: isAdminFetching,
    hasError: adminHasError,
    errorMessage: adminErrorMessage,
    refetch: refetchAdminInfo,
  } = useContractAdminInfo(adapter, contractAddress, isContractRegistered, hasTwoStepAdmin);

  // Get current block for expiration calculation
  const { currentBlock, isLoading: isBlockLoading } = useCurrentBlock(adapter, {
    enabled: !!selectedContract,
  });

  // =============================================================================
  // Aggregate Pending Transfers
  // =============================================================================

  const transfers = useMemo((): PendingTransfer[] => {
    const result: PendingTransfer[] = [];

    // Early return if no contract selected
    if (!selectedContract) {
      return result;
    }

    // Check for ownership pending transfer
    if (ownership) {
      const ownershipWithPending = ownership as OwnershipInfo & {
        pendingTransfer?: PendingOwnershipTransfer | null;
      };

      if (ownershipWithPending.pendingTransfer && ownership.owner) {
        const transfer = transformOwnershipTransfer(
          contractAddress,
          ownership.owner,
          ownershipWithPending.pendingTransfer,
          currentBlock,
          connectedAddress,
          adapter
        );

        // Filter expired unless includeExpired is true
        if (!transfer.isExpired || includeExpired) {
          result.push(transfer);
        }
      }
    }

    // Feature 016: Check for admin pending transfer (T040, T041)
    if (
      adminInfo &&
      adminInfo.state === 'pending' &&
      adminInfo.pendingTransfer &&
      adminInfo.admin
    ) {
      const adminTransfer = transformAdminTransfer(
        contractAddress,
        adminInfo.admin,
        adminInfo.pendingTransfer,
        currentBlock,
        connectedAddress,
        adapter
      );

      // Filter expired unless includeExpired is true
      if (!adminTransfer.isExpired || includeExpired) {
        result.push(adminTransfer);
      }
    }

    // Future: Add multisig signer changes

    return result;
  }, [
    selectedContract,
    ownership,
    adminInfo,
    contractAddress,
    currentBlock,
    connectedAddress,
    includeExpired,
    adapter,
  ]);

  // =============================================================================
  // Combined State
  // =============================================================================

  // Loading if any data source is loading (for initial load)
  const isLoading =
    isOwnershipLoading || isAdminLoading || (isBlockLoading && transfers.length === 0);

  // Refreshing if data is being fetched but not initial load
  const isRefreshing = !isLoading && (isOwnershipFetching || isAdminFetching);

  // Error state (combine errors from all sources)
  const hasError = ownershipHasError || adminHasError;
  const errorMessage = ownershipErrorMessage ?? adminErrorMessage ?? null;

  // =============================================================================
  // Actions
  // =============================================================================

  const refetch = useCallback(async (): Promise<void> => {
    const refetchPromises = [refetchOwnership()];
    if (hasTwoStepAdmin) {
      refetchPromises.push(refetchAdminInfo());
    }
    await Promise.all(refetchPromises);
  }, [refetchOwnership, refetchAdminInfo, hasTwoStepAdmin]);

  return {
    transfers,
    currentBlock,
    isLoading,
    isRefreshing,
    hasError,
    errorMessage,
    refetch,
  };
}
