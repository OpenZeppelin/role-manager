import { BaseRecord, KeyValueRecord } from '@openzeppelin/ui-builder-storage';

/**
 * Represents a contract recently accessed by the user.
 * Used with EntityStorage for auto-generated IDs and managed timestamps.
 */
export interface RecentContractRecord extends BaseRecord {
  /**
   * The unique identifier of the network (e.g. 'stellar-testnet').
   */
  networkId: string;

  /**
   * The contract address.
   */
  address: string;

  /**
   * Optional user-defined label or nickname for the contract.
   */
  label?: string;

  /**
   * Timestamp (ms) of the last time this contract was loaded.
   */
  lastAccessed: number;
}

/**
 * Note: UserPreferencesStorage uses KeyValueStorage<unknown> which manages
 * KeyValueRecord internally. No separate type definition needed in app code.
 *
 * For reference, KeyValueRecord<V> from the storage package has:
 * - key: string (primary key)
 * - value: V
 * - createdAt: Date
 * - updatedAt: Date
 */
export type UserPreferenceRecord = KeyValueRecord<unknown>;

/**
 * Input payload for adding or updating a recent contract.
 */
export interface RecentContractInput {
  networkId: string;
  address: string;
  label?: string;
}

/**
 * Service interface for Recent Contracts storage.
 * Implemented by extending EntityStorage<RecentContractRecord>.
 */
export interface RecentContractsService {
  /**
   * Adds a contract to the recent list or updates its lastAccessed timestamp if it exists.
   */
  addOrUpdate(input: RecentContractInput): Promise<string>;

  /**
   * Retrieves the list of recent contracts for a specific network.
   * @param networkId The network ID to filter by.
   */
  getByNetwork(networkId: string): Promise<RecentContractRecord[]>;

  /**
   * Deletes a recent contract entry by ID.
   */
  delete(id: string): Promise<void>;

  /**
   * Clears all recent contracts.
   */
  clear(): Promise<void>;
}

/**
 * Service interface for User Preferences storage.
 * Implemented by extending KeyValueStorage<unknown>.
 */
export interface UserPreferencesService {
  /**
   * Sets a preference value.
   */
  set(key: string, value: unknown): Promise<void>;

  /**
   * Gets a preference value.
   */
  get<T>(key: string): Promise<T | undefined>;

  /**
   * Deletes a preference by key.
   */
  delete(key: string): Promise<void>;

  /**
   * Clears all preferences.
   */
  clear(): Promise<void>;
}
