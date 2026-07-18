import { useQuery } from '@tanstack/react-query';

import { useNameResolutionContext } from '@openzeppelin/ui-react';
import type { ResolvedName } from '@openzeppelin/ui-types';

import { useEffectiveNameResolutionRuntime } from './useEffectiveNameResolutionRuntime';

/**
 * Reverse-resolve an address to ENS (name + avatar metadata) using the effective
 * runtime — wallet active runtime when available, otherwise the contract runtime.
 */
export function useReverseAddressResolution(
  address: string | null | undefined,
  networkIdOverride?: string,
  enabled = true
): ResolvedName | undefined {
  const {
    runtime,
    networkId: defaultNetworkId,
    isRuntimeLoading,
  } = useEffectiveNameResolutionRuntime();
  const { queryClient, config } = useNameResolutionContext();

  const networkId = networkIdOverride ?? defaultNetworkId;
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
