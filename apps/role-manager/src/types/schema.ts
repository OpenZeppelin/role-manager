/**
 * Schema-related types for the Contract Schema Loading and Storage feature
 * Feature: 005-contract-schema-storage
 *
 * These types support the useContractSchemaLoader hook and schema comparison functionality.
 */

import type { ContractSchema } from '@openzeppelin/ui-types';

import type { ContractSchemaSource, RecentContractRecord } from './storage';

// =============================================================================
// Circuit Breaker Types
// =============================================================================

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

// =============================================================================
// Schema Loading Types
// =============================================================================

/**
 * Loading state for schema operations
 */
export type SchemaLoadingState = 'idle' | 'loading' | 'success' | 'error' | 'circuit-breaker';

/**
 * Result returned by adapter's loadContractWithMetadata
 */
export interface SchemaLoadResult {
  /** Loaded contract schema */
  schema: ContractSchema;
  /** How the schema was obtained */
  source: ContractSchemaSource;
  /** Original contract definition for re-parsing */
  contractDefinitionOriginal?: string;
  /** Additional metadata from the load operation */
  metadata?: {
    rpcUrl?: string;
    [key: string]: unknown;
  };
}

/**
 * Return type for useContractSchemaLoader hook
 */
export interface UseContractSchemaLoaderReturn {
  /**
   * Load schema for given contract
   * @param address - Contract address
   * @param artifacts - Adapter-specific artifacts (form data)
   * @returns Schema load result or null if blocked/failed
   */
  load: (address: string, artifacts: Record<string, unknown>) => Promise<SchemaLoadResult | null>;
  /** Whether a load operation is in progress */
  isLoading: boolean;
  /** Error message from last failed load (if any) */
  error: string | null;
  /** Whether circuit breaker is currently active */
  isCircuitBreakerActive: boolean;
  /** Reset hook state (clear error, circuit breaker, loading) */
  reset: () => void;
}

// =============================================================================
// Schema Comparison Types
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
// Contract Schema Hook Types
// =============================================================================

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
