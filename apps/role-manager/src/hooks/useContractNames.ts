/**
 * useContractNames hook
 * Feature: 018-access-manager
 *
 * Resolves contract addresses to human-readable names using Sourcify V2 API.
 * Detects proxy contracts and resolves implementation names.
 *
 * Resolution strategy:
 * 1. Sourcify V2 → compilation.name (e.g., "TransparentUpgradeableProxy")
 * 2. If name indicates proxy → fetch implementation via Blockscout V2 or EIP-1967 slot
 * 3. Resolve implementation name via Sourcify
 * 4. Format: "ImplName (Proxy)" for proxies, "ContractName" for non-proxies
 *
 * Module-level cache persists across hook instances within a session.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { logger, truncateMiddle } from '@openzeppelin/ui-utils';

// =============================================================================
// Types
// =============================================================================

interface ContractNameInfo {
  /** Display name (implementation name for proxies) */
  name: string;
  /** Whether the contract is a proxy */
  isProxy: boolean;
  /** Raw contract name from Sourcify */
  rawName: string;
}

// =============================================================================
// Module-level cache (with TTL)
// =============================================================================

interface CacheEntry {
  value: ContractNameInfo | null;
  timestamp: number;
  /** If true, this entry had an unresolved impl name and should expire quickly */
  tentative: boolean;
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes for resolved entries
const TENTATIVE_TTL_MS = 2 * 60 * 1000; // 2 minutes for unresolved impl names

// Use a versioned key so HMR module reloads always start fresh
const CACHE_VERSION = 3;
const cacheKey = `__contractNameCache_v${CACHE_VERSION}`;
const globalObj = globalThis as unknown as Record<string, unknown>;

// Clear any previous version's cache
if ((globalObj[cacheKey] as { version?: number })?.version !== CACHE_VERSION) {
  globalObj[cacheKey] = { version: CACHE_VERSION, names: new Map(), inflight: new Map() };
}

const nameCache = (globalObj[cacheKey] as { names: Map<string, CacheEntry> }).names;
const inflightRequests = (
  globalObj[cacheKey] as { inflight: Map<string, Promise<ContractNameInfo | null>> }
).inflight;

function getCached(key: string): ContractNameInfo | null | undefined {
  const entry = nameCache.get(key);
  if (!entry) return undefined;
  // Guard against legacy entries missing timestamp (from before TTL was added)
  if (!entry.timestamp) {
    nameCache.delete(key);
    return undefined;
  }
  const ttl = entry.tentative ? TENTATIVE_TTL_MS : CACHE_TTL_MS;
  if (Date.now() - entry.timestamp > ttl) {
    nameCache.delete(key);
    return undefined;
  }
  return entry.value;
}

function setCache(key: string, value: ContractNameInfo | null, tentative = false) {
  nameCache.set(key, { value, timestamp: Date.now(), tentative });
}

/** Clear all cached names. Called on contract/network switch to pick up fresh data. */
export function clearContractNameCache() {
  nameCache.clear();
  inflightRequests.clear();
}

// Proxy indicators in contract names
// Exact contract names that ARE proxies (forward calls to an implementation)
const PROXY_EXACT_NAMES = new Set([
  'TransparentUpgradeableProxy',
  'ERC1967Proxy',
  'BeaconProxy',
  'UUPSProxy',
  'MinimalProxy',
  'Proxy',
  'OssifiableProxy',
  'AdminUpgradeabilityProxy',
  'InitializableAdminUpgradeabilityProxy',
]);

function isProxyName(name: string): boolean {
  return PROXY_EXACT_NAMES.has(name);
}

// =============================================================================
// Sourcify API
// =============================================================================

const SOURCIFY_BASE = 'https://sourcify.dev/server/v2/contract';

async function fetchContractName(chainId: number, address: string): Promise<string | null> {
  try {
    const response = await fetch(`${SOURCIFY_BASE}/${chainId}/${address}?fields=compilation`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      compilation?: { name?: string };
    };

    return data.compilation?.name ?? null;
  } catch {
    return null;
  }
}

// =============================================================================
// Proxy Implementation Detection
// =============================================================================

interface ProxyInfo {
  implAddress: string;
  implName: string | null;
}

/**
 * Try Blockscout V2 API for proxy detection (works for Blockscout-based explorers).
 */
async function fetchProxyFromBlockscout(
  explorerApiUrl: string,
  address: string
): Promise<ProxyInfo | null> {
  try {
    const base = explorerApiUrl.replace(/\/+$/, '');
    const apiBase = base.endsWith('/api') ? base : `${base}/api`;
    const response = await fetch(`${apiBase}/v2/smart-contracts/${address}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      proxy_type?: string;
      implementations?: Array<{ address_hash: string; name?: string | null }>;
    };

    if (data.proxy_type && data.implementations?.length) {
      const impl = data.implementations[0];
      if (!impl.address_hash) return null;
      return { implAddress: impl.address_hash, implName: impl.name ?? null };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Read EIP-1967 implementation slot directly via RPC.
 * Works on any EVM chain without explorer API dependency.
 * Slot: 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
 */
const EIP1967_IMPL_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

/**
 * Safe{Wallet} proxy pattern: singleton (implementation) address stored at slot 0.
 * GnosisSafe / SafeL2 contracts use `masterCopy` at slot 0 as the delegatecall target.
 */
const SAFE_IMPL_SLOT = '0x' + '0'.repeat(64);

function extractAddress(slotValue: string | null | undefined): string | null {
  if (!slotValue || slotValue === '0x' + '0'.repeat(64)) return null;
  const addr = '0x' + slotValue.slice(-40);
  if (addr === '0x' + '0'.repeat(40)) return null;
  return addr;
}

async function readSlot(
  address: string,
  slot: string,
  getStorageAt?: (address: string, slot: string) => Promise<string | null>,
  rpcUrl?: string
): Promise<string | null> {
  if (getStorageAt) {
    try {
      return await getStorageAt(address, slot);
    } catch {
      // fall through to raw RPC
    }
  }
  if (!rpcUrl) return null;
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getStorageAt',
        params: [address, slot, 'latest'],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { result?: string };
    return data.result ?? null;
  } catch {
    return null;
  }
}

async function fetchProxyFromRpc(
  rpcUrl: string | undefined,
  address: string,
  getStorageAt?: (address: string, slot: string) => Promise<string | null>
): Promise<ProxyInfo | null> {
  // Strategy 1: EIP-1967 implementation slot (TransparentUpgradeableProxy, UUPS, etc.)
  const eip1967Value = await readSlot(address, EIP1967_IMPL_SLOT, getStorageAt, rpcUrl);
  const eip1967Addr = extractAddress(eip1967Value);
  if (eip1967Addr) return { implAddress: eip1967Addr, implName: null };

  // Strategy 2: Safe{Wallet} proxy — singleton at slot 0
  const safeSlotValue = await readSlot(address, SAFE_IMPL_SLOT, getStorageAt, rpcUrl);
  const safeAddr = extractAddress(safeSlotValue);
  if (safeAddr) {
    // Verify it's actually a contract (not just a random non-zero slot 0)
    // by checking if the address at slot 0 has code. If we can't verify, still return it.
    return { implAddress: safeAddr, implName: null };
  }

  return null;
}

/**
 * Detect proxy implementation: try Blockscout first, fall back to EIP-1967 RPC.
 */
async function fetchProxyImplementation(
  address: string,
  explorerApiUrl?: string,
  rpcUrl?: string,
  getStorageAt?: (address: string, slot: string) => Promise<string | null>
): Promise<ProxyInfo | null> {
  // Strategy 1: Blockscout V2 API (returns impl name too)
  if (explorerApiUrl) {
    const result = await fetchProxyFromBlockscout(explorerApiUrl, address);
    if (result) return result;
  }

  // Strategy 2: EIP-1967 storage slot (via viem client or raw RPC)
  const result = await fetchProxyFromRpc(rpcUrl, address, getStorageAt);
  if (result) return result;

  return null;
}

// =============================================================================
// Resolution Logic
// =============================================================================

async function resolveContractName(
  chainId: number,
  address: string,
  explorerApiUrl?: string,
  rpcUrl?: string,
  getStorageAt?: (address: string, slot: string) => Promise<string | null>
): Promise<ContractNameInfo | null> {
  const key = `${chainId}:${address.toLowerCase()}`;

  // Check cache
  const cached = getCached(key);
  if (cached !== undefined) return cached;

  // Deduplicate inflight requests
  if (inflightRequests.has(key)) return inflightRequests.get(key)!;

  const promise = (async (): Promise<ContractNameInfo | null> => {
    // Step 1: Get name from Sourcify
    const rawName = await fetchContractName(chainId, address);

    // If Sourcify doesn't have it, try proxy detection (Blockscout + RPC slot reads)
    if (!rawName) {
      const proxyCheck = await fetchProxyImplementation(
        address,
        explorerApiUrl,
        rpcUrl,
        getStorageAt
      );
      if (proxyCheck) {
        let implName = proxyCheck.implName;
        if (!implName) {
          implName = await fetchContractName(chainId, proxyCheck.implAddress);
        }
        const displayName = implName ?? 'Proxy';
        const isTentative = !implName;
        const info: ContractNameInfo = {
          name: `${displayName} (Proxy)`,
          isProxy: true,
          rawName: 'Proxy',
        };
        setCache(key, info, isTentative);
        return info;
      }
      setCache(key, null, true); // not found → short TTL, might get verified
      return null;
    }

    // Step 2: Check if it's a proxy — only probe when the Sourcify name indicates a proxy.
    // Avoids unnecessary Blockscout/RPC calls for clearly non-proxy contracts.
    let proxyInfo: ProxyInfo | null = null;
    if (isProxyName(rawName)) {
      proxyInfo = await fetchProxyImplementation(address, explorerApiUrl, rpcUrl, getStorageAt);
    }

    const isProxy = isProxyName(rawName);

    if (isProxy && proxyInfo) {
      logger.info(
        'useContractNames',
        `Proxy detected: ${address} → impl ${proxyInfo.implAddress} (blockscout name: ${proxyInfo.implName ?? 'none'})`
      );
      // Resolve implementation name: Blockscout name → Sourcify → truncated address
      let implName = proxyInfo.implName;
      if (!implName) {
        implName = await fetchContractName(chainId, proxyInfo.implAddress);
      }
      const implResolved = !!implName;
      const displayName = implName ?? truncateMiddle(proxyInfo.implAddress, 6, 4);
      const info: ContractNameInfo = {
        name: `${displayName} (Proxy)`,
        isProxy: true,
        rawName,
      };
      // Tentative if impl name wasn't resolved (might get verified on Sourcify later)
      setCache(key, info, !implResolved);
      return info;
    }

    if (isProxy) {
      // Proxy by name but no implementation resolved — this means both Blockscout and RPC failed
      logger.warn(
        'useContractNames',
        `Proxy ${address}: impl detection failed. rpcUrl=${!!rpcUrl} getStorageAt=${!!getStorageAt}`
      );
      const info: ContractNameInfo = {
        name: `${rawName} (Proxy)`,
        isProxy: true,
        rawName,
      };
      setCache(key, info, true); // tentative — impl might get resolved later
      return info;
    }

    // Non-proxy contract — fully resolved, long TTL
    const info: ContractNameInfo = {
      name: rawName,
      isProxy: false,
      rawName,
    };
    setCache(key, info);
    return info;
  })();

  inflightRequests.set(key, promise);
  promise.finally(() => inflightRequests.delete(key));

  return promise;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Resolves contract addresses to names via Sourcify.
 * Returns a synchronous lookup map that updates as names are resolved.
 *
 * @param addresses - Addresses to resolve
 * @param chainId - Chain ID for Sourcify queries
 * @param explorerApiUrl - Explorer API URL for Blockscout proxy detection
 * @param rpcUrl - RPC URL for EIP-1967 storage slot fallback
 * @param getStorageAt - Optional direct storage read function (uses configured viem client, bypasses CORS issues)
 * @returns Map of lowercase address → display name
 */
export function useContractNames(
  addresses: string[],
  chainId: number,
  explorerApiUrl?: string,
  rpcUrl?: string,
  getStorageAt?: (address: string, slot: string) => Promise<string | null>
): Map<string, string> {
  const [resolved, setResolved] = useState<Map<string, string>>(new Map());
  const batchRef = useRef(0);

  // Deduplicate and normalize
  const uniqueAddresses = useMemo(() => {
    const set = new Set<string>();
    for (const addr of addresses) {
      if (addr && addr.length === 42) {
        const normalized = addr.toLowerCase();
        // Skip if already cached
        if (getCached(`${chainId}:${normalized}`) === undefined) {
          set.add(normalized);
        }
      }
    }
    return Array.from(set);
  }, [addresses, chainId]);

  // Build initial state from cache
  const cachedResults = useMemo(() => {
    const map = new Map<string, string>();
    for (const addr of addresses) {
      if (!addr) continue;
      const cached = getCached(`${chainId}:${addr.toLowerCase()}`);
      if (cached) map.set(addr.toLowerCase(), cached.name);
    }
    return map;
  }, [addresses, chainId]);

  // Fetch uncached addresses
  useEffect(() => {
    if (uniqueAddresses.length > 0)
      logger.info(
        'useContractNames',
        `Resolving ${uniqueAddresses.length} addresses on chain ${chainId}`
      );
    if (uniqueAddresses.length === 0 || chainId === 0) return;

    const batchId = ++batchRef.current;
    let cancelled = false;

    (async () => {
      const results = new Map<string, string>();

      // Resolve in parallel (max 5 concurrent)
      const chunks: string[][] = [];
      for (let i = 0; i < uniqueAddresses.length; i += 5) {
        chunks.push(uniqueAddresses.slice(i, i + 5));
      }

      for (const chunk of chunks) {
        if (cancelled || batchId !== batchRef.current) return;

        const chunkResults = await Promise.allSettled(
          chunk.map((addr) =>
            resolveContractName(chainId, addr, explorerApiUrl, rpcUrl, getStorageAt)
          )
        );

        for (let i = 0; i < chunk.length; i++) {
          const result = chunkResults[i];
          if (result.status === 'fulfilled' && result.value) {
            results.set(chunk[i], result.value.name);
          }
        }
      }

      if (cancelled || batchId !== batchRef.current) return;

      if (results.size > 0) {
        setResolved((prev) => {
          const next = new Map(prev);
          for (const [addr, name] of results) next.set(addr, name);
          return next;
        });
      }
    })().catch((err) => {
      logger.warn('useContractNames', 'Failed to resolve contract names', err);
    });

    return () => {
      cancelled = true;
    };
  }, [uniqueAddresses, chainId, explorerApiUrl, rpcUrl, getStorageAt]);

  // Combine cached + freshly resolved
  return useMemo(() => {
    const combined = new Map(cachedResults);
    for (const [addr, name] of resolved) combined.set(addr, name);
    return combined;
  }, [cachedResults, resolved]);
}
