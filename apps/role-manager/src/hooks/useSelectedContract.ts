/**
 * useSelectedContract hook
 * Feature: 007-dashboard-real-data
 *
 * Convenience wrapper for ContractContext that provides access to
 * the selected contract, network, and adapter.
 *
 * This hook is the primary way for components to access contract
 * selection state throughout the application.
 */

import { useContractContext } from '../context/ContractContext';
import type { UseSelectedContractReturn } from '../types/dashboard';

/**
 * Hook that provides access to the currently selected contract and related state.
 *
 * This is a convenience wrapper around useContractContext that returns all
 * the values needed by components that need to interact with the selected contract.
 *
 * @returns Selected contract, network, adapter, and related state
 * @throws Error if used outside of ContractProvider
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { selectedContract, adapter, isAdapterLoading } = useSelectedContract();
 *
 *   if (!selectedContract) {
 *     return <DashboardEmptyState />;
 *   }
 *
 *   if (isAdapterLoading) {
 *     return <LoadingSpinner />;
 *   }
 *
 *   return <DashboardContent contract={selectedContract} adapter={adapter} />;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Updating selection
 * function ContractList() {
 *   const { contracts, selectedContract, setSelectedContract } = useSelectedContract();
 *
 *   return (
 *     <ul>
 *       {contracts.map((contract) => (
 *         <li
 *           key={contract.id}
 *           onClick={() => setSelectedContract(contract)}
 *           className={contract.id === selectedContract?.id ? 'selected' : ''}
 *         >
 *           {contract.label || contract.address}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useSelectedContract(): UseSelectedContractReturn {
  const context = useContractContext();

  return {
    selectedContract: context.selectedContract,
    setSelectedContract: context.setSelectedContract,
    selectedNetwork: context.selectedNetwork,
    setSelectedNetwork: context.setSelectedNetwork,
    adapter: context.adapter,
    isAdapterLoading: context.isAdapterLoading,
    contracts: context.contracts,
    isContractsLoading: context.isContractsLoading,
  };
}
