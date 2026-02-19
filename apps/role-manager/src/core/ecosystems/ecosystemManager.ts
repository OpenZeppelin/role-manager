/**
 * Ecosystem Manager for Role Manager
 *
 * Two-tier loading strategy:
 * - Lightweight metadata (name, icon, description) is statically imported from
 *   each adapter's /metadata entry point. Available synchronously from the
 *   first render — no loading state for ecosystem pickers.
 * - Full adapter (networks, createAdapter) is lazy-loaded only when needed.
 */

// Static metadata imports — tiny (~500 B each), available synchronously
import { ecosystemMetadata as evmMetadata } from '@openzeppelin/ui-builder-adapter-evm/metadata';
import { ecosystemMetadata as polkadotMetadata } from '@openzeppelin/ui-builder-adapter-polkadot/metadata';
import { ecosystemMetadata as stellarMetadata } from '@openzeppelin/ui-builder-adapter-stellar/metadata';
import type {
  ContractAdapter,
  Ecosystem,
  EcosystemExport,
  EcosystemMetadata,
  NetworkConfig,
} from '@openzeppelin/ui-types';
import { logger } from '@openzeppelin/ui-utils';

// =============================================================================
// Metadata Registry (synchronous — available from first render)
// =============================================================================

const ecosystemMetadataRegistry: Partial<Record<Ecosystem, EcosystemMetadata>> = {
  evm: evmMetadata,
  stellar: stellarMetadata,
  polkadot: polkadotMetadata,
};

// =============================================================================
// Full Adapter Module Loading (lazy — static switch required by Vite)
// =============================================================================

const ecosystemCache: Partial<Record<Ecosystem, EcosystemExport>> = {};

async function loadAdapterModule(ecosystem: Ecosystem): Promise<EcosystemExport> {
  const cached = ecosystemCache[ecosystem];
  if (cached) return cached;

  let mod: { ecosystemDefinition: EcosystemExport };
  switch (ecosystem) {
    case 'evm':
      mod = await import('@openzeppelin/ui-builder-adapter-evm');
      break;
    case 'stellar':
      mod = await import('@openzeppelin/ui-builder-adapter-stellar');
      break;
    case 'polkadot':
      mod = await import('@openzeppelin/ui-builder-adapter-polkadot');
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

  const def = mod.ecosystemDefinition;
  ecosystemCache[ecosystem] = def;
  return def;
}

// =============================================================================
// Ecosystem Metadata (synchronous — no loading required)
// =============================================================================

export function getEcosystemMetadata(ecosystem: Ecosystem): EcosystemMetadata | undefined {
  return ecosystemMetadataRegistry[ecosystem];
}

// =============================================================================
// Network Discovery
// =============================================================================

const networksByEcosystemCache: Partial<Record<Ecosystem, NetworkConfig[]>> = {};

export async function getNetworksByEcosystem(ecosystem: Ecosystem): Promise<NetworkConfig[]> {
  if (networksByEcosystemCache[ecosystem]) {
    return networksByEcosystemCache[ecosystem]!;
  }

  try {
    const def = await loadAdapterModule(ecosystem);
    const networks = def.networks;
    if (!Array.isArray(networks)) {
      logger.error(
        'EcosystemManager',
        `Expected an array of networks for ${ecosystem}, received: ${typeof networks}`
      );
      networksByEcosystemCache[ecosystem] = [];
      return [];
    }
    networksByEcosystemCache[ecosystem] = networks;
    return networks;
  } catch (error) {
    logger.error('EcosystemManager', `Error loading networks for ${ecosystem}:`, error);
    networksByEcosystemCache[ecosystem] = [];
    return [];
  }
}

// =============================================================================
// Network Lookup
// =============================================================================

export async function getNetworkById(id: string): Promise<NetworkConfig | undefined> {
  for (const ecosystemKey of Object.keys(networksByEcosystemCache)) {
    const ecosystem = ecosystemKey as Ecosystem;
    const cached = networksByEcosystemCache[ecosystem];
    if (cached) {
      const network = cached.find((n) => n.id === id);
      if (network) return network;
    }
  }

  const allEcosystems: Ecosystem[] = ['evm', 'stellar', 'polkadot', 'solana', 'midnight'];
  for (const ecosystem of allEcosystems) {
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

export async function getAdapter(networkConfig: NetworkConfig): Promise<ContractAdapter> {
  const def = await loadAdapterModule(networkConfig.ecosystem);
  return def.createAdapter(networkConfig);
}

// =============================================================================
// Full Ecosystem Definition (async)
// =============================================================================

export async function getEcosystemDefinition(ecosystem: Ecosystem): Promise<EcosystemExport> {
  return loadAdapterModule(ecosystem);
}
