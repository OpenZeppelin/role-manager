/**
 * Hook for managing custom role aliases
 *
 * Provides CRUD operations for user-provided role aliases
 * stored in IndexedDB. Aliases are persisted per-contract,
 * allowing the same role hash to have different aliases on different contracts.
 */
import { useCallback, useEffect, useState } from 'react';

import { logger } from '@openzeppelin/ui-utils';

import { recentContractsStorage } from '@/core/storage/RecentContractsStorage';
import type { CustomRoleAliases } from '@/types/storage';

/**
 * Return type for useCustomRoleAliases hook
 */
export interface UseCustomRoleAliasesReturn {
  /** Map of roleId -> custom alias */
  aliases: CustomRoleAliases;
  /** Whether loading from storage */
  isLoading: boolean;
  /** Update a role's custom alias */
  updateAlias: (roleId: string, alias: string) => Promise<void>;
  /** Clear a role's custom alias */
  clearAlias: (roleId: string) => Promise<void>;
}

/**
 * Hook for managing custom role aliases for a contract.
 *
 * @param contractId - The contract record ID (from RecentContractRecord)
 * @returns Object with aliases map and CRUD methods
 *
 * @example
 * ```tsx
 * const { aliases, updateAlias, clearAlias, isLoading } =
 *   useCustomRoleAliases(contractId);
 *
 * // Get alias for a role
 * const minterAlias = aliases['0x9f2d...'];
 *
 * // Update an alias
 * await updateAlias('0x9f2d...', 'Minter');
 *
 * // Clear an alias (revert to hash display)
 * await clearAlias('0x9f2d...');
 * ```
 */
export function useCustomRoleAliases(
  contractId: string | undefined | null
): UseCustomRoleAliasesReturn {
  const [aliases, setAliases] = useState<CustomRoleAliases>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadAliases = async () => {
      if (!contractId) {
        setAliases({});
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const stored = await recentContractsStorage.getCustomRoleAliases(contractId);
        if (isMounted) {
          setAliases(stored);
        }
      } catch (error) {
        logger.error('useCustomRoleAliases', 'Failed to load custom role aliases', error);
        if (isMounted) {
          setAliases({});
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadAliases();

    return () => {
      isMounted = false;
    };
  }, [contractId]);

  /**
   * Update a role's custom alias.
   * Updates both local state (optimistic) and storage.
   */
  const updateAlias = useCallback(
    async (roleId: string, alias: string): Promise<void> => {
      if (!contractId) {
        throw new Error('No contract selected');
      }

      const trimmedAlias = alias.trim();
      setAliases((prev) => {
        if (trimmedAlias.length === 0) {
          const { [roleId]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [roleId]: trimmedAlias };
      });

      await recentContractsStorage.updateRoleAlias(contractId, roleId, alias);
    },
    [contractId]
  );

  /**
   * Clear a role's custom alias.
   * Removes from both local state and storage.
   */
  const clearAlias = useCallback(
    async (roleId: string): Promise<void> => {
      if (!contractId) {
        throw new Error('No contract selected');
      }

      setAliases((prev) => {
        const { [roleId]: _, ...rest } = prev;
        return rest;
      });

      await recentContractsStorage.clearRoleAlias(contractId, roleId);
    },
    [contractId]
  );

  return {
    aliases,
    isLoading,
    updateAlias,
    clearAlias,
  };
}
