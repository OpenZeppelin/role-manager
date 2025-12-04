/**
 * ContractContext - Shared contract selection state
 * Feature: 007-dashboard-real-data
 *
 * Provides the selected contract, network, and adapter to all components
 * in the application tree. This context enables the Dashboard and other
 * pages to access the currently selected contract without prop drilling.
 *
 * Usage:
 * 1. Wrap App with ContractProvider
 * 2. Use useContractContext() or useSelectedContract() to access state
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { NetworkConfig } from '@openzeppelin/ui-builder-types';

import { useAllNetworks } from '../hooks/useAllNetworks';
import { useNetworkAdapter } from '../hooks/useNetworkAdapter';
import { useRecentContracts } from '../hooks/useRecentContracts';
import type { ContractRecord } from '../types/contracts';
import type { ContractContextValue } from '../types/dashboard';

// =============================================================================
// Context
// =============================================================================

/**
 * React Context for contract selection state.
 * Should only be accessed via useContractContext hook.
 */
const ContractContext = createContext<ContractContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

export interface ContractProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that manages contract selection state.
 *
 * Responsibilities:
 * - Loads available networks from all ecosystems
 * - Auto-selects first network when loaded
 * - Loads contracts for the selected network
 * - Auto-selects first contract when contracts load
 * - Loads adapter for the selected network
 * - Handles state reset when network changes
 *
 * @example
 * ```tsx
 * // In App.tsx
 * function App() {
 *   return (
 *     <BrowserRouter>
 *       <ContractProvider>
 *         <MainLayout>
 *           <Routes>...</Routes>
 *         </MainLayout>
 *       </ContractProvider>
 *     </BrowserRouter>
 *   );
 * }
 * ```
 */
export function ContractProvider({ children }: ContractProviderProps): React.ReactElement {
  // ==========================================================================
  // Networks (from all enabled ecosystems)
  // ==========================================================================

  const { networks, isLoading: isLoadingNetworks } = useAllNetworks();

  // Selected network state
  const [selectedNetwork, setSelectedNetworkState] = useState<NetworkConfig | null>(null);

  // Auto-select first network once loaded
  useEffect(() => {
    if (!selectedNetwork && networks.length > 0 && !isLoadingNetworks) {
      setSelectedNetworkState(networks[0]);
    }
  }, [networks, selectedNetwork, isLoadingNetworks]);

  // Stable setter for network
  const setSelectedNetwork = useCallback((network: NetworkConfig | null) => {
    setSelectedNetworkState(network);
  }, []);

  // ==========================================================================
  // Contracts (filtered by selected network)
  // ==========================================================================

  const { data: contracts, isLoading: isContractsLoading } = useRecentContracts(
    selectedNetwork?.id
  );

  // Selected contract state
  const [selectedContract, setSelectedContractState] = useState<ContractRecord | null>(null);

  // Auto-select first contract when contracts load or change
  useEffect(() => {
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
  }, [contracts, selectedContract]);

  // Stable setter for contract
  const setSelectedContract = useCallback((contract: ContractRecord | null) => {
    setSelectedContractState(contract);
  }, []);

  // ==========================================================================
  // Adapter (for selected network)
  // ==========================================================================

  const { adapter, isLoading: isAdapterLoading } = useNetworkAdapter(selectedNetwork);

  // ==========================================================================
  // Context Value
  // ==========================================================================

  const contextValue = useMemo<ContractContextValue>(
    () => ({
      selectedContract,
      setSelectedContract,
      selectedNetwork,
      setSelectedNetwork,
      adapter,
      isAdapterLoading,
      contracts: contracts ?? [],
      isContractsLoading,
    }),
    [
      selectedContract,
      setSelectedContract,
      selectedNetwork,
      setSelectedNetwork,
      adapter,
      isAdapterLoading,
      contracts,
      isContractsLoading,
    ]
  );

  return <ContractContext.Provider value={contextValue}>{children}</ContractContext.Provider>;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access the ContractContext.
 * Must be used within a ContractProvider.
 *
 * @throws Error if used outside of ContractProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { selectedContract, adapter } = useContractContext();
 *
 *   if (!selectedContract) {
 *     return <EmptyState />;
 *   }
 *
 *   return <ContractDetails contract={selectedContract} adapter={adapter} />;
 * }
 * ```
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useContractContext(): ContractContextValue {
  const context = useContext(ContractContext);

  if (context === null) {
    throw new Error('useContractContext must be used within a ContractProvider');
  }

  return context;
}

// =============================================================================
// Exports
// =============================================================================

export { ContractContext };
