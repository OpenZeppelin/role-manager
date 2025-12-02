import type { Table } from 'dexie';

import { DexieStorage } from '@openzeppelin/ui-builder-storage';

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
    throw new Error('storage/invalid-network-id');
  }
  const normalized = normalizeAddress(address);
  if (!normalized || typeof normalized !== 'string' || normalized.length === 0) {
    throw new Error('storage/invalid-address');
  }
  // Basic sanity: extremely long addresses are suspicious; cap to reasonable length
  if (normalized.length > 256) {
    throw new Error('storage/invalid-address-length');
  }
}

function isQuotaError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: string; code?: number; message?: string } | null | undefined;
  return (
    e?.name === 'QuotaExceededError' ||
    e?.code === 22 || // Safari iOS
    (typeof e?.message === 'string' && e.message.toLowerCase().includes('quota'))
  );
}

export class RecentContractsStorage extends DexieStorage<RecentContractRecord> {
  constructor() {
    super(db, 'recentContracts');
  }

  /**
   * Adds a contract to recents or updates its lastAccessed if already present (LWW).
   * Returns the record id as a string for UI consumption.
   */
  async addOrUpdate(input: RecentContractInput): Promise<string> {
    try {
      validateInput(input);
      const now = Date.now();
      const networkId = input.networkId.trim();
      const address = normalizeAddress(input.address);
      const label = input.label?.trim() || undefined;

      // Try to find existing by compound unique index [networkId+address]
      // Use where+and to avoid type issues with compound equals typing
      const existing = await (this.table as RecentContractsTable)
        .where('networkId')
        .equals(networkId)
        .and((row) => row.address === address)
        .first();

      if (existing) {
        const updatedLastAccessed = Math.max(existing.lastAccessed ?? 0, now);
        await this.update(existing.id, {
          lastAccessed: updatedLastAccessed,
          label,
        });
        return existing.id;
      }

      const id = await this.save({
        networkId,
        address,
        label,
        lastAccessed: now,
      } as Omit<RecentContractRecord, 'id' | 'createdAt' | 'updatedAt'>);
      return id;
    } catch (err) {
      if (isQuotaError(err)) {
        const e = new Error('storage/quota-exceeded') as Error & { cause?: unknown };
        e.cause = err;
        throw e;
      }
      throw err;
    }
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

  /**
   * Deletes a record by id
   */
  async delete(id: string): Promise<void> {
    await super.delete(id);
  }

  /**
   * Clears all recents.
   */
  async clear(): Promise<void> {
    await super.clear();
  }
}

export const recentContractsStorage = new RecentContractsStorage();
