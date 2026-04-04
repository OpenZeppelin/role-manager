import type { RoleManagerRuntime } from '@/core/runtimeAdapter';

/**
 * Explorer URL Utilities
 *
 * Chain-agnostic helper functions for generating block explorer URLs.
 * These delegate to the runtime's explorer capability to handle different
 * URL patterns across chains (EVM, Stellar, etc.).
 */

/**
 * Function type for generating explorer URLs.
 * Used by transformers to generate URLs without direct runtime dependency.
 */
export type GetExplorerUrlFn = (value: string) => string | null;

/**
 * Create a function that generates transaction explorer URLs using the runtime.
 *
 * Uses runtime.explorer.getExplorerTxUrl() when available. Falls back to deriving
 * the tx URL from runtime.explorer.getExplorerUrl() by replacing the /address/ segment
 * with /tx/, which works for all standard block explorers (Etherscan, Blockscout, etc.).
 *
 * @param runtime - The runtime instance (or null if not available)
 * @returns A function that takes a transaction hash and returns the explorer URL
 *
 * @example
 * ```typescript
 * const getTransactionUrl = createGetTransactionUrl(runtime);
 * const url = getTransactionUrl('0x123...'); // "https://etherscan.io/tx/0x123..."
 * ```
 */
export function createGetTransactionUrl(runtime: RoleManagerRuntime | null): GetExplorerUrlFn {
  return (txHash: string): string | null => {
    if (!runtime || !txHash) return null;

    // Primary: use the runtime's dedicated tx URL method
    const directUrl = runtime.explorer.getExplorerTxUrl?.(txHash);
    if (directUrl) return directUrl;

    // Fallback: derive from address explorer URL pattern
    // getExplorerUrl("0x0") → "https://etherscan.io/address/0x0"
    // Replace /address/0x0 with /tx/{txHash}
    const probeUrl = runtime.explorer.getExplorerUrl?.(
      '0x0000000000000000000000000000000000000000'
    );
    if (probeUrl) {
      const addressSegment = '/address/0x0000000000000000000000000000000000000000';
      if (probeUrl.includes(addressSegment)) {
        return probeUrl.replace(addressSegment, `/tx/${txHash}`);
      }
    }

    return null;
  };
}

/**
 * Create a function that generates account/address explorer URLs using the runtime.
 *
 * @example
 * ```typescript
 * const getAccountUrl = createGetAccountUrl(runtime);
 * const url = getAccountUrl('0xabc...'); // "https://etherscan.io/address/0xabc..."
 * ```
 */
export function createGetAccountUrl(runtime: RoleManagerRuntime | null): GetExplorerUrlFn {
  return (address: string): string | null => {
    if (!runtime) return null;
    return runtime.explorer.getExplorerUrl?.(address) ?? null;
  };
}
