import { BaseRecord } from '@openzeppelin/ui-builder-storage';

/**
 * Represents a contract recently accessed by the user.
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
 * Represents a user preference setting.
 */
export interface UserPreferenceRecord extends BaseRecord {
  /**
   * The unique key for the setting (e.g. 'active_network').
   * Used as the Primary Key in the storage.
   */
  key: string;

  /**
   * The value of the setting.
   */
  value: any;
}

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
 */
export interface UserPreferencesService {
  /**
   * Sets a preference value.
   */
  set(key: string, value: any): Promise<void>;

  /**
   * Gets a preference value.
   */
  get<T>(key: string): Promise<T | undefined>;
}

