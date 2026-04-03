/**
 * Hook for loading and managing ecosystem runtimes.
 *
 * Provides a RoleManagerRuntime for a given network configuration,
 * handling loading states, errors, and retry functionality.
 *
 * Lifecycle: superseded runtimes are disposed after their replacement has been
 * promoted to state, following the same promote-then-dispose handoff used in
 * the shared RuntimeProvider/WalletStateProvider layer. Runtimes that finish
 * loading after their effect has been cancelled are disposed immediately.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { NetworkConfig } from '@openzeppelin/ui-types';
import { logger } from '@openzeppelin/ui-utils';

import { getRuntime } from '@/core/ecosystems/ecosystemManager';
import type { RoleManagerRuntime } from '@/core/runtimeAdapter';
import type { UseNetworkAdapterReturn } from '@/types/contracts';

/**
 * Defers disposal to the next macrotask so React's commit phase (including
 * development-mode prop diffing) can finish reading the old runtime's
 * properties without hitting the RuntimeDisposedError proxy trap.
 */
function safeDispose(runtime: RoleManagerRuntime, label: string): void {
  setTimeout(() => {
    try {
      runtime.dispose();
    } catch (err) {
      logger.error('useNetworkAdapter', `Error disposing runtime (${label}):`, err);
    }
  }, 0);
}

/**
 * Hook that loads and provides a RoleManagerRuntime for a given network configuration.
 *
 * @param networkConfig - The network configuration to load a runtime for, or null if no network selected
 * @returns Object containing the runtime, loading state, error, and retry function
 *
 * @example
 * ```tsx
 * const { runtime, isLoading, error, retry } = useNetworkAdapter(selectedNetwork);
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <Error message={error.message} onRetry={retry} />;
 * if (runtime) {
 *   const isValid = runtime.addressing.isValidAddress(address);
 * }
 * ```
 */
export function useNetworkAdapter(networkConfig: NetworkConfig | null): UseNetworkAdapterReturn {
  const [runtime, setRuntime] = useState<RoleManagerRuntime | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Track retry attempts to trigger re-fetching
  const [retryCount, setRetryCount] = useState(0);

  // Ref to the currently promoted runtime for lifecycle management.
  // This allows disposal of the superseded runtime after its replacement is in state.
  const promotedRuntimeRef = useRef<RoleManagerRuntime | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!networkConfig) {
      const prev = promotedRuntimeRef.current;
      setRuntime(null);
      setIsLoading(false);
      setError(null);

      if (prev) {
        safeDispose(prev, 'network cleared');
        promotedRuntimeRef.current = null;
      }
      return;
    }

    setRuntime(null);
    setIsLoading(true);
    setError(null);

    void getRuntime(networkConfig)
      .then((loadedRuntime) => {
        if (cancelled) {
          safeDispose(loadedRuntime, 'cancelled load');
          return;
        }

        const prev = promotedRuntimeRef.current;
        setRuntime(loadedRuntime);
        promotedRuntimeRef.current = loadedRuntime;

        if (prev && prev !== loadedRuntime) {
          safeDispose(prev, `superseded by ${networkConfig.id}`);
        }
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }

        const prev = promotedRuntimeRef.current;
        if (prev) {
          safeDispose(prev, `error loading ${networkConfig.id}`);
          promotedRuntimeRef.current = null;
        }

        setError(err instanceof Error ? err : new Error('Failed to load runtime'));
        setRuntime(null);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [networkConfig, retryCount]);

  // Dispose the active runtime on unmount.
  useEffect(() => {
    return () => {
      if (promotedRuntimeRef.current) {
        safeDispose(promotedRuntimeRef.current, 'unmount');
        promotedRuntimeRef.current = null;
      }
    };
  }, []);

  const retry = useCallback(() => {
    if (networkConfig) {
      setRetryCount((prev) => prev + 1);
    }
  }, [networkConfig]);

  return {
    runtime,
    isLoading,
    error,
    retry,
  };
}
