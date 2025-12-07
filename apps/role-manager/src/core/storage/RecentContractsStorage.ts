import type { Table } from 'dexie';

import { EntityStorage, withQuotaHandling } from '@openzeppelin/ui-builder-storage';
import { simpleHash } from '@openzeppelin/ui-builder-utils';

import type {
  ContractSchemaInput,
  CustomRoleDescriptions,
  RecentContractRecord,
} from '@/types/storage';

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
  const { networkId, address, label } = input;
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
  // Validate label length if provided (ASSUMP-005: max 64 characters)
  if (label !== undefined && typeof label === 'string' && label.trim().length > 64) {
    throw new Error('recentContracts/invalid-label-length');
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
        // Convert ID to string since database stores auto-increment IDs as numbers
        // but EntityStorage.update() expects string IDs
        const idString = String(existing.id);
        await this.update(idString, updates);
        return idString;
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

  /**
   * Delete a contract record by ID.
   * This is a permanent deletion with no confirmation - the UI handles any confirmation logic.
   *
   * @param id - The ID of the contract record to delete
   * @throws Error if the deletion fails
   */
  async deleteContract(id: string): Promise<void> {
    await this.delete(id);
  }

  /**
   * Add or update a contract with schema data.
   * Creates the record if it doesn't exist, updates schema fields if it does.
   */
  async addOrUpdateWithSchema(input: ContractSchemaInput): Promise<string> {
    validateInput({
      networkId: input.networkId,
      address: input.address,
      label: input.label,
    });

    const now = Date.now();
    const networkId = input.networkId.trim();
    const address = normalizeAddress(input.address);
    const label = input.label?.trim() || undefined;

    // Serialize schema and compute hash
    const schemaJson = JSON.stringify(input.schema);
    const schemaHash = simpleHash(schemaJson);

    return await withQuotaHandling(this.tableName, async () => {
      // Try to find existing by compound unique index [networkId+address]
      const existing = await (this.table as RecentContractsTable)
        .where('networkId')
        .equals(networkId)
        .and((row) => row.address === address)
        .first();

      if (existing) {
        // Update existing record with schema data
        const updates: Partial<RecentContractRecord> = {
          lastAccessed: now,
          ecosystem: input.ecosystem,
          schema: schemaJson,
          schemaHash,
          source: input.source,
        };

        // Only update label if explicitly provided
        if (label !== undefined) {
          updates.label = label;
        }

        // Optional fields
        if (input.definitionOriginal !== undefined) {
          updates.definitionOriginal = input.definitionOriginal;
        }
        if (input.definitionArtifacts !== undefined) {
          updates.definitionArtifacts = input.definitionArtifacts;
        }
        if (input.schemaMetadata !== undefined) {
          updates.schemaMetadata = input.schemaMetadata;
        }
        if (input.capabilities !== undefined) {
          updates.capabilities = input.capabilities;
        }

        const idString = String(existing.id);
        await this.update(idString, updates);
        return idString;
      }

      // Create new record with schema data
      const id = await this.save({
        networkId,
        address,
        label,
        lastAccessed: now,
        ecosystem: input.ecosystem,
        schema: schemaJson,
        schemaHash,
        source: input.source,
        definitionOriginal: input.definitionOriginal,
        definitionArtifacts: input.definitionArtifacts,
        schemaMetadata: input.schemaMetadata,
        capabilities: input.capabilities,
      });
      return id;
    });
  }

  /**
   * Get a contract with its schema by address and network.
   */
  async getByAddressAndNetwork(
    address: string,
    networkId: string
  ): Promise<RecentContractRecord | null> {
    const normalizedAddress = normalizeAddress(address);
    const normalizedNetworkId = networkId?.trim();

    if (!normalizedAddress || !normalizedNetworkId) {
      return null;
    }

    const record = await (this.table as RecentContractsTable)
      .where('networkId')
      .equals(normalizedNetworkId)
      .and((row) => row.address === normalizedAddress)
      .first();

    return record ?? null;
  }

  /**
   * Check if a contract has a loaded schema.
   */
  async hasSchema(address: string, networkId: string): Promise<boolean> {
    const record = await this.getByAddressAndNetwork(address, networkId);
    return record?.schema !== undefined && record.schema !== null;
  }

  /**
   * Clear schema data from a record (keeps basic contract info).
   */
  async clearSchema(id: string): Promise<void> {
    await this.update(id, {
      ecosystem: undefined,
      schema: undefined,
      schemaHash: undefined,
      source: undefined,
      definitionOriginal: undefined,
      definitionArtifacts: undefined,
      schemaMetadata: undefined,
    });
  }

  // ===========================================================================
  // Custom Role Descriptions (spec 009)
  // ===========================================================================

  /**
   * Update a custom role description for a contract.
   * If description is empty/whitespace, the description is cleared for that role.
   *
   * @param id - Contract record ID
   * @param roleId - Role identifier (e.g., "ADMIN_ROLE")
   * @param description - Custom description (max 256 chars) or empty to clear
   * @throws Error if roleId is invalid or description exceeds 256 characters
   */
  async updateRoleDescription(id: string, roleId: string, description: string): Promise<void> {
    // Validate roleId
    if (!roleId || typeof roleId !== 'string' || roleId.trim().length === 0) {
      throw new Error('storage/invalid-role-id');
    }

    const trimmedDescription = description.trim();

    // Validate description length (only if not clearing)
    if (trimmedDescription.length > 256) {
      throw new Error('storage/description-too-long');
    }

    const record = await this.get(id);
    if (!record) {
      return;
    }

    // Get existing descriptions or initialize empty object
    const customRoleDescriptions: CustomRoleDescriptions = {
      ...(record.customRoleDescriptions || {}),
    };

    // Update or clear the description
    if (trimmedDescription.length === 0) {
      delete customRoleDescriptions[roleId];
    } else {
      customRoleDescriptions[roleId] = trimmedDescription;
    }

    await this.update(id, { customRoleDescriptions });
  }

  /**
   * Get all custom role descriptions for a contract.
   *
   * @param id - Contract record ID
   * @returns Custom descriptions map or empty object
   */
  async getCustomRoleDescriptions(id: string): Promise<CustomRoleDescriptions> {
    const record = await this.get(id);
    return record?.customRoleDescriptions || {};
  }

  /**
   * Clear a specific custom role description.
   *
   * @param id - Contract record ID
   * @param roleId - Role identifier to clear
   */
  async clearRoleDescription(id: string, roleId: string): Promise<void> {
    const record = await this.get(id);
    if (!record || !record.customRoleDescriptions) {
      return;
    }

    const customRoleDescriptions: CustomRoleDescriptions = { ...record.customRoleDescriptions };
    delete customRoleDescriptions[roleId];

    await this.update(id, { customRoleDescriptions });
  }
}

export const recentContractsStorage = new RecentContractsStorage();
