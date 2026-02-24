import { useAddressLabel } from '@openzeppelin/ui-components';
import { truncateMiddle } from '@openzeppelin/ui-utils';

import type { ContractRecord } from '../types/contracts';

/**
 * Resolves a display name for a contract using the alias system as the
 * single source of truth. Existing contract.label values are migrated
 * to aliases via the Dexie v4 upgrade hook in database.ts.
 */
export function useContractDisplayName(contract: ContractRecord | null): string {
  const { label: aliasLabel } = useAddressLabel(contract?.address ?? '', contract?.networkId);

  if (aliasLabel) return aliasLabel;
  if (contract?.address) return truncateMiddle(contract.address, 4, 4);
  return 'Unknown Contract';
}
