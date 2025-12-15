/**
 * usePendingTransfers hook
 * Feature: 015-ownership-transfer (Phase 6.5)
 *
 * Aggregates pending transfers from multiple sources for Dashboard display.
 * Currently supports ownership transfers; can be extended for admin/multisig.
 *
 * Tasks: T045
 */

import { useCallback, useMemo } from 'react';

import type {
  ContractAdapter,
  OwnershipInfo,
  PendingOwnershipTransfer,
} from '@openzeppelin/ui-builder-types';

import type { PendingTransfer, UsePendingTransfersReturn } from '../types/pending-transfers';
import { createGetAccountUrl } from '../utils/explorer-urls';
import { useContractOwnership } from './useContractData';
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

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook that aggregates pending transfers from various sources.
 *
 * Currently aggregates:
 * - Ownership transfers from useContractOwnership
 *
 * Future extensions:
 * - Admin role transfers
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

  // Fetch ownership data (includes pendingTransfer if available)
  const {
    ownership,
    isLoading: isOwnershipLoading,
    isFetching: isOwnershipFetching,
    hasError: ownershipHasError,
    errorMessage: ownershipErrorMessage,
    refetch: refetchOwnership,
  } = useContractOwnership(adapter, contractAddress, isContractRegistered);

  // Get current block for expiration calculation
  const { currentBlock, isLoading: isBlockLoading } = useCurrentBlock(adapter, {
    enabled: !!selectedContract,
  });

  // =============================================================================
  // Aggregate Pending Transfers
  // =============================================================================

  const transfers = useMemo((): PendingTransfer[] => {
    const result: PendingTransfer[] = [];

    // Early return if no contract or ownership data
    if (!selectedContract || !ownership) {
      return result;
    }

    // Check for ownership pending transfer
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

    // Future: Add admin role transfers
    // Future: Add multisig signer changes

    return result;
  }, [
    selectedContract,
    ownership,
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
  const isLoading = isOwnershipLoading || (isBlockLoading && transfers.length === 0);

  // Refreshing if data is being fetched but not initial load
  const isRefreshing = !isLoading && isOwnershipFetching;

  // Error state
  const hasError = ownershipHasError;
  const errorMessage = ownershipErrorMessage;

  // =============================================================================
  // Actions
  // =============================================================================

  const refetch = useCallback(async (): Promise<void> => {
    await refetchOwnership();
    // Future: Add refetch for other sources
  }, [refetchOwnership]);

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
