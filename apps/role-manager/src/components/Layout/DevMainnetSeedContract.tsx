import type { ReactElement } from 'react';

import { useLiveQuery } from '@openzeppelin/ui-storage';
import { cn } from '@openzeppelin/ui-utils';

import {
  getSeededMainnetContract,
  MOCK_MAINNET_CONTRACT_SEED,
} from '@/dev/seedMockMainnetContract';
import { useSelectedContract } from '@/hooks/useSelectedContract';

/**
 * Dev-only sidebar row for a mainnet contract saved before disable policy.
 * Mirrors the UI Builder seeded sidebar item pattern.
 */
export function DevMainnetSeedContract(): ReactElement | null {
  const { selectContractById } = useSelectedContract();
  const seedContract = useLiveQuery(() => getSeededMainnetContract(), []);

  if (!seedContract) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => void selectContractById(String(seedContract.id))}
      className={cn(
        'w-full rounded-md border border-dashed border-amber-500/40 bg-amber-500/5 px-3 py-2 text-left',
        'text-sm font-medium text-foreground transition-colors hover:bg-amber-500/10'
      )}
    >
      <span className="block truncate">{MOCK_MAINNET_CONTRACT_SEED.alias}</span>
      <span className="block text-xs font-normal text-muted-foreground">
        Saved mainnet · click to test
      </span>
    </button>
  );
}
