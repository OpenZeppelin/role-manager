/**
 * useContractSchema hook
 * Feature: 005-contract-schema-storage (Phase 5: US3 - Persist Contract Schema for Offline Use)
 *
 * Provides storage-first schema loading with automatic persistence.
 * Checks IndexedDB before making network requests and auto-saves after successful loads.
 */

import { useCallback, useRef, useState } from 'react';

import type { ContractAdapter, ContractSchema } from '@openzeppelin/ui-builder-types';
import { logger } from '@openzeppelin/ui-builder-utils';

import { recentContractsStorage } from '@/core/storage/RecentContractsStorage';
import type {
  SchemaComparisonResult,
  SchemaLoadingState,
  UseContractSchemaReturn,
} from '@/types/schema';
import type { RecentContractRecord } from '@/types/storage';

import { useContractSchemaLoader } from './useContractSchemaLoader';

/**
 * Hook for loading and persisting contract schemas with storage-first strategy.
 *
 * Features:
 * - Checks IndexedDB storage before making network requests
 * - Auto-saves schemas to storage after successful network loads
 * - Handles storage quota errors gracefully (shows schema even if save fails)
 * - Delegates network loading to useContractSchemaLoader (with circuit breaker)
 *
 * @param adapter - The contract adapter to use for loading (or null)
 * @returns Hook state and functions
 */
export function useContractSchema(adapter: ContractAdapter | null): UseContractSchemaReturn {
  const [state, setState] = useState<SchemaLoadingState>('idle');
  const [schema, setSchema] = useState<ContractSchema | null>(null);
  const [record, setRecord] = useState<RecentContractRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track current contract for refresh functionality
  const currentAddressRef = useRef<string | null>(null);
  const currentNetworkRef = useRef<string | null>(null);

  // Use the schema loader hook for network requests with circuit breaker
  const schemaLoader = useContractSchemaLoader(adapter);

  /**
   * Check if the current record has a schema
   */
  const hasSchema = schema !== null;

  /**
   * Load schema for a contract.
   * Storage-first strategy: checks IndexedDB before making network requests.
   */
  const load = useCallback(
    async (address: string, networkId: string): Promise<void> => {
      if (!adapter) {
        return;
      }

      // Update current contract refs for refresh
      currentAddressRef.current = address;
      currentNetworkRef.current = networkId;

      setState('loading');
      setError(null);

      try {
        // Step 1: Check storage first
        const storedRecord = await recentContractsStorage.getByAddressAndNetwork(
          address,
          networkId
        );

        // Step 2: If schema exists in storage, use it (skip network)
        if (storedRecord?.schema) {
          try {
            const parsedSchema = JSON.parse(storedRecord.schema) as ContractSchema;
            setSchema(parsedSchema);
            setRecord(storedRecord);
            setState('success');
            return;
          } catch (parseError) {
            // Schema JSON is corrupted, fall through to network load
            logger.warn('Failed to parse stored schema, falling back to network load', {
              address,
              networkId,
              error: parseError,
            });
          }
        }

        // Step 3: No schema in storage or it's corrupted - load from network
        const loadResult = await schemaLoader.load(address, { contractAddress: address });

        if (!loadResult) {
          // Network load failed or was blocked by circuit breaker
          if (schemaLoader.isCircuitBreakerActive) {
            setState('circuit-breaker');
          } else if (schemaLoader.error) {
            setError(schemaLoader.error);
            setState('error');
          } else {
            // No adapter support or other issue
            setError('Failed to load contract schema');
            setState('error');
          }
          return;
        }

        // Step 4: Network load succeeded - set state
        setSchema(loadResult.schema);

        // Step 5: Auto-save to storage (with graceful error handling)
        try {
          const recordId = await recentContractsStorage.addOrUpdateWithSchema({
            address,
            networkId,
            ecosystem: loadResult.schema.ecosystem,
            schema: loadResult.schema,
            source: loadResult.source,
            definitionOriginal: loadResult.contractDefinitionOriginal,
            schemaMetadata: loadResult.metadata
              ? {
                  fetchedFrom: loadResult.metadata.rpcUrl,
                  fetchTimestamp: Date.now(),
                  contractName: loadResult.schema.name,
                }
              : undefined,
          });

          // Fetch the saved record to populate state
          const savedRecord = await recentContractsStorage.getByAddressAndNetwork(
            address,
            networkId
          );
          setRecord(savedRecord);

          logger.debug('Schema saved to storage', { recordId, address, networkId });
        } catch (storageError) {
          // Storage failed (e.g., quota exceeded) - still show the schema
          logger.warn('Failed to save schema to storage', {
            address,
            networkId,
            error: storageError,
          });
          // Create a partial record for state even though storage failed
          setRecord({
            id: '',
            networkId,
            address,
            lastAccessed: Date.now(),
            ecosystem: loadResult.schema.ecosystem,
            schema: JSON.stringify(loadResult.schema),
            source: loadResult.source,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as RecentContractRecord);
        }

        setState('success');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setState('error');
        logger.error('Failed to load contract schema', { address, networkId, error: err });
      }
    },
    [adapter, schemaLoader]
  );

  /**
   * Refresh schema from source (only for fetched schemas).
   * Returns comparison result or null if refresh not possible.
   */
  const refresh = useCallback(async (): Promise<SchemaComparisonResult | null> => {
    // Cannot refresh if no schema loaded
    if (!schema || !record) {
      return null;
    }

    // Cannot refresh manual schemas
    if (record.source === 'manual') {
      return null;
    }

    // TODO: Implement refresh with comparison (Phase 6: US4)
    // For now, return null - this will be implemented in Phase 6
    return null;
  }, [schema, record]);

  /**
   * Reset hook state to initial values.
   */
  const reset = useCallback(() => {
    setState('idle');
    setSchema(null);
    setRecord(null);
    setError(null);
    currentAddressRef.current = null;
    currentNetworkRef.current = null;
    schemaLoader.reset();
  }, [schemaLoader]);

  return {
    state,
    schema,
    record,
    error,
    isCircuitBreakerActive: schemaLoader.isCircuitBreakerActive,
    hasSchema,
    load,
    refresh,
    reset,
  };
}
