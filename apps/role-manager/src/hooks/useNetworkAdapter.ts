/**
 * Hook for loading and managing network adapters
 * Feature: 004-add-contract-record
 *
 * Provides a contract adapter for a given network configuration,
 * handling loading states, errors, and retry functionality.
 */

import { useCallback, useEffect, useState } from 'react';

import type { ContractAdapter, NetworkConfig } from '@openzeppelin/ui-types';

import { getAdapter } from '@/core/ecosystems/ecosystemManager';
import type { UseNetworkAdapterReturn } from '@/types/contracts';

/**
 * Hook that loads and provides a ContractAdapter for a given network configuration.
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
  const [adapter, setAdapter] = useState<ContractAdapter | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Track retry attempts to trigger re-fetching
  const [retryCount, setRetryCount] = useState(0);

  const loadAdapter = useCallback(async (config: NetworkConfig) => {
    setIsLoading(true);
    setError(null);

    try {
      const loadedAdapter = await getAdapter(config);
      setAdapter(loadedAdapter);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load adapter'));
      setAdapter(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!networkConfig) {
      // Reset state when no network is selected
      setAdapter(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    loadAdapter(networkConfig);
  }, [networkConfig, loadAdapter, retryCount]);

  const retry = useCallback(() => {
    if (networkConfig) {
      setRetryCount((prev) => prev + 1);
    }
  }, [networkConfig]);

  return {
    adapter,
    isLoading,
    error,
    retry,
  };
}
