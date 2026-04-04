/**
 * Hook for accessing the AccessManager service.
 * Feature: 018-access-manager
 *
 * Creates an EvmAccessManagerService instance using resilient RPC transport
 * with weighted health scoring, adaptive failover, and Chainlist auto-expansion.
 */

import { createPublicClient } from 'viem';
import { useEffect, useRef, useState } from 'react';

import { appConfigService, userNetworkServiceConfigService } from '@openzeppelin/ui-utils';

import { EvmAccessManagerService } from '../core/ecosystems/evm/EvmAccessManagerService';
import { resilientTransport } from '../core/ecosystems/evm/resilientTransport';
import type { RoleManagerRuntime } from '../core/runtimeAdapter';
import type { AccessManagerService } from '../types/access-manager';
import { getEvmNetworkConfig } from '../utils/evm-network-config';

export interface UseAccessManagerServiceReturn {
  service: AccessManagerService | null;
  isReady: boolean;
}

/**
 * Resolve the RPC URL using the same priority as the EVM adapter's RpcResolver:
 * 1. User-configured RPC (from UserNetworkServiceConfigService)
 * 2. App-level override (from AppConfigService / VITE env)
 * 3. Default rpcUrl from network config
 */
function resolveRpcUrl(networkId: string, defaultRpcUrl: string): string {
  const userCfg = userNetworkServiceConfigService.get(networkId, 'rpc') as
    | { rpcUrl?: string }
    | undefined;
  if (userCfg?.rpcUrl) return userCfg.rpcUrl;

  const override = appConfigService.getRpcEndpointOverride(networkId);
  if (typeof override === 'string' && override) return override;
  if (override && typeof override === 'object' && 'http' in override) {
    return (override as { http: string }).http;
  }

  return defaultRpcUrl;
}

export function useAccessManagerService(
  runtime: RoleManagerRuntime | null
): UseAccessManagerServiceReturn {
  const [service, setService] = useState<AccessManagerService | null>(null);
  const runtimeRef = useRef<RoleManagerRuntime | null>(null);

  useEffect(() => {
    if (!runtime || runtime.networkConfig?.ecosystem !== 'evm') {
      setService(null);
      runtimeRef.current = null;
      return;
    }

    if (runtimeRef.current === runtime) return;
    runtimeRef.current = runtime;

    try {
      const networkConfig = getEvmNetworkConfig(runtime);
      if (!networkConfig) {
        setService(null);
        return;
      }

      const primaryRpcUrl = resolveRpcUrl(networkConfig.id, networkConfig.rpcUrl);

      const etherscanApiKey =
        (import.meta as unknown as { env?: Record<string, string> }).env
          ?.VITE_APP_CFG_SERVICE_ETHERSCANV2_API_KEY || undefined;

      const client = createPublicClient({
        transport: resilientTransport({
          chainId: networkConfig.chainId,
          rpcs: [primaryRpcUrl],
          chainlistEnabled: true,
        }),
      });

      const svc = new EvmAccessManagerService(client, null, networkConfig.chainId, etherscanApiKey);

      setService(svc);
    } catch {
      setService(null);
    }
  }, [runtime]);

  return {
    service,
    isReady: service !== null,
  };
}
