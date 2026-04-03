/**
 * Tests for useNetworkAdapter hook
 * Feature: 004-add-contract-record
 *
 * TDD: These tests should FAIL initially before hook implementation
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NetworkConfig } from '@openzeppelin/ui-types';

import { getRuntime } from '@/core/ecosystems/ecosystemManager';
import type { RoleManagerRuntime } from '@/core/runtimeAdapter';

import { useNetworkAdapter } from '../useNetworkAdapter';

// Mock the ecosystemManager module
vi.mock('@/core/ecosystems/ecosystemManager', () => ({
  getRuntime: vi.fn(),
}));

vi.mock('@openzeppelin/ui-utils', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const mockGetRuntime = vi.mocked(getRuntime);

// Test fixtures - use partial type to avoid needing all NetworkConfig fields
const mockNetworkConfig = {
  id: 'ethereum-mainnet',
  name: 'Ethereum Mainnet',
  ecosystem: 'evm',
  network: 'ethereum',
  type: 'mainnet',
  isTestnet: false,
} as NetworkConfig;

function createMockRuntime(config: NetworkConfig = mockNetworkConfig): RoleManagerRuntime {
  return {
    networkConfig: config,
    addressing: {
      isValidAddress: vi.fn().mockReturnValue(true),
    },
    explorer: {
      getExplorerUrl: vi.fn().mockReturnValue(null),
      getExplorerTxUrl: vi.fn().mockReturnValue(null),
    },
    networkCatalog: {
      getNetworks: vi.fn().mockReturnValue([config]),
    },
    uiLabels: {
      getUiLabels: vi.fn().mockReturnValue({}),
    },
    contractLoading: {
      networkConfig: config,
      dispose: vi.fn(),
      loadContract: vi.fn(),
      loadContractWithMetadata: vi.fn(),
      getContractDefinitionInputs: vi.fn().mockReturnValue([]),
    },
    schema: {
      networkConfig: config,
      dispose: vi.fn(),
      getWritableFunctions: vi.fn().mockReturnValue([]),
      isViewFunction: vi.fn().mockReturnValue(false),
      filterAutoQueryableFunctions: vi.fn((functions) => functions),
    },
    typeMapping: {
      networkConfig: config,
      dispose: vi.fn(),
      mapParameterTypeToFieldType: vi.fn(),
      getCompatibleFieldTypes: vi.fn().mockReturnValue([]),
      generateDefaultField: vi.fn(),
      getTypeMappingInfo: vi.fn().mockReturnValue({}),
    },
    query: {
      networkConfig: config,
      dispose: vi.fn(),
      queryViewFunction: vi.fn(),
      formatFunctionResult: vi.fn(),
      getCurrentBlock: vi.fn(),
    },
    execution: {
      networkConfig: config,
      dispose: vi.fn(),
      formatTransactionData: vi.fn(),
      signAndBroadcast: vi.fn(),
      getSupportedExecutionMethods: vi.fn().mockResolvedValue([]),
      validateExecutionConfig: vi.fn().mockResolvedValue(true),
    },
    wallet: {
      networkConfig: config,
      dispose: vi.fn(),
      supportsWalletConnection: vi.fn().mockReturnValue(true),
      getAvailableConnectors: vi.fn().mockResolvedValue([]),
      connectWallet: vi.fn(),
      disconnectWallet: vi.fn(),
      getWalletConnectionStatus: vi.fn(),
    },
    uiKit: {
      networkConfig: config,
      dispose: vi.fn(),
      getAvailableUiKits: vi.fn().mockResolvedValue([]),
    },
    relayer: {
      networkConfig: config,
      dispose: vi.fn(),
      getRelayers: vi.fn(),
      getRelayer: vi.fn(),
      getNetworkServiceForms: vi.fn().mockReturnValue([]),
      getDefaultServiceConfig: vi.fn().mockReturnValue(null),
    },
    accessControl: {
      networkConfig: config,
      dispose: vi.fn(),
      getCapabilities: vi.fn(),
      getOwnership: vi.fn(),
      getCurrentRoles: vi.fn(),
      getCurrentRolesEnriched: vi.fn(),
      grantRole: vi.fn(),
      revokeRole: vi.fn(),
      transferOwnership: vi.fn(),
      exportSnapshot: vi.fn(),
      getHistory: vi.fn(),
    },
    dispose: vi.fn(),
  } as unknown as RoleManagerRuntime;
}

const mockRuntime = createMockRuntime();

describe('useNetworkAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRuntime.mockResolvedValue(mockRuntime);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return null runtime when networkConfig is null', () => {
      const { result } = renderHook(() => useNetworkAdapter(null));

      expect(result.current.runtime).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should start with loading state when networkConfig is provided', () => {
      mockGetRuntime.mockImplementationOnce(() => new Promise(() => {}));

      const { result } = renderHook(() => useNetworkAdapter(mockNetworkConfig));

      // Should be loading initially
      expect(result.current.isLoading).toBe(true);
      expect(result.current.runtime).toBeNull();
    });
  });

  describe('runtime loading', () => {
    it('should load runtime for given network config', async () => {
      const { result } = renderHook(() => useNetworkAdapter(mockNetworkConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetRuntime).toHaveBeenCalledWith(mockNetworkConfig);
      expect(result.current.runtime).toBe(mockRuntime);
      expect(result.current.error).toBeNull();
    });

    it('should update runtime when networkConfig changes', async () => {
      const stellarConfig = {
        id: 'stellar-mainnet',
        name: 'Stellar Mainnet',
        ecosystem: 'stellar',
        network: 'stellar',
        type: 'mainnet',
        isTestnet: false,
      } as NetworkConfig;

      const stellarRuntime = createMockRuntime(stellarConfig);

      mockGetRuntime.mockResolvedValueOnce(mockRuntime).mockResolvedValueOnce(stellarRuntime);

      const { result, rerender } = renderHook(({ config }) => useNetworkAdapter(config), {
        initialProps: { config: mockNetworkConfig },
      });

      await waitFor(() => {
        expect(result.current.runtime).toBe(mockRuntime);
      });

      // Change network config
      rerender({ config: stellarConfig });

      await waitFor(() => {
        expect(result.current.runtime).toBe(stellarRuntime);
      });

      expect(result.current.runtime?.networkConfig).toEqual(stellarConfig);
      expect(mockGetRuntime).toHaveBeenCalledTimes(2);
    });

    it('disposes the previous runtime after the replacement is promoted', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const stellarConfig = {
        id: 'stellar-mainnet',
        name: 'Stellar Mainnet',
        ecosystem: 'stellar',
        network: 'stellar',
        type: 'mainnet',
        isTestnet: false,
      } as NetworkConfig;

      const stellarRuntime = createMockRuntime(stellarConfig);

      mockGetRuntime.mockResolvedValueOnce(mockRuntime).mockResolvedValueOnce(stellarRuntime);

      const { result, rerender } = renderHook(({ config }) => useNetworkAdapter(config), {
        initialProps: { config: mockNetworkConfig },
      });

      await vi.advanceTimersByTimeAsync(0);
      await waitFor(() => {
        expect(result.current.runtime).toBe(mockRuntime);
      });

      expect(mockRuntime.dispose).not.toHaveBeenCalled();

      rerender({ config: stellarConfig });

      await vi.advanceTimersByTimeAsync(0);
      await waitFor(() => {
        expect(result.current.runtime).toBe(stellarRuntime);
      });

      await vi.advanceTimersByTimeAsync(0);
      expect(mockRuntime.dispose).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    it('should reset runtime to null and dispose when networkConfig becomes null', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const { result, rerender } = renderHook(({ config }) => useNetworkAdapter(config), {
        initialProps: { config: mockNetworkConfig as NetworkConfig | null },
      });

      await vi.advanceTimersByTimeAsync(0);
      await waitFor(() => {
        expect(result.current.runtime).toBe(mockRuntime);
      });

      rerender({ config: null });

      expect(result.current.runtime).toBeNull();
      expect(result.current.isLoading).toBe(false);

      await vi.advanceTimersByTimeAsync(0);
      expect(mockRuntime.dispose).toHaveBeenCalledTimes(1);
      vi.useRealTimers();
    });

    it('disposes a runtime that finishes loading after the effect was cancelled', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const stellarConfig = {
        id: 'stellar-mainnet',
        name: 'Stellar Mainnet',
        ecosystem: 'stellar',
        network: 'stellar',
        type: 'mainnet',
        isTestnet: false,
      } as NetworkConfig;

      const stellarRuntime = createMockRuntime(stellarConfig);
      let resolveEvm: (r: RoleManagerRuntime) => void;

      mockGetRuntime
        .mockImplementationOnce(
          () =>
            new Promise<RoleManagerRuntime>((resolve) => {
              resolveEvm = resolve;
            })
        )
        .mockResolvedValueOnce(stellarRuntime);

      const { result, rerender } = renderHook(({ config }) => useNetworkAdapter(config), {
        initialProps: { config: mockNetworkConfig as NetworkConfig | null },
      });

      rerender({ config: stellarConfig });

      await vi.advanceTimersByTimeAsync(0);
      await waitFor(() => {
        expect(result.current.runtime).toBe(stellarRuntime);
      });

      act(() => {
        resolveEvm!(mockRuntime);
      });

      await vi.advanceTimersByTimeAsync(0);
      expect(mockRuntime.dispose).toHaveBeenCalledTimes(1);

      expect(result.current.runtime).toBe(stellarRuntime);
      vi.useRealTimers();
    });
  });

  describe('error handling', () => {
    it('should set error state when runtime loading fails', async () => {
      const loadError = new Error('Failed to load runtime');
      mockGetRuntime.mockRejectedValue(loadError);

      const { result } = renderHook(() => useNetworkAdapter(mockNetworkConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toEqual(loadError);
      expect(result.current.runtime).toBeNull();
    });

    it('should clear error state when loading succeeds after retry', async () => {
      const loadError = new Error('Failed to load runtime');
      mockGetRuntime.mockRejectedValueOnce(loadError).mockResolvedValueOnce(mockRuntime);

      const { result } = renderHook(() => useNetworkAdapter(mockNetworkConfig));

      // Wait for error state
      await waitFor(() => {
        expect(result.current.error).toEqual(loadError);
      });

      // Retry
      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.runtime).toBe(mockRuntime);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('retry functionality', () => {
    it('should provide retry function', () => {
      mockGetRuntime.mockImplementationOnce(() => new Promise(() => {}));

      const { result } = renderHook(() => useNetworkAdapter(mockNetworkConfig));

      expect(result.current.retry).toBeDefined();
      expect(typeof result.current.retry).toBe('function');
    });

    it('should reload runtime when retry is called', async () => {
      const { result } = renderHook(() => useNetworkAdapter(mockNetworkConfig));

      await waitFor(() => {
        expect(result.current.runtime).toBe(mockRuntime);
      });

      expect(mockGetRuntime).toHaveBeenCalledTimes(1);

      // Call retry
      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(mockGetRuntime).toHaveBeenCalledTimes(2);
      });
    });

    it('should not retry when networkConfig is null', async () => {
      const { result } = renderHook(() => useNetworkAdapter(null));

      act(() => {
        result.current.retry();
      });

      expect(mockGetRuntime).not.toHaveBeenCalled();
    });
  });

  describe('return type interface', () => {
    it('should match UseNetworkAdapterReturn interface', async () => {
      const { result } = renderHook(() => useNetworkAdapter(mockNetworkConfig));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify return type shape
      expect(result.current).toHaveProperty('runtime');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('retry');
    });

    it('disposes the runtime on unmount', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const freshRuntime = createMockRuntime();
      mockGetRuntime.mockResolvedValue(freshRuntime);

      const { result, unmount } = renderHook(() => useNetworkAdapter(mockNetworkConfig));

      await vi.advanceTimersByTimeAsync(0);
      await waitFor(() => {
        expect(result.current.runtime).toBe(freshRuntime);
      });

      unmount();

      await vi.advanceTimersByTimeAsync(0);
      expect(freshRuntime.dispose).toHaveBeenCalledTimes(1);
    });
  });
});
