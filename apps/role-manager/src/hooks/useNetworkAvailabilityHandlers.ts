import { useCallback } from 'react';

import type { NetworkConfig } from '@openzeppelin/ui-types';
import { getNetworkAvailability, isNetworkSelectable } from '@openzeppelin/ui-utils';

export function useNetworkAvailabilityHandlers() {
  const isNetworkDisabled = useCallback(
    (network: NetworkConfig) => !isNetworkSelectable(network),
    []
  );

  const getNetworkDisabledLabel = useCallback(
    (network: NetworkConfig) => getNetworkAvailability(network).disabledLabel,
    []
  );

  return {
    isNetworkDisabled,
    getNetworkDisabledLabel,
  };
}
