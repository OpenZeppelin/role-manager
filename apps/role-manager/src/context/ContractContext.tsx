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

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { AccessControlService, ContractSchema, NetworkConfig } from '@openzeppelin/ui-types';
import { logger } from '@openzeppelin/ui-utils';

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
  // Contract Registration
  // ==========================================================================

  // Track which contracts have been registered to avoid duplicate registrations
  // Using state (not ref) so changes trigger re-renders and hooks get updated value
  const [registeredContracts, setRegisteredContracts] = useState<Set<string>>(new Set());

  // Track previous ecosystem to detect actual ecosystem changes (not just network changes)
  const prevEcosystemRef = useRef<string | null>(null);

  // Compute isContractRegistered synchronously based on current selection
  // This ensures the value is correct during render, not just after effects
  const isContractRegistered = useMemo(() => {
    if (!selectedNetwork || !selectedContract) {
      return false;
    }
    const registrationKey = `${selectedNetwork.ecosystem}:${selectedContract.address}`;
    return registeredContracts.has(registrationKey);
  }, [selectedNetwork, selectedContract, registeredContracts]);

  // Register contract with access control service when contract/adapter changes
  useEffect(() => {
    // Skip if no adapter, still loading, no network, or no contract selected
    if (!adapter || isAdapterLoading || !selectedNetwork || !selectedContract) {
      return;
    }

    const registrationKey = `${selectedNetwork.ecosystem}:${selectedContract.address}`;

    // Skip if already registered
    if (registeredContracts.has(registrationKey)) {
      return;
    }

    // Skip if contract doesn't have a schema
    if (!selectedContract.schema) {
      logger.debug('ContractContext', 'Contract has no schema, skipping registration', {
        address: selectedContract.address,
      });
      // Mark as "registered" even without schema so data hooks don't wait forever
      setRegisteredContracts((prev) => new Set(prev).add(registrationKey));
      return;
    }

    // Get access control service from adapter
    const service = adapter.getAccessControlService?.() as
      | (AccessControlService & {
          registerContract?: (address: string, schema: ContractSchema) => void;
        })
      | undefined;

    // If adapter doesn't support registration, mark as registered anyway
    if (!service || typeof service.registerContract !== 'function') {
      setRegisteredContracts((prev) => new Set(prev).add(registrationKey));
      return;
    }

    try {
      // Parse the stored schema JSON
      const schema = JSON.parse(selectedContract.schema) as ContractSchema;

      // Register the contract with the service
      service.registerContract(selectedContract.address, schema);

      logger.debug('ContractContext', 'Registered contract with access control service', {
        address: selectedContract.address,
        ecosystem: selectedNetwork.ecosystem,
      });

      // Add to registered set (triggers re-render, hooks see updated isContractRegistered)
      setRegisteredContracts((prev) => new Set(prev).add(registrationKey));
    } catch (error) {
      logger.error('ContractContext', 'Failed to register contract', error);
      // Still mark as registered so hooks don't wait forever (they'll get the error)
      setRegisteredContracts((prev) => new Set(prev).add(registrationKey));
    }
  }, [adapter, isAdapterLoading, selectedNetwork, selectedContract, registeredContracts]);

  // Clear registration cache when ecosystem changes (new service instance)
  // Uses a ref to track the previous ecosystem and only clear when it actually changes,
  // avoiding unnecessary re-registrations when switching between networks of the same ecosystem
  useEffect(() => {
    if (selectedNetwork) {
      const currentEcosystem = selectedNetwork.ecosystem;

      // Only clear registrations when ecosystem actually changes
      if (prevEcosystemRef.current !== null && prevEcosystemRef.current !== currentEcosystem) {
        // When ecosystem changes, the adapter and service are recreated
        // Clear registrations for other ecosystems
        setRegisteredContracts((prev) => {
          const filtered = Array.from(prev).filter((key) => key.startsWith(`${currentEcosystem}:`));
          if (filtered.length !== prev.size) {
            return new Set(filtered);
          }
          return prev;
        });
      }

      // Update ref to current ecosystem
      prevEcosystemRef.current = currentEcosystem;
    }
  }, [selectedNetwork]);

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
