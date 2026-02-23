import { toast } from 'sonner';
import { useCallback, useMemo, useState } from 'react';

import { AddressBookWidget } from '@openzeppelin/ui-renderer';
import { useAddressBookWidgetProps } from '@openzeppelin/ui-storage';
import type { NetworkConfig } from '@openzeppelin/ui-types';

import { getAdapter, getEcosystemMetadata } from '@/core/ecosystems/ecosystemManager';

import { db } from '../core/storage/database';
import { useAllNetworks } from '../hooks/useAllNetworks';
import { useSelectedContract } from '../hooks/useSelectedContract';

const ECOSYSTEM_ADDRESS_PATH: Record<string, string> = {
  evm: 'address',
  polkadot: 'address',
  stellar: 'account',
};

export function Settings() {
  const { selectedNetwork, adapter } = useSelectedContract();
  const { networks } = useAllNetworks();
  const [filterNetworkIds, setFilterNetworkIds] = useState<string[]>([]);

  const widgetProps = useAddressBookWidgetProps(db, {
    networkId: selectedNetwork?.id,
    filterNetworkIds,
    onError: (title, err) => toast.error(`${title}: ${err instanceof Error ? err.message : err}`),
  });

  const resolveNetwork = useCallback(
    (networkId: string) => networks.find((n) => n.id === networkId),
    [networks]
  );

  const resolveExplorerUrl = useCallback(
    (address: string, networkId?: string) => {
      if (!networkId) return undefined;

      if (adapter && selectedNetwork?.id === networkId) {
        return adapter.getExplorerUrl(address) ?? undefined;
      }

      const net = networks.find((n) => n.id === networkId);
      if (!net?.explorerUrl) return undefined;
      const baseUrl = net.explorerUrl.replace(/\/+$/, '');
      const segment = ECOSYSTEM_ADDRESS_PATH[net.ecosystem] ?? 'address';
      return `${baseUrl}/${segment}/${address}`;
    },
    [adapter, networks, selectedNetwork]
  );

  const addressPlaceholder = useMemo(
    () =>
      adapter
        ? (getEcosystemMetadata(adapter.networkConfig.ecosystem)?.addressExample ?? '0x...')
        : '0x...',
    [adapter]
  );

  const resolveAdapter = useCallback(async (network: NetworkConfig) => getAdapter(network), []);

  const resolveAddressPlaceholder = useCallback(
    (network: NetworkConfig) => getEcosystemMetadata(network.ecosystem)?.addressExample ?? '0x...',
    []
  );

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <AddressBookWidget
        {...widgetProps}
        resolveNetwork={resolveNetwork}
        resolveExplorerUrl={resolveExplorerUrl}
        adapter={adapter ?? undefined}
        resolveAdapter={resolveAdapter}
        addressPlaceholder={addressPlaceholder}
        resolveAddressPlaceholder={resolveAddressPlaceholder}
        networks={networks}
        filterNetworkIds={filterNetworkIds}
        onFilterNetworkIdsChange={setFilterNetworkIds}
      />
    </div>
  );
}
