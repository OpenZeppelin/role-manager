/**
 * Contract Schema Storage Interfaces
 * Feature: 005-contract-schema-storage
 *
 * These interfaces define the contract for extending RecentContractRecord
 * with schema fields. Implementation updates RecentContractsStorage.
 */

import type { BaseRecord } from '@openzeppelin/ui-builder-storage';
import type { ContractSchema, Ecosystem } from '@openzeppelin/ui-builder-types';

// =============================================================================
// Extended Record Type
// =============================================================================

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
 * Extended RecentContractRecord with optional schema fields.
 * A contract can exist with just basic info (address + network),
 * and gain schema data when the user loads the contract definition.
 *
 * Unique constraint: [networkId + address] (existing from spec 004)
 */
export interface RecentContractRecord extends BaseRecord {
  // ═══════════════════════════════════════════════════════════════════════════
  // EXISTING FIELDS (from spec 004)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Network identifier (e.g., stellar-testnet) */
  networkId: string;
  /** Contract address/ID (e.g., C...) */
  address: string;
  /** User-defined label (max 64 chars) */
  label?: string;
  /** Unix timestamp (ms) of last access */
  lastAccessed: number;

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW SCHEMA FIELDS (populated when schema is loaded)
  // ═══════════════════════════════════════════════════════════════════════════

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
}

// =============================================================================
// Input Types
// =============================================================================

/**
 * Input for adding schema data to an existing contract record
 */
export interface ContractSchemaInput {
  /** Contract address (must match existing record) */
  address: string;
  /** Network ID (must match existing record) */
  networkId: string;
  /** Ecosystem identifier */
  ecosystem: Ecosystem;
  /** Parsed contract schema */
  schema: ContractSchema;
  /** How the schema was obtained */
  source: ContractSchemaSource;
  /** Original definition for re-parsing */
  definitionOriginal?: string;
  /** Additional adapter artifacts */
  definitionArtifacts?: Record<string, unknown>;
  /** Fetch metadata */
  schemaMetadata?: ContractSchemaMetadata;
}

/**
 * Input for updating schema fields on an existing record
 */
export interface ContractSchemaUpdateInput {
  schema?: ContractSchema;
  definitionOriginal?: string;
  definitionArtifacts?: Record<string, unknown>;
  schemaMetadata?: ContractSchemaMetadata;
}

// =============================================================================
// Comparison Types
// =============================================================================

/**
 * Result of comparing two schemas
 */
export interface SchemaComparisonResult {
  /** Whether the schemas are identical */
  identical: boolean;
  /** List of differences found */
  differences: SchemaComparisonDiff[];
  /** Human-readable summary */
  summary: string;
}

/**
 * A single difference between two schemas
 */
export interface SchemaComparisonDiff {
  type: 'added' | 'removed' | 'modified';
  /** Section of the schema (e.g., 'functions', 'events') */
  section: string;
  /** Name of the changed item */
  name: string;
  /** Human-readable description of the change */
  details: string;
}

// =============================================================================
// Extended Storage Service Interface
// =============================================================================

/**
 * Extended methods for RecentContractsStorage to handle schema data.
 * These methods are added to the existing RecentContractsStorage class.
 */
export interface IRecentContractsStorageWithSchema {
  // ═══════════════════════════════════════════════════════════════════════════
  // EXISTING METHODS (from spec 004)
  // ═══════════════════════════════════════════════════════════════════════════

  addOrUpdate(input: { networkId: string; address: string; label?: string }): Promise<string>;
  getByNetwork(networkId: string): Promise<RecentContractRecord[]>;
  deleteContract(id: string): Promise<void>;

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW SCHEMA METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Add or update schema data for a contract.
   * Creates the record if it doesn't exist, updates schema fields if it does.
   * @returns The record ID
   */
  addOrUpdateWithSchema(input: ContractSchemaInput): Promise<string>;

  /**
   * Get a contract with its schema by address and network
   * @returns The full record or null if not found
   */
  getByAddressAndNetwork(address: string, networkId: string): Promise<RecentContractRecord | null>;

  /**
   * Check if a contract has a loaded schema
   */
  hasSchema(address: string, networkId: string): Promise<boolean>;

  /**
   * Get contracts that are eligible for refresh (source === 'fetched')
   * Optionally filter by age threshold
   */
  getRefreshableContracts(olderThanHours?: number): Promise<RecentContractRecord[]>;

  /**
   * Update only the schema fields of an existing record
   */
  updateSchema(id: string, updates: ContractSchemaUpdateInput): Promise<void>;

  /**
   * Clear schema data from a record (keeps basic contract info)
   */
  clearSchema(id: string): Promise<void>;
}

// =============================================================================
// Hook Types
// =============================================================================

/**
 * Loading state for schema operations
 */
export type SchemaLoadingState = 'idle' | 'loading' | 'success' | 'error' | 'circuit-breaker';

/**
 * Return type for useContractSchema hook
 */
export interface UseContractSchemaReturn {
  /** Current loading state */
  state: SchemaLoadingState;
  /** Loaded schema (if state === 'success') */
  schema: ContractSchema | null;
  /** Full contract record (if exists) */
  record: RecentContractRecord | null;
  /** Error message (if state === 'error') */
  error: string | null;
  /** Whether circuit breaker is active */
  isCircuitBreakerActive: boolean;
  /** Whether the record has a loaded schema */
  hasSchema: boolean;
  /** Load schema for given contract and network */
  load: (address: string, networkId: string) => Promise<void>;
  /** Refresh schema from source (only for fetched schemas) */
  refresh: () => Promise<SchemaComparisonResult | null>;
  /** Clear current state */
  reset: () => void;
}

/**
 * Circuit breaker state for tracking RPC failures
 */
export interface CircuitBreakerState {
  /** Unique key for the contract+network combination */
  key: string;
  /** Number of consecutive failures */
  attempts: number;
  /** Timestamp of the last failure */
  lastFailure: number;
}

/**
 * Configuration for the circuit breaker
 */
export interface CircuitBreakerConfig {
  /** Maximum failures before triggering circuit breaker */
  maxAttempts: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Display duration for circuit breaker message */
  displayDurationMs: number;
}

/**
 * Default circuit breaker configuration (matches Builder UI)
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  maxAttempts: 3,
  windowMs: 30000, // 30 seconds
  displayDurationMs: 5000, // 5 seconds
};
