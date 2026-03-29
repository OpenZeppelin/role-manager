import type { OpenZeppelinAdapterEcosystem } from '@openzeppelin/adapters-vite';

export const supportedAdapterEcosystems = ['evm', 'polkadot', 'stellar'] as const satisfies readonly OpenZeppelinAdapterEcosystem[];
