/**
 * useAsyncBatchLookup — generic hook for batch-resolving keys to values.
 *
 * Shared pattern extracted from useContractNames and useFunctionSignatures:
 * - Module-level cache with TTL
 * - Inflight request deduplication
 * - Batch fetching with concurrency limit
 * - React state merge for progressive updates
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { logger } from '@openzeppelin/ui-utils';

// =============================================================================
// Types
// =============================================================================

interface CacheEntry<V> {
  value: V | null;
  timestamp: number;
  tentative: boolean;
}

export interface BatchLookupConfig<V> {
  /** Unique name for logging */
  name: string;
  /** Default TTL for resolved entries (ms) */
  ttlMs: number;
  /** TTL for tentative/null entries (ms) */
  tentativeTtlMs: number;
  /** Max concurrent resolve operations */
  concurrency: number;
  /** Resolve a single key to a value (or null if not found) */
  resolve: (key: string) => Promise<{ value: V | null; tentative?: boolean }>;
}

// =============================================================================
// Factory — creates a cache + hook pair for a specific lookup type
// =============================================================================

export function createBatchLookup<V>(config: BatchLookupConfig<V>) {
  const cache = new Map<string, CacheEntry<V>>();
  const inflight = new Map<string, Promise<V | null>>();

  function getCached(key: string): V | null | undefined {
    const entry = cache.get(key);
    if (!entry || !entry.timestamp) {
      if (entry) cache.delete(key);
      return undefined;
    }
    const ttl = entry.tentative ? config.tentativeTtlMs : config.ttlMs;
    if (Date.now() - entry.timestamp > ttl) {
      cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  function setCache(key: string, value: V | null, tentative = false) {
    cache.set(key, { value, timestamp: Date.now(), tentative });
  }

  function clearCache() {
    cache.clear();
    inflight.clear();
  }

  async function resolveKey(key: string): Promise<V | null> {
    const cached = getCached(key);
    if (cached !== undefined) return cached;
    if (inflight.has(key)) return inflight.get(key)!;

    const promise = (async () => {
      const result = await config.resolve(key);
      setCache(key, result.value, result.tentative ?? false);
      return result.value;
    })();

    inflight.set(key, promise);
    promise.finally(() => inflight.delete(key));
    return promise;
  }

  /**
   * React hook that resolves a list of keys and returns a synchronous lookup map.
   * Updates progressively as values resolve.
   */
  function useLookup(keys: string[]): Map<string, V> {
    const [resolved, setResolved] = useState<Map<string, V>>(new Map());
    const batchRef = useRef(0);

    const uniqueKeys = useMemo(() => {
      const set = new Set<string>();
      for (const k of keys) {
        if (k && getCached(k) === undefined) set.add(k);
      }
      return Array.from(set);
    }, [keys]);

    const cachedResults = useMemo(() => {
      const map = new Map<string, V>();
      for (const k of keys) {
        if (!k) continue;
        const c = getCached(k);
        if (c) map.set(k, c);
      }
      return map;
    }, [keys]);

    useEffect(() => {
      if (uniqueKeys.length === 0) return;

      if (uniqueKeys.length > 0) {
        logger.info(config.name, `Resolving ${uniqueKeys.length} keys`);
      }

      const batchId = ++batchRef.current;
      let cancelled = false;

      (async () => {
        const results = new Map<string, V>();
        const chunks: string[][] = [];
        for (let i = 0; i < uniqueKeys.length; i += config.concurrency) {
          chunks.push(uniqueKeys.slice(i, i + config.concurrency));
        }

        for (const chunk of chunks) {
          if (cancelled || batchId !== batchRef.current) return;
          const chunkResults = await Promise.allSettled(chunk.map(resolveKey));
          for (let i = 0; i < chunk.length; i++) {
            const r = chunkResults[i];
            if (r.status === 'fulfilled' && r.value) results.set(chunk[i], r.value);
          }
        }

        if (cancelled || batchId !== batchRef.current) return;
        if (results.size > 0) {
          setResolved((prev) => {
            const next = new Map(prev);
            for (const [k, v] of results) next.set(k, v);
            return next;
          });
        }
      })().catch((err) => {
        logger.warn(config.name, 'Batch resolve failed', err);
      });

      return () => {
        cancelled = true;
      };
    }, [uniqueKeys]);

    return useMemo(() => {
      const combined = new Map(cachedResults);
      for (const [k, v] of resolved) combined.set(k, v);
      return combined;
    }, [cachedResults, resolved]);
  }

  return { useLookup, resolveKey, clearCache, getCached, setCache };
}
