/**
 * Ecosystem Manager for Role Manager
 *
 * This is a local implementation adapted from the UI Builder's builder package.
 * It provides functions to dynamically load adapter packages and get network configurations.
 *
 * The UI Builder's ecosystemManager is part of the private @openzeppelin/ui-builder-builder
 * package and cannot be imported directly. This local implementation provides the
 * subset of functionality needed for the Role Manager app.
 *
 * TODO: Consider proposing extraction to a shared @openzeppelin/ui-builder-ecosystem
 * package upstream to avoid duplication across consuming applications.
 *
 * Feature: 004-add-contract-record
 */

import type { ContractAdapter, Ecosystem, NetworkConfig } from '@openzeppelin/ui-builder-types';

// =============================================================================
// Ecosystem Registry (mirrors UI Builder's ecosystemRegistry pattern)
// =============================================================================

/**
 * Metadata for each ecosystem's adapter package
 */
interface EcosystemMetadata {
  networksExportName: string;
  adapterClassName: string;
}

/**
 * Centralized configuration for each ecosystem
 * Mirrors the pattern from UI Builder's ecosystemRegistry
 */
const ecosystemRegistry: Record<Ecosystem, EcosystemMetadata> = {
  evm: {
    networksExportName: 'evmNetworks',
    adapterClassName: 'EvmAdapter',
  },
  stellar: {
    networksExportName: 'stellarNetworks',
    adapterClassName: 'StellarAdapter',
  },
  midnight: {
    networksExportName: 'midnightNetworks',
    adapterClassName: 'MidnightAdapter',
  },
  solana: {
    networksExportName: 'solanaNetworks',
    adapterClassName: 'SolanaAdapter',
  },
};

// =============================================================================
// Module Loading
// =============================================================================

/**
 * Cache for loaded networks by ecosystem
 */
const networksByEcosystemCache: Partial<Record<Ecosystem, NetworkConfig[]>> = {};

/**
 * Dynamically load the adapter package module for a given ecosystem.
 * Uses static imports for Vite compatibility.
 *
 * Note: These adapter packages are installed via the tarball workflow during
 * local development. TypeScript errors for these imports are expected if the
 * adapter packages are not yet installed - they will be resolved at runtime
 * when the packages are properly configured.
 *
 * @param ecosystem - The ecosystem to load the adapter package for
 * @returns The loaded module containing networks and adapter class
 */
async function loadAdapterPackageModule(ecosystem: Ecosystem): Promise<Record<string, unknown>> {
  // Static switch for Vite compatibility (dynamic imports require static paths)
  switch (ecosystem) {
    case 'evm':
      return import('@openzeppelin/ui-builder-adapter-evm');
    case 'stellar':
      return import('@openzeppelin/ui-builder-adapter-stellar');
    case 'solana':
    case 'midnight':
      // These adapters are not yet available in role-manager
      throw new Error(`${ecosystem} adapter is not available in role-manager`);
    default: {
      const _exhaustiveCheck: never = ecosystem;
      throw new Error(
        `Adapter package module not defined for ecosystem: ${String(_exhaustiveCheck)}`
      );
    }
  }
}

// =============================================================================
// Network Discovery
// =============================================================================

/**
 * Get all network configurations for a given ecosystem.
 * Results are cached to avoid redundant module loading.
 *
 * @param ecosystem - The ecosystem to get networks for
 * @returns Array of network configurations for the ecosystem
 */
export async function getNetworksByEcosystem(ecosystem: Ecosystem): Promise<NetworkConfig[]> {
  // Check cache first
  if (networksByEcosystemCache[ecosystem]) {
    return networksByEcosystemCache[ecosystem]!;
  }

  const meta = ecosystemRegistry[ecosystem];
  if (!meta) {
    // eslint-disable-next-line no-console -- Expected warning for debugging adapter package issues
    console.warn(`[EcosystemManager] No metadata registered for ecosystem: ${ecosystem}`);
    return [];
  }

  try {
    const module = await loadAdapterPackageModule(ecosystem);
    const networks = (module[meta.networksExportName] as NetworkConfig[]) || [];

    if (!Array.isArray(networks)) {
      // eslint-disable-next-line no-console -- Expected error for debugging adapter package issues
      console.error(
        `[EcosystemManager] Expected an array for ${meta.networksExportName} in ${ecosystem}, received: ${typeof networks}`
      );
      networksByEcosystemCache[ecosystem] = [];
      return [];
    }

    // Cache the networks
    networksByEcosystemCache[ecosystem] = networks;
    return networks;
  } catch (error) {
    // eslint-disable-next-line no-console -- Expected error for debugging adapter package issues
    console.error(`[EcosystemManager] Error loading networks for ${ecosystem}:`, error);
    networksByEcosystemCache[ecosystem] = [];
    return [];
  }
}

// =============================================================================
// Adapter Instantiation
// =============================================================================

/**
 * Get an adapter instance for a given network configuration.
 * Lazily loads the adapter package and instantiates the adapter class.
 *
 * @param networkConfig - The network configuration to create an adapter for
 * @returns A ContractAdapter instance for the network
 * @throws Error if the adapter cannot be loaded or instantiated
 */
export async function getAdapter(networkConfig: NetworkConfig): Promise<ContractAdapter> {
  const { ecosystem } = networkConfig;

  const meta = ecosystemRegistry[ecosystem];
  if (!meta) {
    throw new Error(
      `[EcosystemManager] No adapter metadata registered for ecosystem: ${ecosystem}`
    );
  }

  const module = await loadAdapterPackageModule(ecosystem);
  const AdapterClass = module[meta.adapterClassName] as
    | (new (config: NetworkConfig) => ContractAdapter)
    | undefined;

  if (!AdapterClass) {
    throw new Error(
      `[EcosystemManager] Adapter class '${meta.adapterClassName}' not found in ${ecosystem} package`
    );
  }

  return new AdapterClass(networkConfig);
}
