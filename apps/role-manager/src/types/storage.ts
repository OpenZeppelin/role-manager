import type { BaseRecord } from '@openzeppelin/ui-builder-storage';

export interface RecentContractRecord extends BaseRecord {
  networkId: string;
  address: string;
  label?: string;
  lastAccessed: number; // Unix ms
}

export interface UserPreferenceRecord extends BaseRecord {
  key: string;
  value: unknown;
}
