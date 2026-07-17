/**
 * NameResolverBridge
 *
 * Projects the active runtime's name-resolution capability into
 * `NameResolverProvider` so AddressField instances resolve typed names
 * (e.g. `vitalik.eth`) inline. On runtimes without the capability the
 * resolver is empty and fields behave as before (hex-only).
 *
 * Must render inside WalletStateProvider (needs WalletStateContext).
 */
import type { ReactNode } from 'react';

import { NameResolverProvider } from '@openzeppelin/ui-components';
import { useRuntimeNameResolver, useWalletState } from '@openzeppelin/ui-react';

/** Bridges runtime name resolution into ui-components for AddressField ENS UX. */
export function NameResolverBridge({ children }: { children: ReactNode }) {
  const resolver = useRuntimeNameResolver();
  const { activeNetworkId, activeNetworkConfig } = useWalletState();

  return (
    <NameResolverProvider
      {...resolver}
      activeNetworkId={activeNetworkId ?? null}
      activeNetworkName={activeNetworkConfig?.name}
    >
      {children}
    </NameResolverProvider>
  );
}
