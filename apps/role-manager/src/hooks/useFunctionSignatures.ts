/**
 * useFunctionSignatures hook
 * Feature: 018-access-manager
 *
 * Batch-resolves 4-byte function selectors to human-readable signatures
 * using the Sourcify 4byte API. Uses the shared createBatchLookup pattern.
 */

import { logger } from '@openzeppelin/ui-utils';

import { createBatchLookup } from './useAsyncBatchLookup';

// =============================================================================
// Types
// =============================================================================

interface FourByteResult {
  name: string;
  filtered: boolean;
  hasVerifiedContract: boolean;
}

interface FourByteLookupResponse {
  ok: boolean;
  result: {
    function: Record<string, FourByteResult[] | null>;
  };
}

// =============================================================================
// API
// =============================================================================

const FOURBYTE_API_BASE = 'https://api.4byte.sourcify.dev';

/**
 * Fetch a single function signature from 4byte API.
 */
async function fetchSignature(selector: string): Promise<string | null> {
  try {
    const response = await fetch(
      `${FOURBYTE_API_BASE}/signature-database/v1/lookup?function=${selector}&filter=true`
    );
    if (!response.ok) return null;

    const data = (await response.json()) as FourByteLookupResponse;
    if (!data.ok || !data.result?.function) return null;

    const matches = data.result.function[selector];
    if (!matches || matches.length === 0) return null;

    const best = matches.find((m) => m.hasVerifiedContract) ?? matches[0];
    return best.name;
  } catch (err) {
    logger.warn('useFunctionSignatures', 'Failed to fetch from 4byte API', err);
    return null;
  }
}

// =============================================================================
// Batch Lookup Instance
// =============================================================================

const signatureLookup = createBatchLookup<string>({
  name: 'useFunctionSignatures',
  ttlMs: 60 * 60 * 1000, // 1 hour — selectors are immutable
  tentativeTtlMs: 5 * 60 * 1000, // 5 min for not-found
  concurrency: 5,
  resolve: async (selector) => {
    const value = await fetchSignature(selector);
    return { value, tentative: !value };
  },
});

// =============================================================================
// Hook
// =============================================================================

/**
 * Resolves function selectors to human-readable signatures.
 *
 * @param selectors - Array of 4-byte selectors (e.g., ["0xa9059cbb"])
 * @returns Map of selector → resolved name (e.g., "transfer(address,uint256)")
 */
export function useFunctionSignatures(selectors: string[]): Map<string, string> {
  const normalized = selectors.map((s) => s.toLowerCase());
  return signatureLookup.useLookup(normalized);
}

/**
 * Extract just the function name (before the parentheses) for compact display.
 */
export function getShortFunctionName(signature: string): string {
  const parenIndex = signature.indexOf('(');
  return parenIndex > 0 ? signature.slice(0, parenIndex) : signature;
}
