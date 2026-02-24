/**
 * Hook for fetching networks from all supported ecosystems.
 *
 * Uses the lightweight `/networks` subpath imports so no full adapter
 * modules (wallet SDKs, runtime code) are loaded — only static network
 * config objects and icons.
 */

import { useEffect, useRef, useState } from 'react';

import type { NetworkConfig } from '@openzeppelin/ui-types';

import { getAllNetworks } from '@/core/ecosystems/ecosystemManager';

export interface UseAllNetworksReturn {
  networks: NetworkConfig[];
  isLoading: boolean;
  error: Error | null;
}

export function useAllNetworks(): UseAllNetworksReturn {
  const [networks, setNetworks] = useState<NetworkConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;

    const fetchAll = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const all = await getAllNetworks();

        if (all.length === 0) {
          setError(new Error('Failed to fetch networks from any ecosystem'));
        }

        setNetworks(all);
        hasFetched.current = true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch networks'));
        setNetworks([]);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchAll();
  }, []);

  return { networks, isLoading, error };
}
