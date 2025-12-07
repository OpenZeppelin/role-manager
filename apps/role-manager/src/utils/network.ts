/**
 * Network utility functions
 * Feature: 009-roles-page-data
 *
 * Utilities for formatting and working with network configurations.
 */

import type { NetworkConfig } from '@openzeppelin/ui-builder-types';

/**
 * Formats a network configuration into a human-readable display name.
 *
 * @param network - The network configuration object
 * @returns Formatted display name like "Stellar Testnet (testnet)" or empty string if no network
 *
 * @example
 * ```ts
 * const network = { name: 'Stellar Testnet', type: 'testnet', ... };
 * getNetworkDisplayName(network); // "Stellar Testnet (testnet)"
 *
 * getNetworkDisplayName(null); // ""
 * getNetworkDisplayName(undefined); // ""
 * ```
 */
export function getNetworkDisplayName(network: NetworkConfig | null | undefined): string {
  if (!network) {
    return '';
  }

  return `${network.name} (${network.type})`;
}
