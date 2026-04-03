/**
 * Ecosystem Manager for Role Manager
 *
 * Two-tier loading strategy:
 * - Lightweight metadata (name, icon, description) is statically imported from
 *   each adapter's /metadata entry point. Available synchronously from the
 *   first render — no loading state for ecosystem pickers.
 * - Full ecosystem definitions are lazy-loaded only when needed.
 */

// Static metadata imports — tiny (~500 B each), available synchronously
import { ecosystemMetadata as evmMetadata } from '@openzeppelin/adapter-evm/metadata';
import { ecosystemMetadata as polkadotMetadata } from '@openzeppelin/adapter-polkadot/metadata';
import { ecosystemMetadata as stellarMetadata } from '@openzeppelin/adapter-stellar/metadata';
import type {
  Ecosystem,
  EcosystemExport,
  EcosystemMetadata,
  NetworkConfig,
  OperatorEcosystemRuntime,
  RelayerCapability,
} from '@openzeppelin/ui-types';
import { logger } from '@openzeppelin/ui-utils';

import type { RoleManagerRuntime } from '../runtimeAdapter';

// =============================================================================
// Metadata Registry (synchronous — available from first render)
// =============================================================================

const ecosystemMetadataRegistry: Partial<Record<Ecosystem, EcosystemMetadata>> = {
  evm: evmMetadata,
  stellar: stellarMetadata,
  polkadot: polkadotMetadata,
};

// =============================================================================
function attachRelayerCapability(
  runtime: OperatorEcosystemRuntime,
  relayerFactory: ((config: NetworkConfig) => RelayerCapability) | undefined
): RoleManagerRuntime {
  const runtimeWithMaybeRelayer = runtime as OperatorEcosystemRuntime & {
    relayer?: RelayerCapability;
  };

  if (runtimeWithMaybeRelayer.relayer) {
    return runtimeWithMaybeRelayer as RoleManagerRuntime;
  }

  if (!relayerFactory) {
    throw new Error(
      `Operator runtime for ${runtime.networkConfig.ecosystem} is missing relayer capability required by role-manager.`
    );
  }

  const relayer = relayerFactory(runtime.networkConfig);

  const extended = Object.create(runtime) as RoleManagerRuntime;

  Object.defineProperties(extended, {
    relayer: { value: relayer, enumerable: true, configurable: true },
    dispose: {
      value() {
        relayer.dispose();
        runtime.dispose();
      },
      enumerable: true,
      configurable: true,
      writable: true,
    },
  });

  return extended;
}

// Full Adapter Module Loading (lazy — static switch required by Vite)
// =============================================================================

const adapterPromiseCache: Partial<Record<Ecosystem, Promise<EcosystemExport>>> = {};

async function loadAdapterModule(ecosystem: Ecosystem): Promise<EcosystemExport> {
  const cached = adapterPromiseCache[ecosystem];
  if (cached) return cached;

  const promise = (async (): Promise<EcosystemExport> => {
    let mod: { ecosystemDefinition: EcosystemExport };
    switch (ecosystem) {
      case 'evm':
        mod = await import('@openzeppelin/adapter-evm');
        break;
      case 'stellar':
        mod = await import('@openzeppelin/adapter-stellar');
        break;
      case 'polkadot':
        mod = await import('@openzeppelin/adapter-polkadot');
        break;
      case 'solana':
      case 'midnight':
        throw new Error(`${ecosystem} adapter is not available in role-manager`);
      default: {
        const _exhaustiveCheck: never = ecosystem;
        throw new Error(
          `Adapter package module not defined for ecosystem: ${String(_exhaustiveCheck)}`
        );
      }
    }
    return mod.ecosystemDefinition;
  })();

  adapterPromiseCache[ecosystem] = promise;
  promise.catch(() => {
    delete adapterPromiseCache[ecosystem];
  });

  return promise;
}

// =============================================================================
// Ecosystem Metadata (synchronous — no loading required)
// =============================================================================

export function getEcosystemMetadata(ecosystem: Ecosystem): EcosystemMetadata | undefined {
  return ecosystemMetadataRegistry[ecosystem];
}

// =============================================================================
// Lightweight Network Loading (lazy — only loads network configs, not adapters)
// =============================================================================

const networksByEcosystemCache: Partial<Record<Ecosystem, NetworkConfig[]>> = {};
const networkPromiseCache: Partial<Record<Ecosystem, Promise<NetworkConfig[]>>> = {};

const SUPPORTED_ECOSYSTEMS: Ecosystem[] = ['evm', 'stellar', 'polkadot'];

/**
 * Loads only the network config array for an ecosystem. This is much lighter
 * than `loadAdapterModule` because it imports from the `/networks` subpath,
 * which only pulls in static config objects + icons — no adapter runtime,
 * wallet libraries, or SDK code.
 */
async function loadNetworksModule(ecosystem: Ecosystem): Promise<NetworkConfig[]> {
  const resolvedCache = networksByEcosystemCache[ecosystem];
  if (resolvedCache) return resolvedCache;

  const inflight = networkPromiseCache[ecosystem];
  if (inflight) return inflight;

  const promise = (async (): Promise<NetworkConfig[]> => {
    let mod: { networks: NetworkConfig[] };
    switch (ecosystem) {
      case 'evm':
        mod = await import('@openzeppelin/adapter-evm/networks');
        break;
      case 'stellar':
        mod = await import('@openzeppelin/adapter-stellar/networks');
        break;
      case 'polkadot':
        mod = await import('@openzeppelin/adapter-polkadot/networks');
        break;
      case 'solana':
      case 'midnight':
        throw new Error(`${ecosystem} adapter is not available in role-manager`);
      default: {
        const _exhaustiveCheck: never = ecosystem;
        throw new Error(`Networks module not defined for ecosystem: ${String(_exhaustiveCheck)}`);
      }
    }

    networksByEcosystemCache[ecosystem] = mod.networks;
    return mod.networks;
  })();

  networkPromiseCache[ecosystem] = promise;
  promise.catch(() => {
    delete networkPromiseCache[ecosystem];
  });

  return promise;
}

// =============================================================================
// Network Discovery
// =============================================================================

export async function getNetworksByEcosystem(ecosystem: Ecosystem): Promise<NetworkConfig[]> {
  try {
    return await loadNetworksModule(ecosystem);
  } catch (error) {
    logger.error('EcosystemManager', `Error loading networks for ${ecosystem}:`, error);
    return [];
  }
}

/**
 * Loads networks from all supported ecosystems in parallel. Uses the lightweight
 * `/networks` subpath so no full adapter modules are loaded.
 */
export async function getAllNetworks(): Promise<NetworkConfig[]> {
  const results = await Promise.allSettled(
    SUPPORTED_ECOSYSTEMS.map((eco) => getNetworksByEcosystem(eco))
  );

  const all: NetworkConfig[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') all.push(...result.value);
  }
  return all;
}

// =============================================================================
// Network Lookup
// =============================================================================

export async function getNetworkById(id: string): Promise<NetworkConfig | undefined> {
  for (const ecosystem of SUPPORTED_ECOSYSTEMS) {
    let networks = networksByEcosystemCache[ecosystem];
    if (!networks) {
      try {
        networks = await getNetworksByEcosystem(ecosystem);
      } catch {
        continue;
      }
    }
    const found = networks?.find((n) => n.id === id);
    if (found) return found;
  }

  return undefined;
}

// =============================================================================
// Adapter Instantiation
// =============================================================================

export async function getRuntime(networkConfig: NetworkConfig): Promise<RoleManagerRuntime> {
  const def = await loadAdapterModule(networkConfig.ecosystem);

  if (typeof def.createRuntime !== 'function') {
    throw new Error(
      `Ecosystem export for ${networkConfig.ecosystem} is missing createRuntime (operator profile).`
    );
  }

  const runtime = def.createRuntime('operator', networkConfig) as OperatorEcosystemRuntime;
  return attachRelayerCapability(runtime, def.capabilities?.relayer);
}

// =============================================================================
// Full Ecosystem Definition (async)
// =============================================================================

export async function getEcosystemDefinition(ecosystem: Ecosystem): Promise<EcosystemExport> {
  return loadAdapterModule(ecosystem);
}
