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

import { useDerivedAccountStatus } from '@openzeppelin/ui-react';
import type {
  AccessControlCapabilities,
  AdminInfo,
  AdminState,
  ExpirationMetadata,
  OwnershipState,
  PendingAdminTransfer,
  PendingOwnershipTransfer,
} from '@openzeppelin/ui-types';

import {
  ADMIN_ROLE_DESCRIPTION,
  ADMIN_ROLE_ID,
  ADMIN_ROLE_NAME,
  OWNER_ROLE_DESCRIPTION,
  OWNER_ROLE_ID,
  OWNER_ROLE_NAME,
} from '../constants';
import type { RoleIdentifier, RoleWithDescription } from '../types/roles';
import { getRoleName, isRoleDisplayHash } from '../utils/role-name';
import { useBlockPollInterval } from './useBlockPollInterval';
import { useContractCapabilities } from './useContractCapabilities';
import { useContractAdminInfo, useContractOwnership, useContractRoles } from './useContractData';
import { useCurrentBlock } from './useCurrentBlock';
import { useCustomRoleDescriptions } from './useCustomRoleDescriptions';
import { useExpirationMetadata } from './useExpirationMetadata';
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
  /** Feature 016: Whether admin info is loading */
  isAdminLoading: boolean;
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

  /** Feature 015: Pending owner address (for Accept Ownership button visibility) */
  pendingOwner: string | null;

  /**
   * Feature 015 Phase 6: Full pending transfer info for display (T026, T027, T028)
   * Includes pendingOwner, expirationBlock for detailed status display
   */
  pendingTransfer: PendingOwnershipTransfer | null;

  /**
   * Feature 015 Phase 6: Ownership state ('owned' | 'pending' | 'expired' | 'renounced')
   * Used to determine which UI elements to show (T028)
   */
  ownershipState: OwnershipState | null;

  /**
   * Current ledger/block number for expiration countdown display
   * Polled automatically when a pending transfer exists
   */
  currentBlock: number | null;

  /** Adapter-driven expiration metadata for ownership pending transfers */
  ownershipExpirationMetadata: ExpirationMetadata | undefined;
  /** Adapter-driven expiration metadata for admin pending transfers */
  adminExpirationMetadata: ExpirationMetadata | undefined;

  // =============================================================================
  // Feature 016: Two-Step Admin Assignment
  // =============================================================================

  /**
   * Feature 016: Admin info from the contract
   * Includes admin address, state, and pending transfer info
   */
  adminInfo: AdminInfo | null;

  /**
   * Feature 016: Pending admin transfer info
   * Includes pendingAdmin address and expiration block
   */
  pendingAdminTransfer: PendingAdminTransfer | null;

  /**
   * Feature 016: Admin state ('active' | 'pending' | 'expired' | 'renounced')
   * Used to determine which UI elements to show
   */
  adminState: AdminState | null;

  /**
   * Feature 016: Function to manually refetch admin info
   */
  refetchAdminInfo: () => Promise<void>;
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
  // Only fetch when contract has Ownable capability (prevents errors on AccessControl-only contracts)
  const hasOwnableCapability = capabilities?.hasOwnable ?? false;
  const {
    ownership,
    isLoading: isOwnershipLoading,
    isFetching: isOwnershipFetching,
    refetch: refetchOwnership,
    hasOwner,
  } = useContractOwnership(adapter, contractAddress, isContractRegistered, hasOwnableCapability);

  // Feature 016: Admin info fetching (T013)
  // Only fetch when contract has two-step admin capability
  const hasTwoStepAdmin = capabilities?.hasTwoStepAdmin ?? false;
  const {
    adminInfo,
    isLoading: isAdminLoading,
    isFetching: isAdminFetching,
    refetch: refetchAdminInfo,
  } = useContractAdminInfo(adapter, contractAddress, isContractRegistered, hasTwoStepAdmin);

  // Custom descriptions
  const { descriptions: customDescriptions, updateDescription } =
    useCustomRoleDescriptions(contractId);

  // Current block for expiration countdown (poll when pending transfer exists)
  // Feature 016: Also poll when admin pending transfer exists
  const hasPendingOwnershipTransfer = ownership?.state === 'pending';
  const hasPendingAdminTransfer = adminInfo?.state === 'pending';
  const hasPendingTransfer = hasPendingOwnershipTransfer || hasPendingAdminTransfer;

  // Chain-agnostic poll interval derived from calibrated block/ledger time
  const blockPollInterval = useBlockPollInterval();

  const { currentBlock } = useCurrentBlock(adapter, {
    enabled: hasPendingTransfer,
    pollInterval: blockPollInterval,
  });

  // Expiration metadata for pending transfer display labels (adapter-driven)
  const { metadata: ownershipExpirationMetadata } = useExpirationMetadata(
    adapter,
    contractAddress,
    'ownership',
    { enabled: hasOwnableCapability }
  );
  const { metadata: adminExpirationMetadata } = useExpirationMetadata(
    adapter,
    contractAddress,
    'admin',
    { enabled: hasTwoStepAdmin }
  );

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
      isAdminRole: false,
      isHashDisplay: false,
    };
  }, [capabilities?.hasOwnable, hasOwner, ownership?.owner, customDescriptions]);

  // Feature 016: Admin role synthesis (T014)
  // Synthesize Admin role from adminInfo when contract has two-step admin capability
  const adminRole = useMemo((): RoleWithDescription | null => {
    // FR-001b: If capability is not available, don't display Admin role
    if (!hasTwoStepAdmin) {
      return null;
    }

    // FR-001c: Handle null adminInfo gracefully - don't display Admin role
    if (!adminInfo) {
      return null;
    }

    // Handle renounced state - show role with no admin if state is 'renounced'
    // For active/pending/expired states, show the admin if present
    const adminAddress = adminInfo.admin;

    // If no admin (renounced), still show the role but with empty members
    // Edge Case: "No Admin (Renounced)" - shows role with "No Admin (Renounced)" status
    const members = adminAddress ? [adminAddress] : [];

    const customDescription = customDescriptions[ADMIN_ROLE_ID];

    return {
      roleId: ADMIN_ROLE_ID,
      roleName: ADMIN_ROLE_NAME,
      description: customDescription ?? ADMIN_ROLE_DESCRIPTION,
      isCustomDescription: !!customDescription,
      members,
      isOwnerRole: false,
      isAdminRole: true,
      isHashDisplay: false,
    };
  }, [hasTwoStepAdmin, adminInfo, customDescriptions]);

  // Transform adapter roles with description priority resolution (T022)
  // Note: RoleAssignment from adapter has { role: { id, label? }, members: string[] }
  // T046: Implements fallback to role ID hash when name unavailable (US4.3)
  // T016: Add isAdminRole: false default to all enumerated roles
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
        isAdminRole: false, // T016: All enumerated roles default to non-admin
        // T018: Determine if role name is a hash for AddressDisplay rendering
        isHashDisplay: isRoleDisplayHash(assignment.role.label, roleId),
      };
    });
  }, [adapterRoles, customDescriptions]);

  // T015: Combine owner role, admin role, and adapter roles
  // Order: [ownerRole?, adminRole?, ...enumeratedRoles]
  const roles = useMemo((): RoleWithDescription[] => {
    const result: RoleWithDescription[] = [];

    // Owner role first (if exists)
    if (ownerRole) {
      result.push(ownerRole);
    }

    // Admin role second (if exists)
    if (adminRole) {
      result.push(adminRole);
    }

    // Then enumerated roles
    result.push(...transformedRoles);

    return result;
  }, [ownerRole, adminRole, transformedRoles]);

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

  // Include contract registration waiting period in loading state
  // When contract is selected but not yet registered, queries are disabled
  // and their isLoading is false, but we're still "loading" from user perspective
  const isWaitingForRegistration = !!selectedContract && !isContractRegistered;

  // Feature 016: Include admin loading state
  const isLoading =
    isWaitingForRegistration ||
    isCapabilitiesLoading ||
    isRolesLoading ||
    isOwnershipLoading ||
    isAdminLoading;
  // T051: isRefreshing is true when we have data but are fetching in the background
  const isRefreshing = !isLoading && (isRolesFetching || isOwnershipFetching || isAdminFetching);
  const hasError = !!capabilitiesError || hasRolesError;
  const errorMessage = rolesErrorMessage ?? capabilitiesError?.message ?? null;
  const canRetry = canRetryRoles || !!capabilitiesError;

  // =============================================================================
  // Actions
  // =============================================================================

  // Combined refetch function (Feature 016: include admin refetch)
  // Always include admin info refetch — React Query handles disabled queries gracefully,
  // and contracts with hasAdminDelayManagement also need admin data refreshed.
  const refetch = useCallback(async (): Promise<void> => {
    await Promise.all([refetchRoles(), refetchOwnership(), refetchAdminInfo()]);
  }, [refetchRoles, refetchOwnership, refetchAdminInfo]);

  // Wrapped refetchAdminInfo for external use
  const refetchAdminInfoCallback = useCallback(async (): Promise<void> => {
    await refetchAdminInfo();
  }, [refetchAdminInfo]);

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

  // Feature 015 Phase 6 (T026, T027, T028): Extract full pending transfer info and ownership state
  // The OwnershipInfo type includes pendingTransfer and state fields
  const ownershipWithPending = ownership as {
    pendingTransfer?: PendingOwnershipTransfer;
    state?: OwnershipState;
  } | null;

  const pendingTransfer = ownershipWithPending?.pendingTransfer ?? null;
  const ownershipState = ownershipWithPending?.state ?? null;

  // Feature 015: Extract pending owner from pendingTransfer (for Accept Ownership button)
  const pendingOwner = pendingTransfer?.pendingOwner ?? null;

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
      isAdminLoading: false,
      isRefreshing: false,
      hasError: false,
      errorMessage: null,
      canRetry: false,
      refetch: async () => {},
      updateRoleDescription: async () => {},
      connectedAddress: null,
      connectedRoleIds: [],
      roleIdentifiers: [],
      pendingOwner: null,
      pendingTransfer: null,
      ownershipState: null,
      currentBlock: null,
      ownershipExpirationMetadata: undefined,
      adminExpirationMetadata: undefined,
      // Feature 016: Admin-related properties
      adminInfo: null,
      pendingAdminTransfer: null,
      adminState: null,
      refetchAdminInfo: async () => {},
    };
  }

  // Feature 016: Extract admin-related info
  const pendingAdminTransfer = adminInfo?.pendingTransfer ?? null;
  const adminState = adminInfo?.state ?? null;

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
    isAdminLoading,
    isRefreshing,
    hasError,
    errorMessage,
    canRetry,
    refetch,
    updateRoleDescription,
    connectedAddress: connectedAddress ?? null,
    connectedRoleIds,
    roleIdentifiers,
    pendingOwner,
    pendingTransfer,
    ownershipState,
    currentBlock,
    ownershipExpirationMetadata,
    adminExpirationMetadata,
    // Feature 016: Admin-related properties
    adminInfo,
    pendingAdminTransfer,
    adminState,
    refetchAdminInfo: refetchAdminInfoCallback,
  };
}
