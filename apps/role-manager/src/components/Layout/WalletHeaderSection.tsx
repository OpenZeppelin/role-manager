/**
 * WalletHeaderSection - Conditional wallet UI for the header
 * Feature: 013-wallet-connect-header
 *
 * Renders the wallet connection UI only when a network is selected
 * from the ecosystem picker in the sidebar. When no network is selected,
 * this component renders nothing.
 *
 * @contract
 * - MUST read selectedNetwork from ContractContext
 * - MUST return null when selectedNetwork is null/undefined
 * - MUST render WalletConnectionHeader when selectedNetwork exists
 * - MUST forward className to WalletConnectionHeader container
 */

import { WalletConnectionHeader } from '@openzeppelin/ui-builder-react-core';

import { useContractContext } from '../../context/ContractContext';

export interface WalletHeaderSectionProps {
  className?: string;
}

/**
 * Conditionally renders wallet connection UI in the header.
 *
 * The wallet UI (connect button, account display) only appears when
 * a network is selected. This follows the spec requirement that
 * wallet UI is network-dependent.
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
      <WalletConnectionHeader />
    </div>
  );
}
