import { toast } from 'sonner';
import { useCallback, useMemo, useState } from 'react';

import { AddressBookWidget } from '@openzeppelin/ui-renderer';
import { useAddressBookWidgetProps } from '@openzeppelin/ui-storage';
import type { NetworkConfig } from '@openzeppelin/ui-types';

import { getEcosystemMetadata, getRuntime } from '@/core/ecosystems/ecosystemManager';

import { PageHeader } from '../components/Shared/PageHeader';
import { db } from '../core/storage/database';
import { useAllNetworks } from '../hooks/useAllNetworks';
import { useSelectedContract } from '../hooks/useSelectedContract';

const ECOSYSTEM_ADDRESS_PATH: Record<string, string> = {
  evm: 'address',
  polkadot: 'address',
  stellar: 'account',
};

export function AddressBook() {
  const { selectedNetwork, runtime } = useSelectedContract();
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

      if (runtime && selectedNetwork?.id === networkId) {
        return runtime.explorer.getExplorerUrl(address) ?? undefined;
      }

      const net = networks.find((n) => n.id === networkId);
      if (!net?.explorerUrl) return undefined;
      const baseUrl = net.explorerUrl.replace(/\/+$/, '');
      const segment = ECOSYSTEM_ADDRESS_PATH[net.ecosystem] ?? 'address';
      return `${baseUrl}/${segment}/${address}`;
    },
    [runtime, networks, selectedNetwork]
  );

  const addressPlaceholder = useMemo(
    () =>
      runtime
        ? (getEcosystemMetadata(runtime.networkConfig.ecosystem)?.addressExample ?? '0x...')
        : '0x...',
    [runtime]
  );

  const resolveAddressing = useCallback(async (network: NetworkConfig) => {
    const rt = await getRuntime(network);
    const { addressing } = rt;
    rt.dispose();
    return addressing;
  }, []);

  const resolveAddressPlaceholder = useCallback(
    (network: NetworkConfig) => getEcosystemMetadata(network.ecosystem)?.addressExample ?? '0x...',
    []
  );

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Address Book"
        subtitle="Manage saved addresses and aliases across networks."
      />
      <AddressBookWidget
        {...widgetProps}
        resolveNetwork={resolveNetwork}
        resolveExplorerUrl={resolveExplorerUrl}
        addressing={runtime?.addressing ?? undefined}
        resolveAddressing={resolveAddressing}
        addressPlaceholder={addressPlaceholder}
        resolveAddressPlaceholder={resolveAddressPlaceholder}
        networks={networks}
        filterNetworkIds={filterNetworkIds}
        onFilterNetworkIdsChange={setFilterNetworkIds}
        title="Saved Addresses"
        className="shadow-none"
      />
    </div>
  );
}
