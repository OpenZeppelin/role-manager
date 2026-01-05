/**
 * Hook for fetching networks from a specific ecosystem
 * Feature: 004-add-contract-record
 *
 * Lazily loads networks only when an ecosystem is selected,
 * avoiding eager loading of all adapters.
 */

import { useEffect, useRef, useState } from 'react';

import type { Ecosystem, NetworkConfig } from '@openzeppelin/ui-types';

import { getNetworksByEcosystem } from '@/core/ecosystems/ecosystemManager';

/**
 * Return type for useNetworksByEcosystem hook
 */
export interface UseNetworksByEcosystemReturn {
  /** Networks for the selected ecosystem */
  networks: NetworkConfig[];
  /** Whether networks are currently loading */
  isLoading: boolean;
  /** Error if network fetching failed */
  error: Error | null;
}

/**
 * Hook that fetches networks for a single ecosystem.
 *
 * Networks are only fetched when an ecosystem is provided,
 * enabling lazy loading of adapters. Results are cached per ecosystem
 * to avoid refetching on re-renders.
 *
 * @param ecosystem - The ecosystem to fetch networks for, or null to skip
 * @returns Object containing networks, loading state, and error
 *
 * @example
 * ```tsx
 * const [selectedEcosystem, setSelectedEcosystem] = useState<Ecosystem | null>(null);
 * const { networks, isLoading, error } = useNetworksByEcosystem(selectedEcosystem);
 *
 * // Networks only loaded after user selects an ecosystem
 * if (!selectedEcosystem) return <EcosystemSelector onSelect={setSelectedEcosystem} />;
 * if (isLoading) return <Spinner />;
 * if (error) return <Error message={error.message} />;
 *
 * return <NetworkSelector networks={networks} />;
 * ```
 */
export function useNetworksByEcosystem(ecosystem: Ecosystem | null): UseNetworksByEcosystemReturn {
  const [networks, setNetworks] = useState<NetworkConfig[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Cache to avoid refetching for the same ecosystem
  const cacheRef = useRef<Map<Ecosystem, NetworkConfig[]>>(new Map());
  const currentEcosystemRef = useRef<Ecosystem | null>(null);

  useEffect(() => {
    // Reset state when ecosystem changes
    if (ecosystem !== currentEcosystemRef.current) {
      currentEcosystemRef.current = ecosystem;

      // Clear state for new ecosystem
      if (!ecosystem) {
        setNetworks([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      // Check cache first
      const cached = cacheRef.current.get(ecosystem);
      if (cached) {
        setNetworks(cached);
        setIsLoading(false);
        setError(null);
        return;
      }

      // Fetch networks for the ecosystem
      const fetchNetworks = async () => {
        setIsLoading(true);
        setError(null);

        try {
          const ecosystemNetworks = await getNetworksByEcosystem(ecosystem);

          // Cache the result
          cacheRef.current.set(ecosystem, ecosystemNetworks);

          // Only update state if still viewing this ecosystem
          if (currentEcosystemRef.current === ecosystem) {
            setNetworks(ecosystemNetworks);
          }
        } catch (err) {
          // Only update state if still viewing this ecosystem
          if (currentEcosystemRef.current === ecosystem) {
            setError(
              err instanceof Error ? err : new Error(`Failed to fetch networks for ${ecosystem}`)
            );
            setNetworks([]);
          }
        } finally {
          // Only update state if still viewing this ecosystem
          if (currentEcosystemRef.current === ecosystem) {
            setIsLoading(false);
          }
        }
      };

      fetchNetworks();
    }
  }, [ecosystem]);

  return {
    networks,
    isLoading,
    error,
  };
}
