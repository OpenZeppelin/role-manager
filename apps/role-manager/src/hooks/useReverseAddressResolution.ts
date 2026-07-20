import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useNameResolutionContext, useResolveAddress } from '@openzeppelin/ui-react';
import type { ResolvedName } from '@openzeppelin/ui-types';

import { useAllNetworks } from './useAllNetworks';
import { useEffectiveNameResolutionRuntime } from './useEffectiveNameResolutionRuntime';

function useEffectiveRuntimeReverseResolution(
  address: string | null | undefined,
  enabled: boolean
): ResolvedName | undefined {
  const { runtime, networkId, isRuntimeLoading } = useEffectiveNameResolutionRuntime();
  const { queryClient, config } = useNameResolutionContext();

  const trimmed = (address ?? '').trim();
  const normalizedKey = trimmed.toLowerCase();
  const resolveAddress = runtime?.nameResolution?.resolveAddress;
  const runtimeScope = runtime?.networkConfig?.id ?? '';

  const queryEnabled = enabled && trimmed !== '' && resolveAddress != null && !isRuntimeLoading;

  const { data } = useQuery<ResolvedName, Error>(
    {
      queryKey: ['oz-name-resolution', 'addr', networkId, normalizedKey, runtimeScope],
      queryFn: async (): Promise<ResolvedName> => {
        const result = await resolveAddress!(trimmed);
        if (!result.ok) {
          throw new Error(result.error.code);
        }
        return result.value;
      },
      enabled: queryEnabled,
      staleTime: config.staleTimeMs,
      gcTime: config.gcTimeMs,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
    queryClient
  );

  return data;
}

/**
 * Reverse-resolve an address to ENS (name + avatar metadata).
 *
 * When `networkId` is provided, resolves via {@link RuntimeProvider} for that
 * network (ui-react `useResolveAddress` + `network` option). Otherwise uses the
 * effective runtime (wallet when available, otherwise contract-scoped).
 */
export function useReverseAddressResolution(
  address: string | null | undefined,
  networkId?: string,
  enabled = true
): ResolvedName | undefined {
  const { networks, isLoading: networksLoading } = useAllNetworks();
  const scopedNetwork = useMemo(
    () => (networkId ? networks.find((n) => n.id === networkId) : undefined),
    [networks, networkId]
  );

  const hasNetworkScope = networkId != null;
  const useNetworkScoped =
    hasNetworkScope && !networksLoading && scopedNetwork?.ecosystem === 'evm' && enabled;

  const scopedResult = useResolveAddress(address, {
    enabled: useNetworkScoped,
    network: scopedNetwork,
  });

  const effectiveResult = useEffectiveRuntimeReverseResolution(
    address,
    enabled && !hasNetworkScope
  );

  if (useNetworkScoped) {
    return scopedResult.status === 'resolved' ? scopedResult.data : undefined;
  }

  return effectiveResult;
}
