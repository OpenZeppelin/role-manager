/**
 * useNetworkSelection Hook
 *
 * Manages network selection state with user preference persistence.
 * Loads the last selected network from storage on mount and saves
 * changes back to storage.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { NetworkConfig } from '@openzeppelin/ui-types';
import { logger } from '@openzeppelin/ui-utils';

import { userPreferencesStorage } from '@/core/storage/UserPreferencesStorage';

// =============================================================================
// Constants
// =============================================================================

const PREF_LAST_SELECTED_NETWORK_ID = 'lastSelectedNetworkId';

// =============================================================================
// Types
// =============================================================================

export interface UseNetworkSelectionOptions {
  /** Available networks to select from */
  networks: NetworkConfig[];
  /** Whether networks are still loading */
  isLoadingNetworks: boolean;
}

export interface UseNetworkSelectionReturn {
  /** Currently selected network */
  selectedNetwork: NetworkConfig | null;
  /** Update the selected network (also persists to preferences) */
  setSelectedNetwork: (network: NetworkConfig | null) => void;
  /** Whether preferences have been loaded */
  isPreferencesLoaded: boolean;
  /** Pending contract ID to select after network switch */
  pendingContractId: string | null;
  /** Set the pending contract ID */
  setPendingContractId: (contractId: string | null) => void;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook that manages network selection with preference persistence.
 *
 * Features:
 * - Loads last selected network from user preferences on mount
 * - Falls back to first network if no saved preference or invalid
 * - Persists network selection changes to user preferences
 * - Provides pending contract ID state for cross-network contract selection
 *
 * @param options - Configuration options
 * @returns Network selection state and setters
 */
export function useNetworkSelection({
  networks,
  isLoadingNetworks,
}: UseNetworkSelectionOptions): UseNetworkSelectionReturn {
  // Selected network state
  const [selectedNetwork, setSelectedNetworkState] = useState<NetworkConfig | null>(null);

  // Track if we've loaded preferences (to avoid overwriting with defaults)
  const preferencesLoadedRef = useRef(false);

  // Track pending contract selection (for selectContractById)
  const [pendingContractId, setPendingContractId] = useState<string | null>(null);

  // Load saved preferences on mount
  useEffect(() => {
    if (preferencesLoadedRef.current || networks.length === 0 || isLoadingNetworks) {
      return;
    }

    const loadPreferences = async () => {
      try {
        const savedNetworkId = await userPreferencesStorage.getString(
          PREF_LAST_SELECTED_NETWORK_ID
        );
        const savedContractId = await userPreferencesStorage.getString('lastSelectedContractId');

        if (savedNetworkId) {
          const network = networks.find((n) => n.id === savedNetworkId);
          if (network) {
            setSelectedNetworkState(network);
            // Set pending contract to select after contracts load
            if (savedContractId) {
              setPendingContractId(savedContractId);
            }
            preferencesLoadedRef.current = true;
            return;
          }
        }

        // Fallback to first network if no saved preference or invalid
        setSelectedNetworkState(networks[0]);
        preferencesLoadedRef.current = true;
      } catch (error) {
        logger.error('useNetworkSelection', 'Failed to load preferences', error);
        // Fallback to first network
        setSelectedNetworkState(networks[0]);
        preferencesLoadedRef.current = true;
      }
    };

    loadPreferences();
  }, [networks, isLoadingNetworks]);

  // Stable setter for network (also saves to preferences)
  const setSelectedNetwork = useCallback((network: NetworkConfig | null) => {
    setSelectedNetworkState(network);

    // Save to preferences
    if (network) {
      userPreferencesStorage.set(PREF_LAST_SELECTED_NETWORK_ID, network.id).catch((error) => {
        logger.error('useNetworkSelection', 'Failed to save network preference', error);
      });
    }
  }, []);

  return {
    selectedNetwork,
    setSelectedNetwork,
    isPreferencesLoaded: preferencesLoadedRef.current,
    pendingContractId,
    setPendingContractId,
  };
}
