/**
 * Hook for fetching networks from all enabled ecosystems
 * Feature: 004-add-contract-record
 *
 * Aggregates network configurations from all enabled ecosystems
 * for use in network selection dropdowns.
 */

import { useEffect, useRef, useState } from 'react';

import type { NetworkConfig } from '@openzeppelin/ui-types';

import { getNetworksByEcosystem } from '@/core/ecosystems/ecosystemManager';
import { ECOSYSTEM_ORDER, getEcosystemDefaultFeatureConfig } from '@/core/ecosystems/registry';

/**
 * Return type for useAllNetworks hook
 */
export interface UseAllNetworksReturn {
  /** All networks from enabled ecosystems */
  networks: NetworkConfig[];
  /** Whether networks are currently loading */
  isLoading: boolean;
  /** Error if network fetching failed */
  error: Error | null;
}

/**
 * Hook that fetches and combines networks from all enabled ecosystems.
 *
 * Networks are fetched in parallel from all ecosystems that have
 * `enabled: true` in their feature configuration. The results are
 * combined into a single array following the ecosystem order.
 *
 * @returns Object containing networks, loading state, and error
 *
 * @example
 * ```tsx
 * const { networks, isLoading, error } = useAllNetworks();
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <Error message={error.message} />;
 *
 * return (
 *   <NetworkSelector
 *     networks={networks}
 *     onSelectNetwork={handleSelect}
 *   />
 * );
 * ```
 */
export function useAllNetworks(): UseAllNetworksReturn {
  const [networks, setNetworks] = useState<NetworkConfig[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Use ref to track if we've already fetched to prevent duplicate calls
  const hasFetched = useRef(false);

  useEffect(() => {
    // Prevent re-fetching on every render
    if (hasFetched.current) {
      return;
    }

    const fetchAllNetworks = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Get enabled ecosystems
        const enabledEcosystems = ECOSYSTEM_ORDER.filter((ecosystem) => {
          const config = getEcosystemDefaultFeatureConfig(ecosystem);
          return config.enabled;
        });

        // Fetch networks from all enabled ecosystems in parallel
        const results = await Promise.allSettled(
          enabledEcosystems.map((ecosystem) => getNetworksByEcosystem(ecosystem))
        );

        // Combine successful results
        const allNetworks: NetworkConfig[] = [];
        let hasError = false;

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            allNetworks.push(...result.value);
          } else {
            // Log error but continue with other ecosystems
            // eslint-disable-next-line no-console
            console.error(
              `[useAllNetworks] Failed to fetch networks for ${enabledEcosystems[index]}:`,
              result.reason
            );
            hasError = true;
          }
        });

        // Only set error if ALL ecosystems failed
        if (allNetworks.length === 0 && hasError) {
          setError(new Error('Failed to fetch networks from any ecosystem'));
        }

        setNetworks(allNetworks);
        hasFetched.current = true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch networks'));
        setNetworks([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllNetworks();
  }, []);

  return {
    networks,
    isLoading,
    error,
  };
}
