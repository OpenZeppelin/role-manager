import type { Table } from 'dexie';

import { EntityStorage, withQuotaHandling } from '@openzeppelin/ui-builder-storage';

import type { RecentContractRecord } from '@/types/storage';

import { db } from './database';

export interface RecentContractInput {
  networkId: string;
  address: string;
  label?: string;
}

type RecentContractsTable = Table<RecentContractRecord, string>;

function normalizeAddress(address: string): string {
  return address.trim();
}

function validateInput(input: RecentContractInput): void {
  const { networkId, address } = input;
  if (!networkId || typeof networkId !== 'string' || networkId.trim().length === 0) {
    throw new Error('recentContracts/invalid-network-id');
  }
  // Check address is a valid string before calling normalizeAddress to avoid TypeError
  if (!address || typeof address !== 'string') {
    throw new Error('recentContracts/invalid-address');
  }
  const normalized = normalizeAddress(address);
  if (normalized.length === 0) {
    throw new Error('recentContracts/invalid-address');
  }
  // Basic sanity: extremely long addresses are suspicious; cap to reasonable length
  if (normalized.length > 256) {
    throw new Error('recentContracts/invalid-address-length');
  }
}

/**
 * Storage service for persisting recently accessed contracts.
 * Extends EntityStorage for auto-generated IDs and managed timestamps.
 */
export class RecentContractsStorage extends EntityStorage<RecentContractRecord> {
  constructor() {
    super(db, 'recentContracts');
  }

  /**
   * Adds a contract to recents or updates its lastAccessed if already present (LWW).
   * Returns the record id as a string for UI consumption.
   */
  async addOrUpdate(input: RecentContractInput): Promise<string> {
    validateInput(input);
    const now = Date.now();
    const networkId = input.networkId.trim();
    const address = normalizeAddress(input.address);
    const label = input.label?.trim() || undefined;

    return await withQuotaHandling(this.tableName, async () => {
      // Try to find existing by compound unique index [networkId+address]
      // Use where+and to avoid type issues with compound equals typing
      const existing = await (this.table as RecentContractsTable)
        .where('networkId')
        .equals(networkId)
        .and((row) => row.address === address)
        .first();

      if (existing) {
        // Only include label in update if explicitly provided, to preserve existing value
        const updates: Partial<RecentContractRecord> = { lastAccessed: now };
        if (label !== undefined) {
          updates.label = label;
        }
        await this.update(existing.id, updates);
        return existing.id;
      }

      const id = await this.save({
        networkId,
        address,
        label,
        lastAccessed: now,
      });
      return id;
    });
  }

  /**
   * Returns recent contracts for a given network, ordered by lastAccessed desc.
   */
  async getByNetwork(networkId: string): Promise<RecentContractRecord[]> {
    const key = networkId?.trim();
    if (!key) return [];
    const rows = await (this.table as RecentContractsTable)
      .where('networkId')
      .equals(key)
      .sortBy('lastAccessed');
    return rows.reverse();
  }
}

export const recentContractsStorage = new RecentContractsStorage();
