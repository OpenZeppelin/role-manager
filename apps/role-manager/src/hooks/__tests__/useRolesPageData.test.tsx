/**
 * Tests for useRolesPageData hook
 * Feature: 009-roles-page-data
 *
 * TDD tests for the data orchestration hook that combines:
 * - useContractCapabilities for feature detection
 * - useContractRoles for role assignments
 * - useContractOwnership for ownership
 * - useCustomRoleDescriptions for user-provided descriptions
 */
import 'fake-indexeddb/auto';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  AccessControlCapabilities,
  OwnershipInfo,
  RoleAssignment,
} from '@openzeppelin/ui-types';

import { useRolesPageData } from '../useRolesPageData';

// =============================================================================
// Mock Setup
// =============================================================================

const mockCapabilities: AccessControlCapabilities = {
  hasAccessControl: true,
  hasTwoStepAdmin: false,
  hasOwnable: true,
  hasTwoStepOwnable: false,
  hasEnumerableRoles: false,
  supportsHistory: false,
  verifiedAgainstOZInterfaces: true,
};

const mockRoles: RoleAssignment[] = [
  {
    role: { id: 'ADMIN_ROLE', label: 'Admin' },
    members: ['0x1234567890123456789012345678901234567890'],
  },
  {
    role: { id: 'MINTER_ROLE', label: 'Minter' },
    members: [
      '0xabcdef1234567890abcdef1234567890abcdef12',
      '0x9876543210987654321098765432109876543210',
    ],
  },
];

const mockOwnership: OwnershipInfo = {
  owner: '0xowner1234567890123456789012345678901234',
};

const mockCustomDescriptions = {
  MINTER_ROLE: 'Custom minter description',
};

// Mock modules
const mockUseContractCapabilities = vi.fn();
const mockUseContractRoles = vi.fn();
const mockUseContractOwnership = vi.fn();
const mockUseCustomRoleDescriptions = vi.fn();
const mockUseSelectedContract = vi.fn();

vi.mock('../useContractCapabilities', () => ({
  useContractCapabilities: (...args: unknown[]) => mockUseContractCapabilities(...args),
}));

vi.mock('../useContractData', () => ({
  useContractRoles: (...args: unknown[]) => mockUseContractRoles(...args),
  useContractOwnership: (...args: unknown[]) => mockUseContractOwnership(...args),
  useContractAdminInfo: () => ({
    adminInfo: null,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
    hasAdmin: false,
    canRetry: false,
    errorMessage: null,
    hasError: false,
  }),
}));

vi.mock('../useCustomRoleDescriptions', () => ({
  useCustomRoleDescriptions: (...args: unknown[]) => mockUseCustomRoleDescriptions(...args),
}));

vi.mock('../useSelectedContract', () => ({
  useSelectedContract: () => mockUseSelectedContract(),
}));

// Mock useDerivedAccountStatus from react-core (spec 013)
const mockUseDerivedAccountStatus = vi.fn();

vi.mock('@openzeppelin/ui-react', () => ({
  useDerivedAccountStatus: () => mockUseDerivedAccountStatus(),
}));

// =============================================================================
// Test Utilities
// =============================================================================

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function setupDefaultMocks() {
  mockUseSelectedContract.mockReturnValue({
    selectedContract: {
      id: 'contract-123',
      address: '0xcontract123',
      networkId: 'stellar-testnet',
      label: 'Test Contract',
    },
    adapter: { id: 'test-adapter' },
    isAdapterLoading: false,
    isContractRegistered: true,
  });

  mockUseContractCapabilities.mockReturnValue({
    capabilities: mockCapabilities,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    isSupported: true,
  });

  mockUseContractRoles.mockReturnValue({
    roles: mockRoles,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    isEmpty: false,
    totalMemberCount: 3,
    hasError: false,
    canRetry: false,
    errorMessage: null,
  });

  mockUseContractOwnership.mockReturnValue({
    ownership: mockOwnership,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    hasOwner: true,
    hasError: false,
    canRetry: false,
    errorMessage: null,
  });

  mockUseCustomRoleDescriptions.mockReturnValue({
    descriptions: mockCustomDescriptions,
    isLoading: false,
    updateDescription: vi.fn().mockResolvedValue(undefined),
    clearDescription: vi.fn().mockResolvedValue(undefined),
  });

  // Default: no wallet connected
  mockUseDerivedAccountStatus.mockReturnValue({
    isConnected: false,
    address: undefined,
    chainId: undefined,
  });
}

// =============================================================================
// Tests
// =============================================================================

describe('useRolesPageData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization and loading states', () => {
    it('should return isLoading=true when capabilities are loading', () => {
      mockUseContractCapabilities.mockReturnValue({
        capabilities: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
        isSupported: false,
      });

      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isCapabilitiesLoading).toBe(true);
    });

    it('should return isLoading=true when roles are loading', () => {
      mockUseContractRoles.mockReturnValue({
        roles: [],
        isLoading: true,
        error: null,
        refetch: vi.fn(),
        isEmpty: true,
        totalMemberCount: 0,
        hasError: false,
        canRetry: false,
        errorMessage: null,
      });

      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isRolesLoading).toBe(true);
    });

    it('should return isLoading=true when ownership is loading', () => {
      mockUseContractOwnership.mockReturnValue({
        ownership: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
        hasOwner: false,
        hasError: false,
        canRetry: false,
        errorMessage: null,
      });

      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isOwnershipLoading).toBe(true);
    });

    it('should return isLoading=false when all data is loaded', () => {
      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isCapabilitiesLoading).toBe(false);
      expect(result.current.isRolesLoading).toBe(false);
      expect(result.current.isOwnershipLoading).toBe(false);
    });
  });

  describe('capability detection integration (T018)', () => {
    it('should pass adapter, contract address, and isContractRegistered to useContractCapabilities', () => {
      renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      expect(mockUseContractCapabilities).toHaveBeenCalledWith(
        { id: 'test-adapter' },
        '0xcontract123',
        true // isContractRegistered
      );
    });

    it('should return capabilities from useContractCapabilities', () => {
      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      expect(result.current.capabilities).toEqual(mockCapabilities);
    });

    it('should set isSupported based on capabilities', () => {
      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      expect(result.current.isSupported).toBe(true);
    });

    it('should return isSupported=false when no access control or ownable', () => {
      mockUseContractCapabilities.mockReturnValue({
        capabilities: {
          hasAccessControl: false,
          hasOwnable: false,
          hasEnumerableRoles: false,
          supportsHistory: false,
          verifiedAgainstOZInterfaces: false,
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSupported: false,
      });

      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      expect(result.current.isSupported).toBe(false);
    });
  });

  describe('roles fetching integration (T019)', () => {
    it('should pass adapter, contract address, and isContractRegistered to useContractRoles', () => {
      renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      expect(mockUseContractRoles).toHaveBeenCalledWith(
        { id: 'test-adapter' },
        '0xcontract123',
        true // isContractRegistered
      );
    });

    it('should include roles from useContractRoles in output', () => {
      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      // Should have owner role + 2 adapter roles
      expect(result.current.roles.length).toBe(3);
      expect(result.current.roles.some((r) => r.roleId === 'ADMIN_ROLE')).toBe(true);
      expect(result.current.roles.some((r) => r.roleId === 'MINTER_ROLE')).toBe(true);
    });
  });

  describe('ownership fetching integration (T020)', () => {
    it('should pass adapter, contract address, and isContractRegistered to useContractOwnership', () => {
      renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      expect(mockUseContractOwnership).toHaveBeenCalledWith(
        { id: 'test-adapter' },
        '0xcontract123',
        true // isContractRegistered
      );
    });

    it('should use ownership data for Owner role', () => {
      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      const ownerRole = result.current.roles.find((r) => r.roleId === 'OWNER_ROLE');
      expect(ownerRole).toBeDefined();
      expect(ownerRole?.members).toContain('0xowner1234567890123456789012345678901234');
    });
  });

  describe('Owner role synthesis (T021)', () => {
    it('should synthesize Owner role when hasOwnable and owner exists', () => {
      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      const ownerRole = result.current.roles.find((r) => r.roleId === 'OWNER_ROLE');
      expect(ownerRole).toBeDefined();
      expect(ownerRole?.roleName).toBe('Owner');
      expect(ownerRole?.isOwnerRole).toBe(true);
      expect(ownerRole?.members).toHaveLength(1);
    });

    it('should prepend Owner role to roles list', () => {
      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      expect(result.current.roles[0].roleId).toBe('OWNER_ROLE');
    });

    it('should not include Owner role when hasOwnable is false', () => {
      mockUseContractCapabilities.mockReturnValue({
        capabilities: {
          hasAccessControl: true,
          hasOwnable: false,
          hasEnumerableRoles: false,
          supportsHistory: false,
          verifiedAgainstOZInterfaces: true,
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isSupported: true,
      });

      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      const ownerRole = result.current.roles.find((r) => r.roleId === 'OWNER_ROLE');
      expect(ownerRole).toBeUndefined();
    });

    it('should not include Owner role when owner is null', () => {
      mockUseContractOwnership.mockReturnValue({
        ownership: { owner: null },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        hasOwner: false,
        hasError: false,
        canRetry: false,
        errorMessage: null,
      });

      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      const ownerRole = result.current.roles.find((r) => r.roleId === 'OWNER_ROLE');
      expect(ownerRole).toBeUndefined();
    });

    it('should set default description for Owner role', () => {
      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      const ownerRole = result.current.roles.find((r) => r.roleId === 'OWNER_ROLE');
      expect(ownerRole?.description).toBe('Contract owner with full administrative privileges');
    });
  });

  describe('description priority resolution (T022)', () => {
    it('should prioritize custom description over adapter (which has no description field)', () => {
      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      const minterRole = result.current.roles.find((r) => r.roleId === 'MINTER_ROLE');
      expect(minterRole?.description).toBe('Custom minter description');
      expect(minterRole?.isCustomDescription).toBe(true);
    });

    it('should return null description when no custom description exists (adapter provides no description)', () => {
      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      const adminRole = result.current.roles.find((r) => r.roleId === 'ADMIN_ROLE');
      // Adapter RoleAssignment doesn't have description field, so it's null unless custom
      expect(adminRole?.description).toBeNull();
      expect(adminRole?.isCustomDescription).toBe(false);
    });

    it('should return null description when neither custom nor adapter provides one', () => {
      mockUseContractRoles.mockReturnValue({
        roles: [
          {
            role: { id: 'EMPTY_ROLE', label: 'Empty' },
            members: [],
          },
        ],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isEmpty: false,
        totalMemberCount: 0,
        hasError: false,
        canRetry: false,
        errorMessage: null,
      });

      mockUseCustomRoleDescriptions.mockReturnValue({
        descriptions: {},
        isLoading: false,
        updateDescription: vi.fn(),
        clearDescription: vi.fn(),
      });

      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      const emptyRole = result.current.roles.find((r) => r.roleId === 'EMPTY_ROLE');
      expect(emptyRole?.description).toBeNull();
      expect(emptyRole?.isCustomDescription).toBe(false);
    });
  });

  describe('role selection state management (T023)', () => {
    it('should default to first role when no role is selected', () => {
      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      expect(result.current.selectedRoleId).toBe('OWNER_ROLE');
      expect(result.current.selectedRole?.roleId).toBe('OWNER_ROLE');
    });

    it('should allow setting selected role via setSelectedRoleId', async () => {
      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      act(() => {
        result.current.setSelectedRoleId('ADMIN_ROLE');
      });

      expect(result.current.selectedRoleId).toBe('ADMIN_ROLE');
      expect(result.current.selectedRole?.roleId).toBe('ADMIN_ROLE');
    });

    it('should return selectedRole as null when no roles exist', () => {
      mockUseContractRoles.mockReturnValue({
        roles: [],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isEmpty: true,
        totalMemberCount: 0,
        hasError: false,
        canRetry: false,
        errorMessage: null,
      });

      mockUseContractOwnership.mockReturnValue({
        ownership: null,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        hasOwner: false,
        hasError: false,
        canRetry: false,
        errorMessage: null,
      });

      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      expect(result.current.selectedRole).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should return hasError=true when roles fetch fails', () => {
      mockUseContractRoles.mockReturnValue({
        roles: [],
        isLoading: false,
        error: new Error('Roles fetch failed'),
        refetch: vi.fn(),
        isEmpty: true,
        totalMemberCount: 0,
        hasError: true,
        canRetry: true,
        errorMessage: 'Failed to load roles',
      });

      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      expect(result.current.hasError).toBe(true);
      expect(result.current.errorMessage).toBe('Failed to load roles');
      expect(result.current.canRetry).toBe(true);
    });

    it('should return hasError=true when capabilities fetch fails', () => {
      mockUseContractCapabilities.mockReturnValue({
        capabilities: null,
        isLoading: false,
        error: new Error('Capabilities fetch failed'),
        refetch: vi.fn(),
        isSupported: false,
      });

      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      expect(result.current.hasError).toBe(true);
    });

    it('should handle partial data when ownership fails but roles succeed (T042)', () => {
      mockUseContractOwnership.mockReturnValue({
        ownership: null,
        isLoading: false,
        error: new Error('Ownership fetch failed'),
        refetch: vi.fn(),
        hasOwner: false,
        hasError: true,
        canRetry: true,
        errorMessage: 'Failed to load ownership',
      });

      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      // Should still display roles even if ownership fails
      expect(result.current.roles.length).toBeGreaterThan(0);
      // Should not include Owner role
      expect(result.current.roles.find((r) => r.roleId === 'OWNER_ROLE')).toBeUndefined();
    });
  });

  describe('refetch functionality', () => {
    it('should expose refetch function', () => {
      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      expect(result.current.refetch).toBeDefined();
      expect(typeof result.current.refetch).toBe('function');
    });

    it('should call refetch on all underlying hooks when refetch is called', async () => {
      const mockRolesRefetch = vi.fn().mockResolvedValue(undefined);
      const mockOwnershipRefetch = vi.fn().mockResolvedValue(undefined);
      const mockCapabilitiesRefetch = vi.fn().mockResolvedValue(undefined);

      mockUseContractCapabilities.mockReturnValue({
        capabilities: mockCapabilities,
        isLoading: false,
        error: null,
        refetch: mockCapabilitiesRefetch,
        isSupported: true,
      });

      mockUseContractRoles.mockReturnValue({
        roles: mockRoles,
        isLoading: false,
        error: null,
        refetch: mockRolesRefetch,
        isEmpty: false,
        totalMemberCount: 3,
        hasError: false,
        canRetry: false,
        errorMessage: null,
      });

      mockUseContractOwnership.mockReturnValue({
        ownership: mockOwnership,
        isLoading: false,
        error: null,
        refetch: mockOwnershipRefetch,
        hasOwner: true,
        hasError: false,
        canRetry: false,
        errorMessage: null,
      });

      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockRolesRefetch).toHaveBeenCalled();
      expect(mockOwnershipRefetch).toHaveBeenCalled();
    });
  });

  describe('updateRoleDescription', () => {
    it('should expose updateRoleDescription function', () => {
      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      expect(result.current.updateRoleDescription).toBeDefined();
      expect(typeof result.current.updateRoleDescription).toBe('function');
    });

    it('should call useCustomRoleDescriptions.updateDescription', async () => {
      const mockUpdateDescription = vi.fn().mockResolvedValue(undefined);
      mockUseCustomRoleDescriptions.mockReturnValue({
        descriptions: {},
        isLoading: false,
        updateDescription: mockUpdateDescription,
        clearDescription: vi.fn(),
      });

      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.updateRoleDescription('ADMIN_ROLE', 'New description');
      });

      expect(mockUpdateDescription).toHaveBeenCalledWith('ADMIN_ROLE', 'New description');
    });
  });

  describe('connected wallet', () => {
    it('should return connectedAddress as null when wallet is not connected', () => {
      mockUseDerivedAccountStatus.mockReturnValue({
        isConnected: false,
        address: undefined,
        chainId: undefined,
      });

      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      expect(result.current.connectedAddress).toBeNull();
    });

    it('should return connectedAddress when wallet is connected', () => {
      const connectedAddr = '0xConnectedUser123456789012345678901234';
      mockUseDerivedAccountStatus.mockReturnValue({
        isConnected: true,
        address: connectedAddr,
        chainId: 1,
      });

      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      expect(result.current.connectedAddress).toBe(connectedAddr);
    });

    it('should compute connectedRoleIds based on connected address', () => {
      const connectedAddr = '0xconnectedaddress123456789012345678901234';

      // Mock connected wallet
      mockUseDerivedAccountStatus.mockReturnValue({
        isConnected: true,
        address: connectedAddr,
        chainId: 1,
      });

      // Mock that connected address is in ADMIN_ROLE members
      mockUseContractRoles.mockReturnValue({
        roles: [
          {
            role: { id: 'ADMIN_ROLE', label: 'Admin' },
            members: [connectedAddr],
          },
          {
            role: { id: 'MINTER_ROLE', label: 'Minter' },
            members: ['0xsomeoneelse12345678901234567890123456'],
          },
        ],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isEmpty: false,
        totalMemberCount: 2,
        hasError: false,
        canRetry: false,
        errorMessage: null,
      });

      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      expect(result.current.connectedRoleIds).toEqual(['ADMIN_ROLE']);
    });

    it('should handle case-insensitive address matching for connectedRoleIds', () => {
      // Connected address in lowercase
      const connectedAddr = '0xconnectedaddress123456789012345678901234';

      mockUseDerivedAccountStatus.mockReturnValue({
        isConnected: true,
        address: connectedAddr,
        chainId: 1,
      });

      // Role members in mixed case
      mockUseContractRoles.mockReturnValue({
        roles: [
          {
            role: { id: 'ADMIN_ROLE', label: 'Admin' },
            members: ['0xCONNECTEDADDRESS123456789012345678901234'], // uppercase
          },
        ],
        isLoading: false,
        error: null,
        refetch: vi.fn(),
        isEmpty: false,
        totalMemberCount: 1,
        hasError: false,
        canRetry: false,
        errorMessage: null,
      });

      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      expect(result.current.connectedRoleIds).toEqual(['ADMIN_ROLE']);
    });
  });

  describe('role identifiers', () => {
    it('should compute roleIdentifiers from roles', () => {
      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      expect(result.current.roleIdentifiers).toBeDefined();
      expect(Array.isArray(result.current.roleIdentifiers)).toBe(true);
      expect(result.current.roleIdentifiers.length).toBeGreaterThan(0);
    });

    it('should include identifier, name, and description in roleIdentifiers', () => {
      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      const adminIdentifier = result.current.roleIdentifiers.find(
        (r) => r.identifier === 'ADMIN_ROLE'
      );
      expect(adminIdentifier).toBeDefined();
      expect(adminIdentifier?.name).toBe('Admin');
      expect(adminIdentifier?.description).toBeDefined();
    });
  });

  describe('no contract selected', () => {
    it('should handle no selected contract gracefully', () => {
      mockUseSelectedContract.mockReturnValue({
        selectedContract: null,
        adapter: null,
        isAdapterLoading: false,
      });

      const { result } = renderHook(() => useRolesPageData(), { wrapper: createWrapper() });

      expect(result.current.roles).toEqual([]);
      expect(result.current.isSupported).toBe(false);
    });
  });
});
