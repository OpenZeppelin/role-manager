import { NetworkServiceErrorBanner } from '@openzeppelin/ui-components';
import type { NetworkConfig } from '@openzeppelin/ui-types';

import type { ServiceHealthStatus } from '../../hooks/useNetworkServiceHealthCheck';

export interface NetworkHealthBannerProps {
  networkConfig: NetworkConfig;
  unhealthyServices: ServiceHealthStatus[];
}

interface ServiceCopy {
  title: string;
  description: string;
}

const SERVICE_COPY: Record<string, ServiceCopy> = {
  rpc: {
    title: 'RPC Provider Unavailable',
    description:
      'Core contract interactions (role grants, revocations, ownership transfers) require a working RPC connection. You can configure a custom RPC endpoint in the network settings.',
  },
  'access-control-indexer': {
    title: 'Indexer Unavailable — Limited Functionality',
    description:
      "Role Manager will still work, but role change history, grant timestamps, and enriched account data won't be available until the indexer is back online. You can configure a custom indexer endpoint in the network settings.",
  },
  explorer: {
    title: 'Block Explorer Unavailable',
    description:
      'Contract verification and explorer links may not work. Role management is unaffected. You can configure a custom explorer API in the network settings.',
  },
};

function getServiceCopy(serviceId: string): ServiceCopy {
  return (
    SERVICE_COPY[serviceId] ?? {
      title: 'Service Unavailable',
      description:
        'A network service is currently unreachable. Some features may be limited. You can configure an alternative endpoint in the network settings.',
    }
  );
}

/**
 * Renders warning banners for each unhealthy network service (RPC, indexer, explorer)
 * with Role Manager-specific messaging that explains the impact on available features.
 *
 * Each banner includes a CTA to open the network settings dialog where the user
 * can configure an alternative endpoint. The CTA is wired automatically through
 * the NetworkErrorContext registered by WalletConnectionWithSettings.
 */
export function NetworkHealthBanner({
  networkConfig,
  unhealthyServices,
}: NetworkHealthBannerProps): React.ReactElement | null {
  if (unhealthyServices.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {unhealthyServices.map((service) => {
        const copy = getServiceCopy(service.serviceId);
        return (
          <NetworkServiceErrorBanner
            key={service.serviceId}
            networkConfig={networkConfig}
            serviceType={service.serviceId}
            title={copy.title}
            description={copy.description}
            errorMessage={service.error}
          />
        );
      })}
    </div>
  );
}
