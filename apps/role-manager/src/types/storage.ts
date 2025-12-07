import type { BaseRecord } from '@openzeppelin/ui-builder-storage';
import type {
  AccessControlCapabilities,
  ContractSchema,
  Ecosystem,
} from '@openzeppelin/ui-builder-types';

/**
 * Source of the contract schema definition
 */
export type ContractSchemaSource = 'fetched' | 'manual';

/**
 * Metadata about a fetched contract schema
 */
export interface ContractSchemaMetadata {
  /** URL of the RPC endpoint used for fetching */
  fetchedFrom?: string;
  /** Unix timestamp (ms) when the schema was last fetched */
  fetchTimestamp?: number;
  /** Contract name from the schema */
  contractName?: string;
}

/**
 * Represents a contract recently accessed by the user.
 * Extended with optional schema fields for contract definition storage.
 *
 * Unique constraint: [networkId + address] (prevents duplicates per network)
 */
export interface RecentContractRecord extends BaseRecord {
  /** Network identifier (e.g., stellar-testnet) */
  networkId: string;
  /** Contract address/ID (e.g., C...) */
  address: string;
  /** User-defined label (max 64 chars) */
  label?: string;
  /** Unix timestamp (ms) of last access */
  lastAccessed: number;

  // Schema fields (populated when schema is loaded)

  /** Ecosystem identifier (e.g., stellar) */
  ecosystem?: Ecosystem;
  /** JSON-serialized ContractSchema */
  schema?: string;
  /** Hash of schema for quick comparison (via simpleHash) */
  schemaHash?: string;
  /** How the schema was obtained */
  source?: ContractSchemaSource;
  /** Original contract definition for re-parsing (JSON spec or Wasm binary as base64) */
  definitionOriginal?: string;
  /** Additional adapter-specific artifacts */
  definitionArtifacts?: Record<string, unknown>;
  /** Metadata about schema fetch */
  schemaMetadata?: ContractSchemaMetadata;

  // Access Control fields (populated after feature detection)

  /** Detected access control capabilities (hasOwnable, hasAccessControl, etc.) */
  capabilities?: AccessControlCapabilities;

  /** User-provided role descriptions, keyed by role identifier (spec 009) */
  customRoleDescriptions?: CustomRoleDescriptions;
}

/**
 * User-provided custom descriptions for roles.
 * Keyed by role identifier (e.g., "ADMIN_ROLE", "MINTER_ROLE").
 * Values are user-entered descriptions (max 256 characters).
 *
 * @example
 * {
 *   "ADMIN_ROLE": "Full system administrator with all permissions",
 *   "MINTER_ROLE": "Can create new tokens"
 * }
 */
export type CustomRoleDescriptions = Record<string, string>;

/**
 * Input for adding or updating a contract with schema data
 */
export interface ContractSchemaInput {
  /** Contract address (must match existing record or creates new) */
  address: string;
  /** Network ID */
  networkId: string;
  /** Ecosystem identifier */
  ecosystem: Ecosystem;
  /** Parsed contract schema */
  schema: ContractSchema;
  /** How the schema was obtained */
  source: ContractSchemaSource;
  /** User-defined label (optional) */
  label?: string;
  /** Original definition for re-parsing */
  definitionOriginal?: string;
  /** Additional adapter artifacts */
  definitionArtifacts?: Record<string, unknown>;
  /** Fetch metadata */
  schemaMetadata?: ContractSchemaMetadata;
  /** Detected access control capabilities */
  capabilities?: AccessControlCapabilities;
}
