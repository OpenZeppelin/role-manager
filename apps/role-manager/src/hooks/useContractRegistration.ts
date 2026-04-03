/**
 * useContractRegistration Hook
 *
 * Manages contract registration with the access control service.
 * Some adapters (like Stellar) require contracts to be registered
 * before capability detection or data fetching can work.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import type { AccessControlService, ContractSchema, NetworkConfig } from '@openzeppelin/ui-types';
import { logger } from '@openzeppelin/ui-utils';

import type { RoleManagerRuntime } from '@/core/runtimeAdapter';
import type { ContractRecord } from '@/types/contracts';

// =============================================================================
// Types
// =============================================================================

export interface UseContractRegistrationOptions {
  /** The loaded runtime for the selected network */
  runtime: RoleManagerRuntime | null;
  /** Whether the runtime is still loading */
  isRuntimeLoading: boolean;
  /** Currently selected network */
  selectedNetwork: NetworkConfig | null;
  /** Currently selected contract */
  selectedContract: ContractRecord | null;
}

export interface UseContractRegistrationReturn {
  /**
   * Whether the selected contract has been registered with the access control service.
   * Data hooks should wait for this to be true before fetching data.
   * This is required for adapters (like Stellar) that need contract context registered first.
   */
  isContractRegistered: boolean;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook that manages contract registration with the access control service.
 *
 * Features:
 * - Tracks which contracts have been registered (by ecosystem:address)
 * - Registers contracts with adapters that support registration
 * - Clears registration cache when ecosystem changes
 * - Provides synchronous isContractRegistered flag for render-time checks
 */
export function useContractRegistration({
  runtime,
  isRuntimeLoading,
  selectedNetwork,
  selectedContract,
}: UseContractRegistrationOptions): UseContractRegistrationReturn {
  // Track which contracts have been registered to avoid duplicate registrations.
  // Using state (not ref) so changes trigger re-renders and hooks get updated value.
  const [registeredContracts, setRegisteredContracts] = useState<Set<string>>(new Set());

  // Track previous ecosystem to detect actual ecosystem changes (not just network changes)
  const prevEcosystemRef = useRef<string | null>(null);

  // Compute isContractRegistered synchronously based on current selection.
  // This ensures the value is correct during render, not just after effects.
  const isContractRegistered = useMemo(() => {
    if (!selectedNetwork || !selectedContract) {
      return false;
    }
    const registrationKey = `${selectedNetwork.ecosystem}:${selectedContract.address}`;
    return registeredContracts.has(registrationKey);
  }, [selectedNetwork, selectedContract, registeredContracts]);

  // Register contract with access control service when contract/runtime changes
  useEffect(() => {
    if (!runtime || isRuntimeLoading || !selectedNetwork || !selectedContract) {
      return;
    }

    const registrationKey = `${selectedNetwork.ecosystem}:${selectedContract.address}`;

    if (registeredContracts.has(registrationKey)) {
      return;
    }

    if (!selectedContract.schema) {
      logger.debug('useContractRegistration', 'Contract has no schema, skipping registration', {
        address: selectedContract.address,
      });
      // Mark as "registered" even without schema so data hooks don't wait forever
      setRegisteredContracts((prev) => new Set(prev).add(registrationKey));
      return;
    }

    const service = runtime.accessControl as
      | (AccessControlService & {
          registerContract?: (address: string, schema: ContractSchema) => void;
        })
      | null;

    // If runtime doesn't support registration, mark as registered anyway
    if (!service || typeof service.registerContract !== 'function') {
      setRegisteredContracts((prev) => new Set(prev).add(registrationKey));
      return;
    }

    try {
      const schema = JSON.parse(selectedContract.schema) as ContractSchema;

      service.registerContract(selectedContract.address, schema);

      logger.debug('useContractRegistration', 'Registered contract with access control service', {
        address: selectedContract.address,
        ecosystem: selectedNetwork.ecosystem,
      });

      // Add to registered set (triggers re-render, hooks see updated isContractRegistered)
      setRegisteredContracts((prev) => new Set(prev).add(registrationKey));
    } catch (error) {
      logger.error('useContractRegistration', 'Failed to register contract', error);
      // Still mark as registered so hooks don't wait forever (they'll get the error)
      setRegisteredContracts((prev) => new Set(prev).add(registrationKey));
    }
  }, [runtime, isRuntimeLoading, selectedNetwork, selectedContract, registeredContracts]);

  // Clear registration cache when ecosystem changes (new service instance).
  // Uses a ref to track the previous ecosystem and only clear when it actually changes,
  // avoiding unnecessary re-registrations when switching between networks of the same ecosystem.
  useEffect(() => {
    if (selectedNetwork) {
      const currentEcosystem = selectedNetwork.ecosystem;

      // Only clear registrations when ecosystem actually changes
      if (prevEcosystemRef.current !== null && prevEcosystemRef.current !== currentEcosystem) {
        setRegisteredContracts((prev) => {
          const filtered = Array.from(prev).filter((key) => key.startsWith(`${currentEcosystem}:`));
          if (filtered.length !== prev.size) {
            return new Set(filtered);
          }
          return prev;
        });
      }

      prevEcosystemRef.current = currentEcosystem;
    }
  }, [selectedNetwork]);

  return {
    isContractRegistered,
  };
}
