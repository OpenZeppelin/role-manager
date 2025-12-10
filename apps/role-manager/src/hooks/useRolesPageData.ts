/**
 * useRolesPageData hook
 * Feature: 009-roles-page-data
 *
 * Orchestrates all data fetching for the Roles page:
 * - useContractCapabilities for feature detection
 * - useContractRoles for role assignments
 * - useContractOwnership for ownership info
 * - useCustomRoleDescriptions for user-provided descriptions
 *
 * Implements:
 * - T017: Create hook
 * - T018: Capability detection integration
 * - T019: Roles fetching integration
 * - T020: Ownership fetching integration
 * - T021: Owner role synthesis
 * - T022: Description priority resolution
 * - T023: Role selection state management
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useDerivedAccountStatus } from '@openzeppelin/ui-builder-react-core';
import type { AccessControlCapabilities } from '@openzeppelin/ui-builder-types';

import { OWNER_ROLE_DESCRIPTION, OWNER_ROLE_ID, OWNER_ROLE_NAME } from '../constants';
import type { RoleIdentifier, RoleWithDescription } from '../types/roles';
import { getRoleName } from '../utils/role-name';
import { useContractCapabilities } from './useContractCapabilities';
import { useContractOwnership, useContractRoles } from './useContractData';
import { useCustomRoleDescriptions } from './useCustomRoleDescriptions';
import { useSelectedContract } from './useSelectedContract';

// =============================================================================
// Types
// =============================================================================

/**
 * Return type for useRolesPageData hook
 */
export interface UseRolesPageDataReturn {
  /** All roles with resolved descriptions */
  roles: RoleWithDescription[];
  /** Currently selected role ID */
  selectedRoleId: string | null;
  /** Set selected role */
  setSelectedRoleId: (id: string) => void;
  /** Selected role data (convenience) */
  selectedRole: RoleWithDescription | null;

  /** Whether a contract is currently selected */
  hasContractSelected: boolean;
  /** Capabilities (hasAccessControl, hasOwnable) */
  capabilities: AccessControlCapabilities | null;
  /** Whether contract is supported */
  isSupported: boolean;

  /** Loading states */
  isLoading: boolean;
  isCapabilitiesLoading: boolean;
  isRolesLoading: boolean;
  isOwnershipLoading: boolean;
  /** Whether data is being refreshed in background (T051) */
  isRefreshing: boolean;

  /** Error states */
  hasError: boolean;
  errorMessage: string | null;
  canRetry: boolean;

  /** Actions */
  refetch: () => Promise<void>;
  updateRoleDescription: (roleId: string, description: string) => Promise<void>;

  /** Connected wallet */
  connectedAddress: string | null;
  /** Role IDs the connected user belongs to */
  connectedRoleIds: string[];

  /** Role identifiers for reference table */
  roleIdentifiers: RoleIdentifier[];
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook that orchestrates all data fetching for the Roles page.
 *
 * Combines multiple data sources:
 * - Contract capabilities (AccessControl, Ownable detection)
 * - Role assignments from the adapter
 * - Ownership information for Owner role synthesis
 * - Custom descriptions from local storage
 *
 * @returns Object containing roles, loading/error states, and actions
 *
 * @example
 * ```tsx
 * function RolesPage() {
 *   const {
 *     roles,
 *     selectedRole,
 *     setSelectedRoleId,
 *     isLoading,
 *     hasError,
 *     errorMessage,
 *     refetch,
 *   } = useRolesPageData();
 *
 *   if (isLoading) return <RolesLoadingSkeleton />;
 *   if (hasError) return <RolesErrorState message={errorMessage} onRetry={refetch} />;
 *   if (!isSupported) return <RolesEmptyState />;
 *
 *   return <RolesList roles={roles} selectedRole={selectedRole} />;
 * }
 * ```
 */
export function useRolesPageData(): UseRolesPageDataReturn {
  // =============================================================================
  // Context & State
  // =============================================================================

  const { selectedContract, adapter, isContractRegistered } = useSelectedContract();
  const contractAddress = selectedContract?.address ?? '';
  const contractId = selectedContract?.id;

  // Role selection state (T023)
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  // =============================================================================
  // Data Fetching Hooks
  // =============================================================================

  // Capability detection (T018)
  // Wait for contract to be registered before fetching capabilities
  const {
    capabilities,
    isLoading: isCapabilitiesLoading,
    error: capabilitiesError,
    isSupported,
  } = useContractCapabilities(adapter, contractAddress, isContractRegistered);

  // Roles fetching (T019)
  // Wait for contract to be registered before fetching roles
  const {
    roles: adapterRoles,
    isLoading: isRolesLoading,
    isFetching: isRolesFetching,
    refetch: refetchRoles,
    hasError: hasRolesError,
    canRetry: canRetryRoles,
    errorMessage: rolesErrorMessage,
  } = useContractRoles(adapter, contractAddress, isContractRegistered);

  // Ownership fetching (T020)
  // Wait for contract to be registered before fetching ownership
  const {
    ownership,
    isLoading: isOwnershipLoading,
    isFetching: isOwnershipFetching,
    refetch: refetchOwnership,
    hasOwner,
  } = useContractOwnership(adapter, contractAddress, isContractRegistered);

  // Custom descriptions
  const { descriptions: customDescriptions, updateDescription } =
    useCustomRoleDescriptions(contractId);

  // =============================================================================
  // Computed Values
  // =============================================================================

  // Owner role synthesis (T021)
  const ownerRole = useMemo((): RoleWithDescription | null => {
    if (!capabilities?.hasOwnable || !hasOwner || !ownership?.owner) {
      return null;
    }

    const customDescription = customDescriptions[OWNER_ROLE_ID];

    return {
      roleId: OWNER_ROLE_ID,
      roleName: OWNER_ROLE_NAME,
      description: customDescription ?? OWNER_ROLE_DESCRIPTION,
      isCustomDescription: !!customDescription,
      members: [ownership.owner],
      isOwnerRole: true,
    };
  }, [capabilities?.hasOwnable, hasOwner, ownership?.owner, customDescriptions]);

  // Transform adapter roles with description priority resolution (T022)
  // Note: RoleAssignment from adapter has { role: { id, label? }, members: string[] }
  // T046: Implements fallback to role ID hash when name unavailable (US4.3)
  const transformedRoles = useMemo((): RoleWithDescription[] => {
    return adapterRoles.map((assignment) => {
      const roleId = assignment.role.id;
      // T046: Use getRoleName for proper hash fallback handling
      const roleName = getRoleName(assignment.role.label, roleId);
      const customDescription = customDescriptions[roleId];
      // Adapter doesn't provide description field, so use custom or null
      const resolvedDescription = customDescription ?? null;

      return {
        roleId,
        roleName,
        description: resolvedDescription,
        isCustomDescription: !!customDescription,
        members: assignment.members,
        isOwnerRole: false,
      };
    });
  }, [adapterRoles, customDescriptions]);

  // Combine owner role with adapter roles (Owner first)
  const roles = useMemo((): RoleWithDescription[] => {
    if (ownerRole) {
      return [ownerRole, ...transformedRoles];
    }
    return transformedRoles;
  }, [ownerRole, transformedRoles]);

  // Selected role (T023)
  const selectedRole = useMemo((): RoleWithDescription | null => {
    if (!selectedRoleId) {
      return roles[0] ?? null;
    }
    return roles.find((r) => r.roleId === selectedRoleId) ?? null;
  }, [roles, selectedRoleId]);

  // Auto-select first role when roles change or selection becomes invalid
  useEffect(() => {
    if (roles.length > 0 && !selectedRoleId) {
      setSelectedRoleId(roles[0].roleId);
    } else if (selectedRoleId && !roles.find((r) => r.roleId === selectedRoleId)) {
      // Selected role no longer exists, reset to first
      setSelectedRoleId(roles[0]?.roleId ?? null);
    }
  }, [roles, selectedRoleId]);

  // Reset selection when contract changes
  useEffect(() => {
    setSelectedRoleId(null);
  }, [contractId]);

  // Get connected wallet address from wallet state (spec 013)
  const { address: connectedAddress } = useDerivedAccountStatus();

  // Compute connected role IDs
  const connectedRoleIds = useMemo((): string[] => {
    if (!connectedAddress) return [];
    const lowerCaseConnected = connectedAddress.toLowerCase();
    return roles
      .filter((role) => role.members.some((member) => member.toLowerCase() === lowerCaseConnected))
      .map((role) => role.roleId);
  }, [roles, connectedAddress]);

  // Compute role identifiers for reference table
  const roleIdentifiers = useMemo((): RoleIdentifier[] => {
    return roles.map((role) => ({
      identifier: role.roleId,
      name: role.roleName,
      description: role.description,
    }));
  }, [roles]);

  // =============================================================================
  // Loading & Error States
  // =============================================================================

  const isLoading = isCapabilitiesLoading || isRolesLoading || isOwnershipLoading;
  // T051: isRefreshing is true when we have data but are fetching in the background
  const isRefreshing = !isLoading && (isRolesFetching || isOwnershipFetching);
  const hasError = !!capabilitiesError || hasRolesError;
  const errorMessage = rolesErrorMessage ?? capabilitiesError?.message ?? null;
  const canRetry = canRetryRoles || !!capabilitiesError;

  // =============================================================================
  // Actions
  // =============================================================================

  // Combined refetch function
  const refetch = useCallback(async (): Promise<void> => {
    await Promise.all([refetchRoles(), refetchOwnership()]);
  }, [refetchRoles, refetchOwnership]);

  // Update role description (T043 - optimistic)
  const updateRoleDescription = useCallback(
    async (roleId: string, description: string): Promise<void> => {
      await updateDescription(roleId, description);
    },
    [updateDescription]
  );

  // =============================================================================
  // Return
  // =============================================================================

  // Handle no contract selected
  if (!selectedContract) {
    return {
      roles: [],
      selectedRoleId: null,
      setSelectedRoleId: () => {},
      selectedRole: null,
      hasContractSelected: false,
      capabilities: null,
      isSupported: false,
      isLoading: false,
      isCapabilitiesLoading: false,
      isRolesLoading: false,
      isOwnershipLoading: false,
      isRefreshing: false,
      hasError: false,
      errorMessage: null,
      canRetry: false,
      refetch: async () => {},
      updateRoleDescription: async () => {},
      connectedAddress: null,
      connectedRoleIds: [],
      roleIdentifiers: [],
    };
  }

  return {
    roles,
    selectedRoleId: selectedRoleId ?? roles[0]?.roleId ?? null,
    setSelectedRoleId,
    selectedRole,
    hasContractSelected: true,
    capabilities,
    isSupported,
    isLoading,
    isCapabilitiesLoading,
    isRolesLoading,
    isOwnershipLoading,
    isRefreshing,
    hasError,
    errorMessage,
    canRetry,
    refetch,
    updateRoleDescription,
    connectedAddress: connectedAddress ?? null,
    connectedRoleIds,
    roleIdentifiers,
  };
}
