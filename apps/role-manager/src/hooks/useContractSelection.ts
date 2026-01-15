/**
 * useContractSelection Hook
 *
 * Manages contract selection state with user preference persistence
 * and auto-selection logic for handling pending selections and
 * fallback to first contract.
 */

import { useCallback, useEffect, useState } from 'react';

import type { NetworkConfig } from '@openzeppelin/ui-types';
import { logger } from '@openzeppelin/ui-utils';

import { recentContractsStorage } from '@/core/storage/RecentContractsStorage';
import { userPreferencesStorage } from '@/core/storage/UserPreferencesStorage';
import type { ContractRecord } from '@/types/contracts';

// =============================================================================
// Constants
// =============================================================================

const PREF_LAST_SELECTED_CONTRACT_ID = 'lastSelectedContractId';

// =============================================================================
// Types
// =============================================================================

export interface UseContractSelectionOptions {
  /** List of available contracts for the current network */
  contracts: ContractRecord[] | undefined;
  /** Whether contracts are still loading */
  isContractsLoading: boolean;
  /** Pending contract ID to select (from preferences or selectContractById) */
  pendingContractId: string | null;
  /** Callback to clear the pending contract ID */
  onPendingContractHandled: () => void;
  /** Currently selected network */
  selectedNetwork: NetworkConfig | null;
  /** Available networks */
  networks: NetworkConfig[];
  /** Callback to switch networks */
  setSelectedNetwork: (network: NetworkConfig | null) => void;
  /** Callback to set pending contract ID */
  setPendingContractId: (contractId: string | null) => void;
}

export interface UseContractSelectionReturn {
  /** Currently selected contract */
  selectedContract: ContractRecord | null;
  /** Update the selected contract (also persists to preferences) */
  setSelectedContract: (contract: ContractRecord | null) => void;
  /** Select a contract by ID, switching networks if needed */
  selectContractById: (contractId: string) => Promise<void>;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook that manages contract selection with preference persistence.
 *
 * Features:
 * - Handles pending contract selection from preferences or selectContractById
 * - Auto-selects first contract when contracts load and none selected
 * - Auto-selects first contract when current selection is removed
 * - Persists contract selection changes to user preferences
 * - Supports cross-network contract selection via selectContractById
 *
 * @param options - Configuration options
 * @returns Contract selection state and actions
 */
export function useContractSelection({
  contracts,
  isContractsLoading,
  pendingContractId,
  onPendingContractHandled,
  selectedNetwork,
  networks,
  setSelectedNetwork,
  setPendingContractId,
}: UseContractSelectionOptions): UseContractSelectionReturn {
  // Selected contract state
  const [selectedContract, setSelectedContractState] = useState<ContractRecord | null>(null);

  // Handle pending contract selection (from preferences or selectContractById)
  useEffect(() => {
    // Don't process pending while contracts are still loading
    if (!pendingContractId || !contracts || contracts.length === 0 || isContractsLoading) {
      return;
    }

    const contract = contracts.find((c) => c.id === pendingContractId);
    if (contract) {
      setSelectedContractState(contract);
      onPendingContractHandled();
    } else {
      // Contract not found in list, clear pending and select first
      onPendingContractHandled();
      setSelectedContractState(contracts[0]);
    }
  }, [pendingContractId, contracts, isContractsLoading, onPendingContractHandled]);

  // Auto-select first contract when contracts load or change (only if no pending selection)
  useEffect(() => {
    // Skip if we have a pending contract to select
    if (pendingContractId) {
      return;
    }

    const contractsList = contracts ?? [];

    if (contractsList.length > 0) {
      // If no contract selected, select first
      if (!selectedContract) {
        setSelectedContractState(contractsList[0]);
      }
      // If current selection is not in the list (deleted or network changed), select first
      else if (!contractsList.find((c) => c.id === selectedContract.id)) {
        setSelectedContractState(contractsList[0]);
      }
    } else {
      // No contracts available, clear selection
      setSelectedContractState(null);
    }
  }, [contracts, selectedContract, pendingContractId]);

  // Stable setter for contract (also saves to preferences)
  const setSelectedContract = useCallback((contract: ContractRecord | null) => {
    setSelectedContractState(contract);

    // Save to preferences
    if (contract) {
      userPreferencesStorage.set(PREF_LAST_SELECTED_CONTRACT_ID, contract.id).catch((error) => {
        logger.error('useContractSelection', 'Failed to save contract preference', error);
      });
    }
  }, []);

  /**
   * Select a contract by ID.
   * This is useful when a new contract is added and we want to auto-select it.
   * Will also switch networks if the contract is on a different network.
   */
  const selectContractById = useCallback(
    async (contractId: string) => {
      try {
        // Fetch the contract from storage
        const contract = await recentContractsStorage.get(contractId);
        if (!contract) {
          logger.warn('useContractSelection', `Contract not found: ${contractId}`);
          return;
        }

        // Check if we need to switch networks
        if (selectedNetwork?.id !== contract.networkId) {
          const targetNetwork = networks.find((n) => n.id === contract.networkId);
          if (targetNetwork) {
            setSelectedNetwork(targetNetwork);
            // Set pending contract to select after network switch and contracts reload
            setPendingContractId(contractId);
          } else {
            logger.warn('useContractSelection', `Network not found: ${contract.networkId}`);
          }
        } else {
          // Same network, just set the contract as selected
          // The contract might not be in the list yet if just added, so use pending
          setPendingContractId(contractId);
        }
      } catch (error) {
        logger.error('useContractSelection', 'Failed to select contract by ID', error);
      }
    },
    [selectedNetwork, networks, setSelectedNetwork, setPendingContractId]
  );

  return {
    selectedContract,
    setSelectedContract,
    selectContractById,
  };
}
