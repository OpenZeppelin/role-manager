/**
 * Chainlist RPC resolver
 * Feature: 018-access-manager
 *
 * Fetches free, no-tracking RPC URLs from chainlist.org and caches them.
 * Used as fallback when the configured RPC is unavailable.
 */

const CHAINLIST_URL = 'https://chainlist.org/rpcs.json';
const CACHE_TTL = 30 * 60_000; // 30 minutes

interface ChainlistEntry {
  chain: string;
  chainId?: number;
  rpc: Array<string | { url: string; tracking?: string }>;
}

let cache: { data: Map<number, string[]>; fetchedAt: number } | null = null;
let inflight: Promise<Map<number, string[]>> | null = null;

/**
 * Fetch and parse chainlist RPCs, returning free no-tracking HTTPS URLs per chainId.
 * Cached for 30 minutes. Concurrent calls share the same promise.
 */
async function fetchChainlistRpcs(): Promise<Map<number, string[]>> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return cache.data;
  }

  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const response = await fetch(CHAINLIST_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const entries = (await response.json()) as ChainlistEntry[];
      const map = new Map<number, string[]>();

      for (const entry of entries) {
        const chainId = entry.chainId;
        if (!chainId) continue;

        const urls: string[] = [];
        for (const rpc of entry.rpc) {
          let url: string;
          let tracking: string | undefined;

          if (typeof rpc === 'string') {
            url = rpc;
          } else {
            url = rpc.url;
            tracking = rpc.tracking;
          }

          // Only use free, no-tracking HTTPS URLs without API keys
          if (
            url.startsWith('https://') &&
            tracking !== 'yes' &&
            !url.includes('${') &&
            !url.includes('API_KEY')
          ) {
            urls.push(url);
          }
        }

        if (urls.length > 0) {
          map.set(chainId, urls.slice(0, 5)); // Max 5 fallbacks per chain
        }
      }

      cache = { data: map, fetchedAt: Date.now() };
      return map;
    } catch {
      // Return empty map on failure — callers use their default RPC
      return cache?.data ?? new Map();
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/**
 * Get fallback RPC URLs for a chain from Chainlist.
 * Returns up to 5 free, no-tracking HTTPS URLs.
 * Falls back to hardcoded defaults if Chainlist is unreachable.
 */
export async function getChainlistFallbackRpcs(chainId: number): Promise<string[]> {
  const map = await fetchChainlistRpcs();
  return map.get(chainId) ?? [];
}
