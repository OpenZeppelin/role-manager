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
 * @example
 * ```typescript
 * const getTransactionUrl = createGetTransactionUrl(runtime);
 * const url = getTransactionUrl('0x123...'); // "https://etherscan.io/tx/0x123..."
 * ```
 */
export function createGetTransactionUrl(runtime: RoleManagerRuntime | null): GetExplorerUrlFn {
  return (txHash: string): string | null => {
    if (!runtime) return null;
    return runtime.explorer.getExplorerTxUrl?.(txHash) ?? null;
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
