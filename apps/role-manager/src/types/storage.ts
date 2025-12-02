import type { BaseRecord } from '@openzeppelin/ui-builder-storage';

/**
 * Represents a contract recently accessed by the user.
 * Used with EntityStorage for auto-generated IDs and timestamps.
 */
export interface RecentContractRecord extends BaseRecord {
  networkId: string;
  address: string;
  label?: string;
  lastAccessed: number; // Unix ms
}
