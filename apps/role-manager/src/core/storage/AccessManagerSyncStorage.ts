/**
 * AccessManager Sync Storage
 * Feature: 018-access-manager
 *
 * Persists AccessManager event scan results to IndexedDB for incremental sync.
 * On reload, cached data is returned immediately while a background sync
 * fetches only new blocks since lastSyncedBlock.
 */

import type {
  AccessManagerRole,
  ScheduledOperation,
  TargetConfig,
} from '../../types/access-manager';
import { db } from './database';

/** A raw event log entry from AccessManager event scanning */
export interface AccessManagerEventLog {
  /** Event type */
  type:
    | 'grant'
    | 'revoke'
    | 'label'
    | 'target-role'
    | 'target-closed'
    | 'op-scheduled'
    | 'op-executed'
    | 'op-canceled';
  /** Block number */
  blockNumber: number;
  /** Transaction hash */
  transactionHash: string;
  /** Block timestamp (unix seconds, 0 if unknown) */
  timestamp: number;
  /** Role ID (for grant/revoke/label) */
  roleId?: string;
  /** Account address (for grant/revoke) */
  account?: string;
  /** Label text (for label events) */
  label?: string;
  /** Target address (for target events) */
  target?: string;
  /** Function selector (for target-role events) */
  selector?: string;
}

export interface AccessManagerSyncRecord {
  networkId: string;
  address: string;
  /** Last block number that was scanned */
  lastSyncedBlock: number;
  /** Block where the contract was deployed */
  deploymentBlock: number;
  /** Cached role data */
  roles: AccessManagerRole[];
  /** Cached target configs */
  targets: TargetConfig[];
  /** Cached pending operations */
  operations: ScheduledOperation[];
  /** Raw event history for Role Changes page */
  eventHistory: AccessManagerEventLog[];
  /** Timestamp of last successful sync */
  syncedAt: number;
}

class AccessManagerSyncStorageClass {
  private get table() {
    return db.table<AccessManagerSyncRecord>('accessManagerSync');
  }

  async get(networkId: string, address: string): Promise<AccessManagerSyncRecord | null> {
    try {
      const record = await this.table
        .where('[networkId+address]')
        .equals([networkId, address.toLowerCase()])
        .first();
      return record ?? null;
    } catch {
      return null;
    }
  }

  async save(record: AccessManagerSyncRecord): Promise<void> {
    try {
      const normalized = { ...record, address: record.address.toLowerCase() };
      await this.table.put(normalized);
    } catch {
      // silently ignore
    }
  }

  async clear(networkId: string, address: string): Promise<void> {
    try {
      await this.table
        .where('[networkId+address]')
        .equals([networkId, address.toLowerCase()])
        .delete();
    } catch {
      // Ignore
    }
  }
}

export const accessManagerSyncStorage = new AccessManagerSyncStorageClass();
