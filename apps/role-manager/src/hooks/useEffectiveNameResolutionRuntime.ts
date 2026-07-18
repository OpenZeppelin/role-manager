import { useContext } from 'react';

import { WalletStateContext } from '@openzeppelin/ui-react';
import type { EcosystemRuntime } from '@openzeppelin/ui-types';

import { useSelectedContract } from './useSelectedContract';

export interface EffectiveNameResolutionRuntime {
  runtime: EcosystemRuntime | null;
  networkId: string;
  isRuntimeLoading: boolean;
}

/**
 * Picks the runtime that can resolve ENS names. WalletStateProvider's active
 * runtime wins when it exposes nameResolution; otherwise falls back to the
 * contract-scoped runtime from ContractProvider (same instance that powers
 * AddressField validation and on-chain reads).
 */
export function useEffectiveNameResolutionRuntime(): EffectiveNameResolutionRuntime {
  const walletState = useContext(WalletStateContext);
  const {
    runtime: contractRuntime,
    selectedNetwork,
    isRuntimeLoading: isContractRuntimeLoading,
  } = useSelectedContract();

  const walletRuntime = walletState?.activeRuntime ?? null;
  const walletHasNameResolution = walletRuntime?.nameResolution != null;

  const runtime = walletHasNameResolution ? walletRuntime : (contractRuntime ?? walletRuntime);
  const networkId = walletHasNameResolution
    ? (walletState?.activeNetworkId ?? selectedNetwork?.id ?? '')
    : (selectedNetwork?.id ?? walletState?.activeNetworkId ?? '');
  const isRuntimeLoading = walletHasNameResolution
    ? (walletState?.isRuntimeLoading ?? false)
    : isContractRuntimeLoading;

  return { runtime, networkId, isRuntimeLoading };
}
