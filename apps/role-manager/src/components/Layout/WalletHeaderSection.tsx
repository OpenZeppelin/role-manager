/**
 * WalletHeaderSection - Conditional wallet UI for the header
 * Feature: 013-wallet-connect-header
 * Feature: network-settings
 *
 * Renders the wallet connection UI only when a network is selected
 * from the ecosystem picker in the sidebar. When no network is selected,
 * this component renders nothing.
 *
 * Includes a settings button for configuring network services (RPC, Indexer, etc.)
 *
 * @contract
 * - MUST read selectedNetwork from ContractContext
 * - MUST return null when selectedNetwork is null/undefined
 * - MUST render WalletConnectionWithSettings when selectedNetwork exists
 * - MUST forward className to container
 */

import { WalletConnectionWithSettings } from '@openzeppelin/ui-builder-react-core';

import { useContractContext } from '../../context/ContractContext';

export interface WalletHeaderSectionProps {
  className?: string;
}

/**
 * Conditionally renders wallet connection UI in the header.
 *
 * The wallet UI (connect button, account display, settings) only appears when
 * a network is selected. This follows the spec requirement that
 * wallet UI is network-dependent.
 *
 * The settings button allows users to configure network services:
 * - Stellar: RPC Provider, Indexer (HTTP + WebSocket endpoints)
 * - EVM: RPC Provider, Block Explorer, Contract Definition Provider
 *
 * @example
 * ```tsx
 * // In AppHeader
 * <UIBuilderHeader
 *   title="Role Manager"
 *   rightContent={<WalletHeaderSection />}
 * />
 * ```
 */
export function WalletHeaderSection({
  className,
}: WalletHeaderSectionProps): React.ReactElement | null {
  const { selectedNetwork } = useContractContext();

  // Per spec: wallet UI only visible when network selected
  if (!selectedNetwork) {
    return null;
  }

  return (
    <div className={className}>
      <WalletConnectionWithSettings />
    </div>
  );
}
