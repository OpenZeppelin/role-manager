/**
 * Hook for managing custom role descriptions
 * Feature: 009-roles-page-data
 *
 * Provides CRUD operations for user-provided role descriptions
 * stored in IndexedDB. Descriptions are persisted per-contract.
 */
import { useCallback, useEffect, useState } from 'react';

import { logger } from '@openzeppelin/ui-utils';

import { recentContractsStorage } from '@/core/storage/RecentContractsStorage';
import type { CustomRoleDescriptions } from '@/types/storage';

/**
 * Return type for useCustomRoleDescriptions hook
 */
export interface UseCustomRoleDescriptionsReturn {
  /** Map of roleId -> custom description */
  descriptions: CustomRoleDescriptions;
  /** Whether loading from storage */
  isLoading: boolean;
  /** Update a role's custom description */
  updateDescription: (roleId: string, description: string) => Promise<void>;
  /** Clear a role's custom description */
  clearDescription: (roleId: string) => Promise<void>;
}

/**
 * Hook for managing custom role descriptions for a contract.
 *
 * @param contractId - The contract record ID (from RecentContractRecord)
 * @returns Object with descriptions map and CRUD methods
 *
 * @example
 * ```tsx
 * const { descriptions, updateDescription, clearDescription, isLoading } =
 *   useCustomRoleDescriptions(contractId);
 *
 * // Get description for a role
 * const adminDesc = descriptions['ADMIN_ROLE'];
 *
 * // Update a description
 * await updateDescription('ADMIN_ROLE', 'Full administrator access');
 *
 * // Clear a description (revert to adapter default)
 * await clearDescription('ADMIN_ROLE');
 * ```
 */
export function useCustomRoleDescriptions(
  contractId: string | undefined | null
): UseCustomRoleDescriptionsReturn {
  const [descriptions, setDescriptions] = useState<CustomRoleDescriptions>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load descriptions when contractId changes
  useEffect(() => {
    let isMounted = true;

    const loadDescriptions = async () => {
      if (!contractId) {
        setDescriptions({});
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const stored = await recentContractsStorage.getCustomRoleDescriptions(contractId);
        if (isMounted) {
          setDescriptions(stored);
        }
      } catch (error) {
        // Log error but don't fail - return empty descriptions
        logger.error('useCustomRoleDescriptions', 'Failed to load custom role descriptions', error);
        if (isMounted) {
          setDescriptions({});
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDescriptions();

    return () => {
      isMounted = false;
    };
  }, [contractId]);

  /**
   * Update a role's custom description.
   * Updates both local state (optimistic) and storage.
   */
  const updateDescription = useCallback(
    async (roleId: string, description: string): Promise<void> => {
      if (!contractId) {
        throw new Error('No contract selected');
      }

      // Optimistic update
      const trimmedDescription = description.trim();
      setDescriptions((prev) => {
        if (trimmedDescription.length === 0) {
          const { [roleId]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [roleId]: trimmedDescription };
      });

      // Persist to storage
      await recentContractsStorage.updateRoleDescription(contractId, roleId, description);
    },
    [contractId]
  );

  /**
   * Clear a role's custom description.
   * Removes from both local state and storage.
   */
  const clearDescription = useCallback(
    async (roleId: string): Promise<void> => {
      if (!contractId) {
        throw new Error('No contract selected');
      }

      // Optimistic update
      setDescriptions((prev) => {
        const { [roleId]: _, ...rest } = prev;
        return rest;
      });

      // Persist to storage
      await recentContractsStorage.clearRoleDescription(contractId, roleId);
    },
    [contractId]
  );

  return {
    descriptions,
    isLoading,
    updateDescription,
    clearDescription,
  };
}
