import { toast } from 'sonner';

import { createAliasStorage } from '@openzeppelin/ui-storage';

import { db } from '@/core/storage/database';
import { recentContractsStorage } from '@/core/storage/RecentContractsStorage';
import { userPreferencesStorage } from '@/core/storage/UserPreferencesStorage';
import type { RecentContractRecord } from '@/types/storage';

export const MOCK_MAINNET_CONTRACT_SEED = {
  alias: '[TEST] Ethereum Mainnet (pre-disable)',
  networkId: 'ethereum-mainnet',
  address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
  ecosystem: 'evm',
} as const;

export async function getSeededMainnetContract(): Promise<RecentContractRecord | null> {
  return recentContractsStorage.getByAddressAndNetwork(
    MOCK_MAINNET_CONTRACT_SEED.address,
    MOCK_MAINNET_CONTRACT_SEED.networkId
  );
}

async function applySavedMainnetPrefs(contractId: string): Promise<void> {
  await userPreferencesStorage.set('lastSelectedNetworkId', MOCK_MAINNET_CONTRACT_SEED.networkId);
  await userPreferencesStorage.set('lastSelectedContractId', contractId);
}

/**
 * Dev-only helper (requires `show_dev_tools`). Inserts a mainnet contract saved
 * before mainnet disable, plus an address alias for the sidebar test row.
 */
export async function seedMockMainnetContract(options?: {
  includeSavedPrefs?: boolean;
}): Promise<string> {
  const existing = await getSeededMainnetContract();
  if (existing) {
    const id = String(existing.id);
    if (options?.includeSavedPrefs) {
      await applySavedMainnetPrefs(id);
    }
    return id;
  }

  const aliasStorage = createAliasStorage(db);
  const id = await recentContractsStorage.addOrUpdate({
    networkId: MOCK_MAINNET_CONTRACT_SEED.networkId,
    address: MOCK_MAINNET_CONTRACT_SEED.address,
  });

  await recentContractsStorage.update(id, {
    ecosystem: MOCK_MAINNET_CONTRACT_SEED.ecosystem,
  });

  await aliasStorage.save({
    address: MOCK_MAINNET_CONTRACT_SEED.address,
    alias: MOCK_MAINNET_CONTRACT_SEED.alias,
    networkId: MOCK_MAINNET_CONTRACT_SEED.networkId,
  });

  if (options?.includeSavedPrefs) {
    await applySavedMainnetPrefs(id);
  }

  return id;
}

export async function seedMockMainnetContractWithToast(options?: {
  includeSavedPrefs?: boolean;
}): Promise<string | null> {
  try {
    const id = await seedMockMainnetContract(options);
    toast.success('Mock mainnet contract seeded', {
      description: options?.includeSavedPrefs
        ? `Saved prefs applied for "${MOCK_MAINNET_CONTRACT_SEED.alias}". Reload to test startup.`
        : `Click "${MOCK_MAINNET_CONTRACT_SEED.alias}" in the sidebar to test selection.`,
    });
    return id;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    toast.error('Failed to seed mock mainnet contract', { description: message });
    return null;
  }
}
