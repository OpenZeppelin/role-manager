/**
 * RPC Proxy Worker
 *
 * Proxies JSON-RPC requests through a Cloudflare Worker so browsers
 * never hit third-party RPC domains directly (avoiding ad-blocker and
 * CORS issues).
 *
 * Routes:  POST /:chainId
 *
 * Fallback strategy (server-side, no CORS/ad-blocker restrictions):
 *   1. Primary RPC from env var (RPC_<chainId>, e.g. RPC_1, RPC_42161)
 *   2. Chainlist public RPCs (tracking=none, cached 30 min)
 *   3. Hardcoded defaults per chain
 */

export interface Env {
  [key: string]: string | undefined;
}

// ---------------------------------------------------------------------------
// Hardcoded fallback RPCs (always available, no fetch needed)
// ---------------------------------------------------------------------------

const HARDCODED_RPCS: Record<number, string[]> = {
  1: [
    'https://eth.llamarpc.com',
    'https://rpc.ankr.com/eth',
    'https://1rpc.io/eth',
    'https://ethereum-rpc.publicnode.com',
  ],
  42161: [
    'https://arb1.arbitrum.io/rpc',
    'https://rpc.ankr.com/arbitrum',
    'https://1rpc.io/arb',
    'https://arbitrum-one-rpc.publicnode.com',
  ],
  137: [
    'https://polygon-rpc.com',
    'https://rpc.ankr.com/polygon',
    'https://1rpc.io/matic',
    'https://polygon-bor-rpc.publicnode.com',
  ],
  10: [
    'https://mainnet.optimism.io',
    'https://rpc.ankr.com/optimism',
    'https://1rpc.io/op',
    'https://optimism-rpc.publicnode.com',
  ],
  8453: [
    'https://mainnet.base.org',
    'https://base.llamarpc.com',
    'https://1rpc.io/base',
    'https://base-rpc.publicnode.com',
  ],
};

// ---------------------------------------------------------------------------
// Chainlist fetcher (cached in Worker memory + CF Cache API)
// ---------------------------------------------------------------------------

interface ChainListRpc {
  url: string;
  tracking?: string;
}

interface ChainListEntry {
  chainId: number;
  rpc: ChainListRpc[];
}

const CHAINLIST_URL = 'https://chainlist.org/rpcs.json';
const CHAINLIST_CACHE_TTL = 30 * 60; // 30 minutes
const MAX_FALLBACKS = 5;

let chainlistCache: { data: Map<number, string[]>; at: number } | null = null;

async function getChainlistRpcs(chainId: number): Promise<string[]> {
  const now = Date.now();
  if (chainlistCache && now - chainlistCache.at < CHAINLIST_CACHE_TTL * 1000) {
    return chainlistCache.data.get(chainId) ?? [];
  }

  try {
    const res = await fetch(CHAINLIST_URL, {
      cf: { cacheTtl: CHAINLIST_CACHE_TTL, cacheEverything: true },
    });
    if (!res.ok) return [];

    const entries = (await res.json()) as ChainListEntry[];
    const map = new Map<number, string[]>();

    for (const entry of entries) {
      if (!entry.chainId) continue;
      const urls = entry.rpc
        .filter(
          (r) =>
            typeof r === 'object' &&
            r.tracking === 'none' &&
            r.url.startsWith('https://') &&
            !r.url.includes('${') &&
            !r.url.includes('API_KEY')
        )
        .map((r) => r.url)
        .slice(0, MAX_FALLBACKS);
      if (urls.length > 0) map.set(entry.chainId, urls);
    }

    chainlistCache = { data: map, at: now };
    return map.get(chainId) ?? [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// RPC forwarding with fallback
// ---------------------------------------------------------------------------

async function tryRpc(url: string, body: string): Promise<Response> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

async function forwardRpc(
  chainId: number,
  body: string,
  env: Env
): Promise<Response> {
  // Build ordered RPC list: env primary → chainlist → hardcoded
  const rpcs: string[] = [];

  const envKey = `RPC_${chainId}`;
  if (env[envKey]) rpcs.push(env[envKey]!);

  const chainlistRpcs = await getChainlistRpcs(chainId);
  for (const url of chainlistRpcs) {
    if (!rpcs.includes(url)) rpcs.push(url);
  }

  const hardcoded = HARDCODED_RPCS[chainId] ?? [];
  for (const url of hardcoded) {
    if (!rpcs.includes(url)) rpcs.push(url);
  }

  if (rpcs.length === 0) {
    return new Response(
      JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: `No RPCs for chain ${chainId}` } }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let lastError: string = 'unknown';
  for (const url of rpcs) {
    try {
      const res = await tryRpc(url, body);
      // Clone and return with CORS headers
      const responseBody = await res.text();
      return new Response(responseBody, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      continue;
    }
  }

  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32000, message: `All ${rpcs.length} RPCs failed for chain ${chainId}: ${lastError}` },
    }),
    { status: 502, headers: { 'Content-Type': 'application/json' } }
  );
}

// ---------------------------------------------------------------------------
// Worker entry
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Parse chain ID from path: /:chainId
    const url = new URL(request.url);
    const chainId = parseInt(url.pathname.replace('/', ''), 10);
    if (isNaN(chainId) || chainId <= 0) {
      return new Response(
        JSON.stringify({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid chain ID in path' } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.text();
    return forwardRpc(chainId, body, env);
  },
};
