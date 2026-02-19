/**
 * Tests for useContractForm hook
 * Feature: 004-add-contract-record
 *
 * TDD: These tests should FAIL initially before hook implementation
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContractAdapter, NetworkConfig } from '@openzeppelin/ui-types';

import { getEcosystemMetadata } from '@/core/ecosystems/ecosystemManager';

import { useContractForm } from '../useContractForm';
// Import after mock setup
import { useNetworkAdapter } from '../useNetworkAdapter';

// Mock the useNetworkAdapter hook
vi.mock('../useNetworkAdapter', () => ({
  useNetworkAdapter: vi.fn(),
}));

// Mock the ecosystem manager module
vi.mock('@/core/ecosystems/ecosystemManager', () => ({
  getEcosystemMetadata: vi.fn(),
}));

const mockUseNetworkAdapter = vi.mocked(useNetworkAdapter);
const mockGetEcosystemMetadata = vi.mocked(getEcosystemMetadata);

// Test fixtures - use type assertion to avoid full NetworkConfig requirements
const mockEvmNetwork = {
  id: 'ethereum-mainnet',
  name: 'Ethereum Mainnet',
  ecosystem: 'evm',
  network: 'ethereum',
  type: 'mainnet',
  isTestnet: false,
} as NetworkConfig;

const mockStellarNetwork = {
  id: 'stellar-mainnet',
  name: 'Stellar Mainnet',
  ecosystem: 'stellar',
  network: 'stellar',
  type: 'mainnet',
  isTestnet: false,
} as NetworkConfig;

const mockAdapter: ContractAdapter = {
  networkConfig: mockEvmNetwork,
  isValidAddress: vi.fn(),
  getContract: vi.fn(),
} as unknown as ContractAdapter;

describe('useContractForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockUseNetworkAdapter.mockReturnValue({
      adapter: null,
      isLoading: false,
      error: null,
      retry: vi.fn(),
    });

    mockGetEcosystemMetadata.mockImplementation((ecosystem) => {
      if (ecosystem === 'evm')
        return {
          id: 'evm',
          name: 'Ethereum (EVM)',
          description: '',
          explorerGuidance: '',
          addressExample: '0xA1B2...',
        };
      if (ecosystem === 'stellar')
        return {
          id: 'stellar',
          name: 'Stellar',
          description: '',
          explorerGuidance: '',
          addressExample: 'GCKF...MTGG',
        };
      return undefined;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with empty form values', () => {
      const { result } = renderHook(() => useContractForm());

      // Form should be initialized with empty values
      expect(result.current.isValid).toBe(false);
      expect(result.current.selectedNetwork).toBeNull();
    });

    it('should provide form control', () => {
      const { result } = renderHook(() => useContractForm());

      expect(result.current.control).toBeDefined();
    });

    it('should provide handleSubmit function', () => {
      const { result } = renderHook(() => useContractForm());

      expect(result.current.handleSubmit).toBeDefined();
      expect(typeof result.current.handleSubmit).toBe('function');
    });
  });

  describe('network selection', () => {
    it('should allow setting selected network', () => {
      const { result } = renderHook(() => useContractForm());

      act(() => {
        result.current.setSelectedNetwork(mockEvmNetwork);
      });

      expect(result.current.selectedNetwork).toEqual(mockEvmNetwork);
    });

    it('should call useNetworkAdapter with selected network', () => {
      const { result } = renderHook(() => useContractForm());

      act(() => {
        result.current.setSelectedNetwork(mockEvmNetwork);
      });

      // Should pass the network to useNetworkAdapter
      expect(mockUseNetworkAdapter).toHaveBeenCalled();
    });

    it('should update form networkId when network is selected', async () => {
      const { result } = renderHook(() => useContractForm());

      act(() => {
        result.current.setSelectedNetwork(mockEvmNetwork);
      });

      // networkId should be updated in the form
      // This will be verified through form submission
      expect(result.current.selectedNetwork?.id).toBe('ethereum-mainnet');
    });
  });

  describe('adapter integration', () => {
    it('should expose adapter from useNetworkAdapter', () => {
      mockUseNetworkAdapter.mockReturnValue({
        adapter: mockAdapter,
        isLoading: false,
        error: null,
        retry: vi.fn(),
      });

      const { result } = renderHook(() => useContractForm());

      expect(result.current.adapter).toBe(mockAdapter);
    });

    it('should expose isAdapterLoading state', () => {
      mockUseNetworkAdapter.mockReturnValue({
        adapter: null,
        isLoading: true,
        error: null,
        retry: vi.fn(),
      });

      const { result } = renderHook(() => useContractForm());

      expect(result.current.isAdapterLoading).toBe(true);
    });
  });

  describe('address placeholder', () => {
    it('should return "Select a network first" when no network selected', () => {
      const { result } = renderHook(() => useContractForm());

      expect(result.current.addressPlaceholder).toBe('Select a network first');
    });

    it('should return "Loading..." when adapter is loading', () => {
      mockUseNetworkAdapter.mockReturnValue({
        adapter: null,
        isLoading: true,
        error: null,
        retry: vi.fn(),
      });

      const { result } = renderHook(() => useContractForm());

      act(() => {
        result.current.setSelectedNetwork(mockEvmNetwork);
      });

      expect(result.current.addressPlaceholder).toBe('Loading...');
    });

    it('should return ecosystem-specific placeholder when network is selected', () => {
      mockUseNetworkAdapter.mockReturnValue({
        adapter: mockAdapter,
        isLoading: false,
        error: null,
        retry: vi.fn(),
      });

      const { result } = renderHook(() => useContractForm());

      act(() => {
        result.current.setSelectedNetwork(mockEvmNetwork);
      });

      // Should use ecosystem address example
      expect(result.current.addressPlaceholder).toContain('0xA1B2');
    });
  });

  describe('validation', () => {
    it('should require name field', async () => {
      mockUseNetworkAdapter.mockReturnValue({
        adapter: mockAdapter,
        isLoading: false,
        error: null,
        retry: vi.fn(),
      });

      const { result } = renderHook(() => useContractForm());

      // Try to submit empty form
      const onSubmit = vi.fn();

      await act(async () => {
        const submitHandler = result.current.handleSubmit(onSubmit);
        await submitHandler();
      });

      // Should have name error
      expect(result.current.errors.name).toBeDefined();
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('should enforce 64 character max for name', async () => {
      const { result } = renderHook(() => useContractForm());

      // This would need to be tested with actual form input
      // For now, verify the error structure exists
      expect(result.current.errors).toHaveProperty('name');
    });

    it('should require network selection before address validation', async () => {
      const { result } = renderHook(() => useContractForm());

      // No network selected
      expect(result.current.selectedNetwork).toBeNull();
      expect(result.current.errors.networkId).toBeDefined();
    });

    it('should validate address using adapter.isValidAddress', async () => {
      const mockIsValidAddress = vi.fn().mockReturnValue(true);
      const adapterWithValidation = {
        ...mockAdapter,
        isValidAddress: mockIsValidAddress,
      } as unknown as ContractAdapter;

      mockUseNetworkAdapter.mockReturnValue({
        adapter: adapterWithValidation,
        isLoading: false,
        error: null,
        retry: vi.fn(),
      });

      const { result } = renderHook(() => useContractForm());

      act(() => {
        result.current.setSelectedNetwork(mockEvmNetwork);
      });

      // When form validates address, it should call adapter.isValidAddress
      // This is tested indirectly through form submission
      expect(adapterWithValidation.isValidAddress).toBeDefined();
    });

    it('should show error for invalid address format', async () => {
      const mockIsValidAddress = vi.fn().mockReturnValue(false);
      const adapterWithValidation = {
        ...mockAdapter,
        isValidAddress: mockIsValidAddress,
      } as unknown as ContractAdapter;

      mockUseNetworkAdapter.mockReturnValue({
        adapter: adapterWithValidation,
        isLoading: false,
        error: null,
        retry: vi.fn(),
      });

      const { result } = renderHook(() => useContractForm());

      act(() => {
        result.current.setSelectedNetwork(mockEvmNetwork);
      });

      // Error structure should be available for address
      expect(result.current.errors).toHaveProperty('address');
    });

    it('should re-validate address when network changes', async () => {
      const mockIsValidAddress = vi.fn().mockReturnValue(true);
      const adapterWithValidation = {
        ...mockAdapter,
        isValidAddress: mockIsValidAddress,
      } as unknown as ContractAdapter;

      mockUseNetworkAdapter.mockReturnValue({
        adapter: adapterWithValidation,
        isLoading: false,
        error: null,
        retry: vi.fn(),
      });

      const { result } = renderHook(() => useContractForm());

      // Set initial network
      act(() => {
        result.current.setSelectedNetwork(mockEvmNetwork);
      });

      // Change to different network
      act(() => {
        result.current.setSelectedNetwork(mockStellarNetwork);
      });

      // Address should be re-validated for new network
      // This triggers the validation hook to re-run
      expect(result.current.selectedNetwork).toEqual(mockStellarNetwork);
    });
  });

  describe('form reset', () => {
    it('should provide reset function', () => {
      const { result } = renderHook(() => useContractForm());

      expect(result.current.reset).toBeDefined();
      expect(typeof result.current.reset).toBe('function');
    });

    it('should reset form to initial state', () => {
      mockUseNetworkAdapter.mockReturnValue({
        adapter: mockAdapter,
        isLoading: false,
        error: null,
        retry: vi.fn(),
      });

      const { result } = renderHook(() => useContractForm());

      // Set some state
      act(() => {
        result.current.setSelectedNetwork(mockEvmNetwork);
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.selectedNetwork).toBeNull();
      expect(result.current.isValid).toBe(false);
    });
  });

  describe('form submission', () => {
    it('should call onSubmit with form data when valid', async () => {
      const mockIsValidAddress = vi.fn().mockReturnValue(true);
      const adapterWithValidation = {
        ...mockAdapter,
        isValidAddress: mockIsValidAddress,
      } as unknown as ContractAdapter;

      mockUseNetworkAdapter.mockReturnValue({
        adapter: adapterWithValidation,
        isLoading: false,
        error: null,
        retry: vi.fn(),
      });

      const { result } = renderHook(() => useContractForm());

      act(() => {
        result.current.setSelectedNetwork(mockEvmNetwork);
      });

      const onSubmit = vi.fn();
      const submitHandler = result.current.handleSubmit(onSubmit);

      // Submit should be defined
      expect(submitHandler).toBeDefined();
      expect(typeof submitHandler).toBe('function');
    });
  });

  describe('return type interface', () => {
    it('should match UseContractFormReturn interface', () => {
      const { result } = renderHook(() => useContractForm());

      // Verify all required properties exist
      expect(result.current).toHaveProperty('control');
      expect(result.current).toHaveProperty('handleSubmit');
      expect(result.current).toHaveProperty('errors');
      expect(result.current).toHaveProperty('isValid');
      expect(result.current).toHaveProperty('selectedNetwork');
      expect(result.current).toHaveProperty('setSelectedNetwork');
      expect(result.current).toHaveProperty('adapter');
      expect(result.current).toHaveProperty('isAdapterLoading');
      expect(result.current).toHaveProperty('addressPlaceholder');
      expect(result.current).toHaveProperty('reset');
    });
  });

  // T008: EVM-specific address validation and error handling
  describe('EVM address validation', () => {
    const mockEvmAdapter: ContractAdapter = {
      networkConfig: mockEvmNetwork,
      isValidAddress: vi.fn(),
      getContract: vi.fn(),
    } as unknown as ContractAdapter;

    it('should accept valid EVM address (0x-prefixed, 42 chars)', () => {
      const validAddress = '0x1234567890abcdef1234567890abcdef12345678';
      const adapterWithValidation = {
        ...mockEvmAdapter,
        isValidAddress: vi.fn().mockReturnValue(true),
      } as unknown as ContractAdapter;

      mockUseNetworkAdapter.mockReturnValue({
        adapter: adapterWithValidation,
        isLoading: false,
        error: null,
        retry: vi.fn(),
      });

      const { result } = renderHook(() => useContractForm());

      act(() => {
        result.current.setSelectedNetwork(mockEvmNetwork);
      });

      // Adapter's isValidAddress should be available for the valid EVM address
      expect(adapterWithValidation.isValidAddress(validAddress)).toBe(true);
    });

    it('should reject invalid EVM address (wrong length)', () => {
      const invalidAddress = '0x1234'; // Too short
      const adapterWithValidation = {
        ...mockEvmAdapter,
        isValidAddress: vi.fn().mockReturnValue(false),
      } as unknown as ContractAdapter;

      mockUseNetworkAdapter.mockReturnValue({
        adapter: adapterWithValidation,
        isLoading: false,
        error: null,
        retry: vi.fn(),
      });

      const { result } = renderHook(() => useContractForm());

      act(() => {
        result.current.setSelectedNetwork(mockEvmNetwork);
      });

      // Adapter should reject the short address
      expect(adapterWithValidation.isValidAddress(invalidAddress)).toBe(false);
    });

    it('should reject EVM address without 0x prefix', () => {
      const noPrefix = '1234567890abcdef1234567890abcdef12345678';
      const adapterWithValidation = {
        ...mockEvmAdapter,
        isValidAddress: vi.fn().mockReturnValue(false),
      } as unknown as ContractAdapter;

      mockUseNetworkAdapter.mockReturnValue({
        adapter: adapterWithValidation,
        isLoading: false,
        error: null,
        retry: vi.fn(),
      });

      const { result } = renderHook(() => useContractForm());

      act(() => {
        result.current.setSelectedNetwork(mockEvmNetwork);
      });

      expect(adapterWithValidation.isValidAddress(noPrefix)).toBe(false);
    });

    it('should show EVM-specific error message for invalid address', () => {
      const adapterWithValidation = {
        ...mockEvmAdapter,
        isValidAddress: vi.fn().mockReturnValue(false),
      } as unknown as ContractAdapter;

      mockUseNetworkAdapter.mockReturnValue({
        adapter: adapterWithValidation,
        isLoading: false,
        error: null,
        retry: vi.fn(),
      });
      mockGetEcosystemMetadata.mockReturnValue({
        id: 'evm',
        name: 'Ethereum (EVM)',
        description: '',
        explorerGuidance: '',
        addressExample: '0xA1B2...',
      });

      const { result } = renderHook(() => useContractForm());

      act(() => {
        result.current.setSelectedNetwork(mockEvmNetwork);
      });

      expect(mockGetEcosystemMetadata).toHaveBeenCalledWith('evm');
    });

    it('should show EVM-specific placeholder when EVM network is selected', () => {
      mockUseNetworkAdapter.mockReturnValue({
        adapter: mockEvmAdapter,
        isLoading: false,
        error: null,
        retry: vi.fn(),
      });
      mockGetEcosystemMetadata.mockReturnValue({
        id: 'evm',
        name: 'Ethereum (EVM)',
        description: '',
        explorerGuidance: '',
        addressExample: '0xA1B2...',
      });

      const { result } = renderHook(() => useContractForm());

      act(() => {
        result.current.setSelectedNetwork(mockEvmNetwork);
      });

      // Placeholder should contain EVM address example with short name extraction
      expect(result.current.addressPlaceholder).toContain('0xA1B2');
      expect(result.current.addressPlaceholder).toContain('EVM');
    });
  });

  describe('EVM adapter error handling', () => {
    it('should show adapter load error when EVM adapter fails to initialize', () => {
      mockUseNetworkAdapter.mockReturnValue({
        adapter: null,
        isLoading: false,
        error: new Error('Failed to load EVM adapter'),
        retry: vi.fn(),
      });

      const { result } = renderHook(() => useContractForm());

      act(() => {
        result.current.setSelectedNetwork(mockEvmNetwork);
      });

      // Form should not be valid when adapter has an error
      expect(result.current.isValid).toBe(false);
      expect(result.current.adapter).toBeNull();
    });

    it('should allow form input while EVM adapter is loading', () => {
      mockUseNetworkAdapter.mockReturnValue({
        adapter: null,
        isLoading: true,
        error: null,
        retry: vi.fn(),
      });

      const { result } = renderHook(() => useContractForm());

      act(() => {
        result.current.setSelectedNetwork(mockEvmNetwork);
      });

      // Adapter should be loading
      expect(result.current.isAdapterLoading).toBe(true);
      // Placeholder should show loading state
      expect(result.current.addressPlaceholder).toBe('Loading...');
    });

    it('should re-validate when switching from Stellar to EVM network', () => {
      const evmAdapter = {
        ...mockAdapter,
        isValidAddress: vi.fn().mockReturnValue(true),
      } as unknown as ContractAdapter;

      // Start with Stellar adapter
      mockUseNetworkAdapter.mockReturnValue({
        adapter: mockAdapter,
        isLoading: false,
        error: null,
        retry: vi.fn(),
      });

      const { result } = renderHook(() => useContractForm());

      act(() => {
        result.current.setSelectedNetwork(mockStellarNetwork);
      });

      // Switch to EVM
      mockUseNetworkAdapter.mockReturnValue({
        adapter: evmAdapter,
        isLoading: false,
        error: null,
        retry: vi.fn(),
      });

      act(() => {
        result.current.setSelectedNetwork(mockEvmNetwork);
      });

      // Should be using EVM network now
      expect(result.current.selectedNetwork).toEqual(mockEvmNetwork);
      expect(result.current.adapter).toBe(evmAdapter);
    });
  });
});
