/**
 * Explorer URL Utilities
 *
 * Chain-agnostic helper functions for generating block explorer URLs.
 * These delegate to the adapter's explorer methods to handle different
 * URL patterns across chains (EVM, Stellar, etc.).
 */

import type { ContractAdapter } from '@openzeppelin/ui-types';

/**
 * Function type for generating explorer URLs.
 * Used by transformers to generate URLs without direct adapter dependency.
 */
export type GetExplorerUrlFn = (value: string) => string | null;

/**
 * Create a function that generates transaction explorer URLs using the adapter.
 *
 * @param adapter - The contract adapter (or null if not available)
 * @returns A function that takes a transaction hash and returns the explorer URL
 *
 * @example
 * ```typescript
 * const getTransactionUrl = createGetTransactionUrl(adapter);
 * const url = getTransactionUrl('0x123...'); // "https://etherscan.io/tx/0x123..."
 * ```
 */
export function createGetTransactionUrl(adapter: ContractAdapter | null): GetExplorerUrlFn {
  return (txHash: string): string | null => {
    if (!adapter) return null;
    return adapter.getExplorerTxUrl?.(txHash) ?? null;
  };
}

/**
 * Create a function that generates account/address explorer URLs using the adapter.
 *
 * @param adapter - The contract adapter (or null if not available)
 * @returns A function that takes an address and returns the explorer URL
 *
 * @example
 * ```typescript
 * const getAccountUrl = createGetAccountUrl(adapter);
 * const url = getAccountUrl('0xabc...'); // "https://etherscan.io/address/0xabc..."
 * ```
 */
export function createGetAccountUrl(adapter: ContractAdapter | null): GetExplorerUrlFn {
  return (address: string): string | null => {
    if (!adapter) return null;
    return adapter.getExplorerUrl?.(address) ?? null;
  };
}
