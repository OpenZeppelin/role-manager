/**
 * Resilient RPC Transport for viem
 * Adapted from rise-bridge's resilient RPC client (api/pkg/rpc/resilient/)
 *
 * Features:
 * - Weighted endpoint scoring (0-100) based on success rate, latency, rate-limit status
 * - Adaptive failover with exponential backoff
 * - Chainlist auto-expansion when all endpoints degrade
 * - Error classification: permanent (stop) vs transient (retry)
 * - Sliding window health tracking (60s, 100 samples)
 */

import { http, type Transport, type TransportConfig } from 'viem';

import { getChainlistFallbackRpcs } from './chainlistRpc';

// =============================================================================
// Types
// =============================================================================

interface Sample {
  at: number; // Date.now()
  latencyMs: number;
  ok: boolean;
}

interface ResilientEndpoint {
  url: string;
  source: 'static' | 'chainlist';
  score: number;
  samples: Sample[];
  rateLimitedUntil: number; // 0 = not limited
  rateLimitBackoff: number; // Current backoff ms for rate limits
  lastUsedAt: number;
}

type ErrorClass = 'permanent' | 'transient' | 'rate-limit' | 'endpoint-dead';

export interface ResilientTransportConfig {
  chainId: number;
  rpcs?: string[];
  chainlistEnabled?: boolean;
  maxRetries?: number;
  maxRetryMs?: number;
}

// =============================================================================
// Constants
// =============================================================================

/** Default max retries — higher than typical because public RPCs are flaky */
const DEFAULT_MAX_RETRIES = 6;
/** Default max total retry time */
const DEFAULT_MAX_RETRY_MS = 60_000;

const WINDOW_MS = 60_000;
const MAX_SAMPLES = 100;
const MAX_POOL_SIZE = 10;
const DEGRADED_THRESHOLD = 30; // Trigger chainlist expansion below this
const INITIAL_BACKOFF_MS = 200;
const MAX_BACKOFF_MS = 30_000;
const RATE_LIMIT_INITIAL_MS = 1_000;
const RATE_LIMIT_MAX_MS = 60_000;
const PRUNE_INTERVAL_MS = 60_000;
const STALE_CHAINLIST_MS = 5 * 60_000; // 5 minutes unused

// =============================================================================
// Error Classification (from rise-bridge evmerr)
// =============================================================================

const PERMANENT_PATTERNS = [
  'execution reverted',
  'insufficient funds',
  'insufficient balance',
  'nonce too low',
  'nonce too high',
  'intrinsic gas too low',
  'gas too low',
  'already known',
  'replacement transaction underpriced',
  'tip higher than fee cap',
];

const RATE_LIMIT_PATTERNS = [
  'rate limit',
  'too many requests',
  '429',
  '402',
  'payment required',
  'exceeded',
  'throttl',
];

const TRANSIENT_PATTERNS = [
  'connection refused',
  'connection reset',
  'timeout',
  'econnrefused',
  'enotfound',
  'enetunreach',
  'fetch failed',
  'network error',
  'aborted',
  'not supported',
  'method not found',
  'not whitelisted',
  'block range',
  'exceeds the limit',
  'too large',
  'request too large',
];

/** Errors that mean this specific endpoint will NEVER work (DNS, blocked, CORS) */
const ENDPOINT_DEAD_PATTERNS = [
  'err_name_not_resolved',
  'err_blocked_by_client',
  'err_connection_refused',
  'cors',
  'net::err_',
  'dns',
];

function classifyError(error: unknown): ErrorClass {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();

  // Check endpoint-dead first — these endpoints should be evicted
  for (const p of ENDPOINT_DEAD_PATTERNS) {
    if (msg.includes(p)) return 'endpoint-dead';
  }

  for (const p of PERMANENT_PATTERNS) {
    if (msg.includes(p)) return 'permanent';
  }
  for (const p of RATE_LIMIT_PATTERNS) {
    if (msg.includes(p)) return 'rate-limit';
  }
  for (const p of TRANSIENT_PATTERNS) {
    if (msg.includes(p)) return 'transient';
  }

  // HTTP status codes in error
  if (/\b(429|402|503|502|504)\b/.test(msg)) return 'rate-limit';

  // Default: transient (retry)
  return 'transient';
}

// =============================================================================
// Endpoint Scoring (from rise-bridge resilient/endpoint.go)
// =============================================================================

function pruneWindow(ep: ResilientEndpoint, now: number): void {
  const cutoff = now - WINDOW_MS;
  while (ep.samples.length > 0 && ep.samples[0].at < cutoff) {
    ep.samples.shift();
  }
  if (ep.samples.length > MAX_SAMPLES) {
    ep.samples = ep.samples.slice(-MAX_SAMPLES);
  }
}

function scoreEndpoint(ep: ResilientEndpoint, now: number): number {
  pruneWindow(ep, now);

  let score = 100;

  // Error rate penalty: -5 per error (max -40)
  const errors = ep.samples.filter((s) => !s.ok).length;
  score -= Math.min(errors * 5, 40);

  // Latency penalty: -1 per 100ms avg (max -30)
  const okSamples = ep.samples.filter((s) => s.ok);
  if (okSamples.length > 0) {
    const avgLatency = okSamples.reduce((sum, s) => sum + s.latencyMs, 0) / okSamples.length;
    score -= Math.min(Math.floor(avgLatency / 100), 30);
  }

  // Rate limit penalty: -50 if currently rate-limited
  if (ep.rateLimitedUntil > now) {
    score -= 50;
  }

  return Math.max(score, 1); // Min 1 for recovery probing
}

// =============================================================================
// Endpoint Selection (from rise-bridge resilient/pool.go)
// =============================================================================

function selectEndpoint(pool: ResilientEndpoint[], now: number): ResilientEndpoint {
  // Update scores
  for (const ep of pool) {
    ep.score = scoreEndpoint(ep, now);
  }

  // Weighted random selection
  let totalWeight = 0;
  const weights: number[] = [];

  for (const ep of pool) {
    let w = ep.score;
    if (ep.rateLimitedUntil > now) {
      w *= 0.05; // 95% reduction but not zero
    }
    w = Math.max(w, 0.1);
    weights.push(w);
    totalWeight += w;
  }

  let rand = Math.random() * totalWeight;
  for (let i = 0; i < pool.length; i++) {
    rand -= weights[i];
    if (rand <= 0) return pool[i];
  }

  return pool[pool.length - 1]; // Fallback
}

function recordSample(ep: ResilientEndpoint, ok: boolean, latencyMs: number): void {
  ep.samples.push({ at: Date.now(), latencyMs, ok });
  ep.lastUsedAt = Date.now();
  if (ep.samples.length > MAX_SAMPLES) {
    ep.samples.shift();
  }
}

// =============================================================================
// Pool Management
// =============================================================================

function allDegraded(pool: ResilientEndpoint[], now: number): boolean {
  return pool.every((ep) => scoreEndpoint(ep, now) < DEGRADED_THRESHOLD);
}

function pruneStaleChainlist(pool: ResilientEndpoint[], now: number): ResilientEndpoint[] {
  return pool.filter((ep) => {
    if (ep.source !== 'chainlist') return true; // Never prune static
    if (now - ep.lastUsedAt > STALE_CHAINLIST_MS && ep.score < 20) return false; // Prune
    return true;
  });
}

// =============================================================================
// Resilient Transport Factory
// =============================================================================

/**
 * Create a viem-compatible transport with resilient endpoint management.
 *
 * Adapted from rise-bridge's resilient RPC client:
 * - Weighted random endpoint selection based on health scores
 * - Automatic retry with exponential backoff for transient errors
 * - Rate limit detection with separate backoff
 * - Lazy chainlist expansion when all endpoints degrade
 */
export function resilientTransport(config: ResilientTransportConfig): Transport {
  const {
    chainId,
    rpcs = [],
    chainlistEnabled = true,
    maxRetries = DEFAULT_MAX_RETRIES,
    maxRetryMs = DEFAULT_MAX_RETRY_MS,
  } = config;

  // Initialize pool with static RPCs
  const pool: ResilientEndpoint[] = rpcs.map((url) => ({
    url,
    source: 'static' as const,
    score: 100,
    samples: [],
    rateLimitedUntil: 0,
    rateLimitBackoff: RATE_LIMIT_INITIAL_MS,
    lastUsedAt: Date.now(),
  }));

  let expanding = false;
  let lastPrune = Date.now();

  // Expand pool from chainlist
  async function expandFromChainlist(): Promise<void> {
    if (!chainlistEnabled || expanding) return;
    expanding = true;
    try {
      const urls = await getChainlistFallbackRpcs(chainId);
      const existingUrls = new Set(pool.map((ep) => ep.url));
      for (const url of urls) {
        if (existingUrls.has(url)) continue;
        if (pool.length >= MAX_POOL_SIZE) break;
        pool.push({
          url,
          source: 'chainlist',
          score: 80, // Start slightly below max
          samples: [],
          rateLimitedUntil: 0,
          rateLimitBackoff: RATE_LIMIT_INITIAL_MS,
          lastUsedAt: Date.now(),
        });
      }
    } finally {
      expanding = false;
    }
  }

  // If no static RPCs, expand immediately
  if (pool.length === 0 && chainlistEnabled) {
    void expandFromChainlist();
  }

  // Create the transport request handler
  const request = async (args: { method: string; params?: unknown[] }) => {
    const startTime = Date.now();
    let lastError: unknown;
    let backoff = INITIAL_BACKOFF_MS;

    // Periodic prune
    if (Date.now() - lastPrune > PRUNE_INTERVAL_MS) {
      const pruned = pruneStaleChainlist(pool, Date.now());
      pool.length = 0;
      pool.push(...pruned);
      lastPrune = Date.now();
    }

    // Ensure we have endpoints
    if (pool.length === 0) {
      await expandFromChainlist();
      if (pool.length === 0) {
        throw new Error(`No RPC endpoints available for chain ${chainId}`);
      }
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // Check timeout
      if (Date.now() - startTime > maxRetryMs) break;

      const now = Date.now();

      // Trigger chainlist expansion if all degraded
      if (allDegraded(pool, now) && chainlistEnabled) {
        void expandFromChainlist();
      }

      const ep = selectEndpoint(pool, now);
      const t0 = Date.now();

      try {
        // Create a one-shot http transport for this endpoint
        // retryCount: 0 on http() itself to disable viem's internal retries
        const transport = http(ep.url, { retryCount: 0, timeout: 15_000 })({
          chain: undefined,
          retryCount: 0,
        });
        const result = await transport.request(args);

        // Success
        recordSample(ep, true, Date.now() - t0);
        // Reset rate limit backoff on success
        if (ep.rateLimitedUntil > 0 && ep.rateLimitedUntil <= Date.now()) {
          ep.rateLimitedUntil = 0;
          ep.rateLimitBackoff = RATE_LIMIT_INITIAL_MS;
        }

        return result;
      } catch (err) {
        const latency = Date.now() - t0;
        const errClass = classifyError(err);

        if (errClass === 'permanent') {
          recordSample(ep, false, latency);
          throw err; // Don't retry permanent errors
        }

        if (errClass === 'endpoint-dead') {
          // Evict this endpoint — it will never work (DNS failure, blocked, etc.)
          ep.score = 0;
          ep.rateLimitedUntil = Date.now() + 600_000; // Block for 10 minutes
          // Don't count as a retry — try another endpoint immediately
          attempt--;
          lastError = err;
          continue;
        }

        if (errClass === 'rate-limit') {
          recordSample(ep, false, latency);
          ep.rateLimitedUntil = Date.now() + ep.rateLimitBackoff;
          ep.rateLimitBackoff = Math.min(ep.rateLimitBackoff * 2, RATE_LIMIT_MAX_MS);
        } else {
          // Transient
          recordSample(ep, false, latency);
        }

        lastError = err;

        // Backoff before retry
        if (attempt < maxRetries) {
          const jitter = Math.random() * backoff * 0.3;
          await new Promise((r) => setTimeout(r, backoff + jitter));
          backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
        }
      }
    }

    throw lastError ?? new Error(`All RPC endpoints failed for chain ${chainId}`);
  };

  // Return viem Transport factory
  return (params): ReturnType<Transport> => {
    return {
      config: {
        key: 'resilient',
        name: `Resilient (chain ${chainId})`,
        type: 'custom',
        ...(params as Partial<TransportConfig>),
      },
      request,
      value: undefined,
    } as ReturnType<Transport>;
  };
}
