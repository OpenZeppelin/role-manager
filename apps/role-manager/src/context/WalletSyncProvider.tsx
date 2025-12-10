/**
 * WalletSyncProvider - Synchronizes network selection with wallet state
 * Feature: 013-wallet-connect-header
 *
 * This provider bridges the ContractContext (Role Manager's network selection)
 * with the WalletStateProvider (UI Builder's wallet management).
 *
 * When a user selects a network from the ecosystem picker in the sidebar,
 * this provider updates the wallet state so the correct adapter is loaded
 * for wallet operations.
 *
 * @contract
 * - MUST read selectedNetwork from ContractContext
 * - MUST call setActiveNetworkId when selectedNetwork changes
 * - MUST pass null to setActiveNetworkId when no network selected
 * - MUST NOT modify ContractContext state
 */

import { useEffect } from 'react';

import { useWalletState } from '@openzeppelin/ui-builder-react-core';

import { useContractContext } from './ContractContext';

export interface WalletSyncProviderProps {
  children: React.ReactNode;
}

/**
 * Synchronizes the selected network from ContractContext to WalletStateProvider.
 *
 * This enables the wallet UI to automatically load the correct adapter
 * when the user selects a network from the ecosystem picker.
 *
 * @example
 * ```tsx
 * // In App.tsx provider hierarchy
 * <WalletStateProvider ...>
 *   <ContractProvider>
 *     <WalletSyncProvider>
 *       <MainLayout>...</MainLayout>
 *     </WalletSyncProvider>
 *   </ContractProvider>
 * </WalletStateProvider>
 * ```
 */
export function WalletSyncProvider({ children }: WalletSyncProviderProps): React.ReactElement {
  const { selectedNetwork } = useContractContext();
  const { setActiveNetworkId } = useWalletState();

  // Sync network selection to wallet state
  useEffect(() => {
    setActiveNetworkId(selectedNetwork?.id ?? null);
  }, [selectedNetwork, setActiveNetworkId]);

  return <>{children}</>;
}
