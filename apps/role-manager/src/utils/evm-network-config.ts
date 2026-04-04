/**
 * Utility for extracting EVM-specific fields from a generic NetworkConfig.
 * Avoids repetitive inline casts across hooks and contexts.
 */

import type { RoleManagerRuntime } from '../core/runtimeAdapter';

export interface EvmNetworkConfig {
  chainId: number;
  rpcUrl: string;
  explorerUrl?: string;
  apiUrl?: string;
  id: string;
}

/**
 * Extract EVM-specific network config from an adapter.
 * Returns null if the adapter is not available.
 */
export function getEvmNetworkConfig(runtime: RoleManagerRuntime | null): EvmNetworkConfig | null {
  if (!runtime) return null;
  const cfg = runtime.networkConfig as Partial<EvmNetworkConfig> | undefined;
  if (!cfg?.chainId || !cfg?.rpcUrl) return null;
  return {
    chainId: cfg.chainId,
    rpcUrl: cfg.rpcUrl,
    explorerUrl: cfg.explorerUrl,
    apiUrl: cfg.apiUrl,
    id: cfg.id ?? '',
  };
}
