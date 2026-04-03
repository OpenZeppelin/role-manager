/**
 * useContractSchemaLoader hook
 * Feature: 005-contract-schema-storage
 *
 * Provides schema loading with circuit breaker pattern for RPC failure resilience.
 * Tracks failures per contract address and blocks requests after repeated failures.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { simpleHash } from '@openzeppelin/ui-utils';

import type { RoleManagerRuntime } from '@/core/runtimeAdapter';
import type {
  CircuitBreakerState,
  SchemaLoadResult,
  UseContractSchemaLoaderReturn,
} from '@/types/schema';
import { DEFAULT_CIRCUIT_BREAKER_CONFIG } from '@/types/schema';

/**
 * Hook for loading contract schemas with circuit breaker protection.
 *
 * Features:
 * - Tracks consecutive failures per contract address
 * - Activates circuit breaker after 3 failures within 30 seconds
 * - Auto-resets circuit breaker after display duration
 * - Clears failure state on successful load
 *
 * @param runtime - The ecosystem runtime to use for loading (or null)
 * @returns Hook state and functions
 */
export function useContractSchemaLoader(
  runtime: RoleManagerRuntime | null
): UseContractSchemaLoaderReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCircuitBreakerActive, setIsCircuitBreakerActive] = useState(false);

  // Track circuit breaker state per contract key
  const circuitBreakerRef = useRef<Map<string, CircuitBreakerState>>(new Map());

  // Ref to track if a load is in progress (to prevent concurrent loads)
  const loadingRef = useRef(false);

  // Ref to track circuit breaker display timeout (for cleanup)
  const circuitBreakerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Generate a unique key for circuit breaker tracking
   */
  const getCircuitBreakerKey = (address: string, artifacts: Record<string, unknown>): string => {
    return `${address}-${simpleHash(JSON.stringify(artifacts))}`;
  };

  /**
   * Check if circuit breaker should block the request
   */
  const isCircuitBreakerBlocked = (key: string): boolean => {
    const state = circuitBreakerRef.current.get(key);
    if (!state) return false;

    const now = Date.now();
    const timeSinceLastFailure = now - state.lastFailure;

    // If window has expired, reset the state
    if (timeSinceLastFailure >= DEFAULT_CIRCUIT_BREAKER_CONFIG.windowMs) {
      circuitBreakerRef.current.delete(key);
      return false;
    }

    // Block if max attempts reached within window
    return state.attempts >= DEFAULT_CIRCUIT_BREAKER_CONFIG.maxAttempts;
  };

  /**
   * Record a failure for circuit breaker tracking
   */
  const recordFailure = (key: string): void => {
    const now = Date.now();
    const state = circuitBreakerRef.current.get(key);

    if (state) {
      // Check if we should reset (window expired)
      if (now - state.lastFailure >= DEFAULT_CIRCUIT_BREAKER_CONFIG.windowMs) {
        circuitBreakerRef.current.set(key, {
          key,
          attempts: 1,
          lastFailure: now,
        });
      } else {
        // Increment failure count
        state.attempts += 1;
        state.lastFailure = now;
      }
    } else {
      // First failure for this key
      circuitBreakerRef.current.set(key, {
        key,
        attempts: 1,
        lastFailure: now,
      });
    }

    // Check if we just hit the threshold
    const updatedState = circuitBreakerRef.current.get(key);
    if (updatedState && updatedState.attempts >= DEFAULT_CIRCUIT_BREAKER_CONFIG.maxAttempts) {
      setIsCircuitBreakerActive(true);

      // Clear any existing timeout before setting a new one
      if (circuitBreakerTimeoutRef.current) {
        clearTimeout(circuitBreakerTimeoutRef.current);
      }

      // Auto-deactivate after display duration
      circuitBreakerTimeoutRef.current = setTimeout(() => {
        setIsCircuitBreakerActive(false);
        circuitBreakerTimeoutRef.current = null;
      }, DEFAULT_CIRCUIT_BREAKER_CONFIG.displayDurationMs);
    }
  };

  /**
   * Clear circuit breaker state for a key on success
   */
  const clearCircuitBreakerState = (key: string): void => {
    circuitBreakerRef.current.delete(key);
  };

  /**
   * Load contract schema via the runtime's contractLoading capability
   */
  const load = useCallback(
    async (
      address: string,
      artifacts: Record<string, unknown>
    ): Promise<SchemaLoadResult | null> => {
      if (!runtime) {
        return null;
      }

      // Prevent concurrent loads
      if (loadingRef.current) {
        return null;
      }

      const key = getCircuitBreakerKey(address, artifacts);

      // Check circuit breaker
      if (isCircuitBreakerBlocked(key)) {
        setIsCircuitBreakerActive(true);

        // Clear any existing timeout before setting a new one
        if (circuitBreakerTimeoutRef.current) {
          clearTimeout(circuitBreakerTimeoutRef.current);
        }

        // Reset display timer
        circuitBreakerTimeoutRef.current = setTimeout(() => {
          setIsCircuitBreakerActive(false);
          circuitBreakerTimeoutRef.current = null;
        }, DEFAULT_CIRCUIT_BREAKER_CONFIG.displayDurationMs);

        return null;
      }

      // Check if runtime supports loadContractWithMetadata
      if (typeof runtime.contractLoading.loadContractWithMetadata !== 'function') {
        setError('This runtime does not support schema loading');
        return null;
      }

      setIsLoading(true);
      loadingRef.current = true;
      setError(null);

      try {
        const result = await runtime.contractLoading.loadContractWithMetadata(artifacts);

        // Clear circuit breaker state on success
        clearCircuitBreakerState(key);

        setIsLoading(false);
        loadingRef.current = false;

        return result as SchemaLoadResult;
      } catch (err) {
        // Record failure for circuit breaker
        recordFailure(key);

        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setIsLoading(false);
        loadingRef.current = false;

        return null;
      }
    },
    [runtime]
  );

  /**
   * Reset hook state
   */
  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setIsCircuitBreakerActive(false);
    loadingRef.current = false;
    circuitBreakerRef.current.clear();

    // Clear any pending circuit breaker timeout
    if (circuitBreakerTimeoutRef.current) {
      clearTimeout(circuitBreakerTimeoutRef.current);
      circuitBreakerTimeoutRef.current = null;
    }
  }, []);

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (circuitBreakerTimeoutRef.current) {
        clearTimeout(circuitBreakerTimeoutRef.current);
      }
    };
  }, []);

  return {
    load,
    isLoading,
    error,
    isCircuitBreakerActive,
    reset,
  };
}
