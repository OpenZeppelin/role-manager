/**
 * Hook for loading and managing network adapters
 * Feature: 004-add-contract-record
 *
 * Provides a contract adapter for a given network configuration,
 * handling loading states, errors, and retry functionality.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { NetworkConfig } from '@openzeppelin/ui-types';

import { getRuntime } from '@/core/ecosystems/ecosystemManager';
import { toRoleManagerAdapter, type RoleManagerRuntime } from '@/core/runtimeAdapter';
import type { UseNetworkAdapterReturn } from '@/types/contracts';

/**
 * Hook that loads and provides a RoleManagerAdapter for a given network configuration.
 *
 * @param networkConfig - The network configuration to load an adapter for, or null if no network selected
 * @returns Object containing the adapter, loading state, error, and retry function
 *
 * @example
 * ```tsx
 * const { adapter, isLoading, error, retry } = useNetworkAdapter(selectedNetwork);
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <Error message={error.message} onRetry={retry} />;
 * if (adapter) {
 *   const isValid = adapter.isValidAddress(address);
 * }
 * ```
 */
export function useNetworkAdapter(networkConfig: NetworkConfig | null): UseNetworkAdapterReturn {
  const [runtime, setRuntime] = useState<RoleManagerRuntime | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Track retry attempts to trigger re-fetching
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!networkConfig) {
      // Reset state when no network is selected
      setRuntime(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setRuntime(null);
    setIsLoading(true);
    setError(null);

    void getRuntime(networkConfig)
      .then((loadedRuntime) => {
        if (cancelled) {
          return;
        }

        // Keep prior runtimes alive until their consumers naturally unmount. Eager disposal
        // during network switches regressed the app by invalidating in-flight hooks/effects.
        setRuntime(loadedRuntime);
      })
      .catch((err) => {
        if (cancelled) {
          return;
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

  const retry = useCallback(() => {
    if (networkConfig) {
      setRetryCount((prev) => prev + 1);
    }
  }, [networkConfig]);

  const adapter = useMemo(() => toRoleManagerAdapter(runtime), [runtime]);

  return {
    runtime,
    adapter,
    isLoading,
    error,
    retry,
  };
}
