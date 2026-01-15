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

import React, { createContext, useCallback, useContext, useMemo } from 'react';

import { useAllNetworks } from '../hooks/useAllNetworks';
import { useContractRegistration } from '../hooks/useContractRegistration';
import { useContractSelection } from '../hooks/useContractSelection';
import { useNetworkAdapter } from '../hooks/useNetworkAdapter';
import { useNetworkSelection } from '../hooks/useNetworkSelection';
import { useRecentContracts } from '../hooks/useRecentContracts';
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

  // Network selection with preference persistence
  const { selectedNetwork, setSelectedNetwork, pendingContractId, setPendingContractId } =
    useNetworkSelection({
      networks,
      isLoadingNetworks,
    });

  // ==========================================================================
  // Contracts (filtered by selected network)
  // ==========================================================================

  const { data: contracts, isLoading: isContractsLoading } = useRecentContracts(
    selectedNetwork?.id
  );

  // Callback for when pending contract is handled
  const handlePendingContractHandled = useCallback(() => {
    setPendingContractId(null);
  }, [setPendingContractId]);

  // Contract selection with preference persistence
  const { selectedContract, setSelectedContract, selectContractById } = useContractSelection({
    contracts,
    isContractsLoading,
    pendingContractId,
    onPendingContractHandled: handlePendingContractHandled,
    selectedNetwork,
    networks,
    setSelectedNetwork,
    setPendingContractId,
  });

  // ==========================================================================
  // Adapter (for selected network)
  // ==========================================================================

  const { adapter, isLoading: isAdapterLoading } = useNetworkAdapter(selectedNetwork);

  // ==========================================================================
  // Contract Registration
  // ==========================================================================

  const { isContractRegistered } = useContractRegistration({
    adapter,
    isAdapterLoading,
    selectedNetwork,
    selectedContract,
  });

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
      isContractRegistered,
      selectContractById,
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
      isContractRegistered,
      selectContractById,
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
