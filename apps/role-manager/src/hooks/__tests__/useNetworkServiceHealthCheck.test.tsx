/**
 * Tests for useNetworkServiceHealthCheck hook
 * Feature: 018-network-health-check
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NetworkConfig } from '@openzeppelin/ui-types';

import type { RoleManagerRuntime } from '@/core/runtimeAdapter';

import { useNetworkServiceHealthCheck } from '../useNetworkServiceHealthCheck';

// =============================================================================
// Mocks
// =============================================================================

const mocks = {
  filterEnabledServiceForms: vi.fn(),
  userNetworkServiceConfigGet: vi.fn(),
};

vi.mock('@openzeppelin/ui-utils', () => ({
  filterEnabledServiceForms: (...args: unknown[]) => mocks.filterEnabledServiceForms(...args),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  userNetworkServiceConfigService: {
    get: (...args: unknown[]) => mocks.userNetworkServiceConfigGet(...args),
  },
}));

// =============================================================================
// Test Fixtures
// =============================================================================

const mockNetworkConfig: NetworkConfig = {
  id: 'ethereum-mainnet',
  name: 'Ethereum Mainnet',
  ecosystem: 'evm',
  network: 'ethereum',
  type: 'mainnet',
  isTestnet: false,
} as NetworkConfig;

function createMockRuntime(relayerOverrides: Record<string, unknown> = {}): RoleManagerRuntime {
  return {
    relayer: {
      getNetworkServiceForms: vi.fn(() => []),
      getDefaultServiceConfig: vi.fn(() => ({})),
      testNetworkServiceConnection: vi.fn(),
      ...relayerOverrides,
    },
  } as unknown as RoleManagerRuntime;
}

const rpcForm = { id: 'rpc', label: 'RPC Endpoint', enabled: true, fields: [] };
const indexerForm = { id: 'indexer', label: 'Indexer', enabled: true, fields: [] };
const explorerForm = { id: 'explorer', label: 'Explorer', enabled: true, fields: [] };

// =============================================================================
// Tests
// =============================================================================

describe('useNetworkServiceHealthCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.filterEnabledServiceForms.mockReturnValue([]);
    mocks.userNetworkServiceConfigGet.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Early exits
  // ---------------------------------------------------------------------------

  describe('early exit conditions', () => {
    it('should return empty statuses when adapter is null', async () => {
      const { result } = renderHook(() => useNetworkServiceHealthCheck(null, mockNetworkConfig));

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      expect(result.current.allStatuses).toEqual([]);
      expect(result.current.hasUnhealthyServices).toBe(false);
    });

    it('should return empty statuses when networkConfig is null', async () => {
      const adapter = createMockRuntime();
      const { result } = renderHook(() => useNetworkServiceHealthCheck(adapter, null));

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      expect(result.current.allStatuses).toEqual([]);
    });

    it('should return empty statuses when adapter has no testNetworkServiceConnection', async () => {
      const adapter = createMockRuntime({ testNetworkServiceConnection: undefined });
      const { result } = renderHook(() => useNetworkServiceHealthCheck(adapter, mockNetworkConfig));

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      expect(result.current.allStatuses).toEqual([]);
    });

    it('should return empty statuses when no enabled service forms exist', async () => {
      mocks.filterEnabledServiceForms.mockReturnValue([]);
      const adapter = createMockRuntime();
      const { result } = renderHook(() => useNetworkServiceHealthCheck(adapter, mockNetworkConfig));

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
      });

      expect(result.current.allStatuses).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // Healthy services
  // ---------------------------------------------------------------------------

  describe('healthy services', () => {
    it('should report all services healthy when checks succeed', async () => {
      mocks.filterEnabledServiceForms.mockReturnValue([rpcForm, indexerForm]);
      const testConnection = vi.fn().mockResolvedValue({ success: true, latency: 50 });
      const adapter = createMockRuntime({
        testNetworkServiceConnection: testConnection,
        getDefaultServiceConfig: vi.fn(() => ({ url: 'https://rpc.example.com' })),
      });

      const { result } = renderHook(() => useNetworkServiceHealthCheck(adapter, mockNetworkConfig));

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
        expect(result.current.allStatuses.length).toBe(2);
      });

      expect(result.current.hasUnhealthyServices).toBe(false);
      expect(result.current.unhealthyServices).toEqual([]);
      expect(result.current.allStatuses).toEqual([
        expect.objectContaining({ serviceId: 'rpc', isHealthy: true }),
        expect.objectContaining({ serviceId: 'indexer', isHealthy: true }),
      ]);
    });

    it('should use latency from test result', async () => {
      mocks.filterEnabledServiceForms.mockReturnValue([rpcForm]);
      const testConnection = vi.fn().mockResolvedValue({ success: true, latency: 123 });
      const adapter = createMockRuntime({
        testNetworkServiceConnection: testConnection,
        getDefaultServiceConfig: vi.fn(() => ({ url: 'https://rpc.example.com' })),
      });

      const { result } = renderHook(() => useNetworkServiceHealthCheck(adapter, mockNetworkConfig));

      await waitFor(() => {
        expect(result.current.allStatuses.length).toBe(1);
      });

      expect(result.current.allStatuses[0].latency).toBe(123);
    });
  });

  // ---------------------------------------------------------------------------
  // Unhealthy services
  // ---------------------------------------------------------------------------

  describe('unhealthy services', () => {
    it('should report unhealthy when test returns success: false', async () => {
      mocks.filterEnabledServiceForms.mockReturnValue([rpcForm]);
      const testConnection = vi.fn().mockResolvedValue({
        success: false,
        error: 'Connection refused',
      });
      const adapter = createMockRuntime({
        testNetworkServiceConnection: testConnection,
        getDefaultServiceConfig: vi.fn(() => ({ url: 'https://rpc.example.com' })),
      });

      const { result } = renderHook(() => useNetworkServiceHealthCheck(adapter, mockNetworkConfig));

      await waitFor(() => {
        expect(result.current.allStatuses.length).toBe(1);
      });

      expect(result.current.hasUnhealthyServices).toBe(true);
      expect(result.current.unhealthyServices).toHaveLength(1);
      expect(result.current.unhealthyServices[0]).toEqual(
        expect.objectContaining({
          serviceId: 'rpc',
          isHealthy: false,
          error: 'Connection refused',
        })
      );
    });

    it('should default isHealthy to false when result is undefined', async () => {
      mocks.filterEnabledServiceForms.mockReturnValue([rpcForm]);
      const testConnection = vi.fn().mockResolvedValue(undefined);
      const adapter = createMockRuntime({
        testNetworkServiceConnection: testConnection,
        getDefaultServiceConfig: vi.fn(() => ({ url: 'https://rpc.example.com' })),
      });

      const { result } = renderHook(() => useNetworkServiceHealthCheck(adapter, mockNetworkConfig));

      await waitFor(() => {
        expect(result.current.allStatuses.length).toBe(1);
      });

      expect(result.current.allStatuses[0].isHealthy).toBe(false);
    });

    it('should handle thrown errors gracefully and mark service unhealthy', async () => {
      mocks.filterEnabledServiceForms.mockReturnValue([rpcForm]);
      const testConnection = vi.fn().mockRejectedValue(new Error('Network timeout'));
      const adapter = createMockRuntime({
        testNetworkServiceConnection: testConnection,
        getDefaultServiceConfig: vi.fn(() => ({ url: 'https://rpc.example.com' })),
      });

      const { result } = renderHook(() => useNetworkServiceHealthCheck(adapter, mockNetworkConfig));

      await waitFor(() => {
        expect(result.current.allStatuses.length).toBe(1);
      });

      expect(result.current.allStatuses[0]).toEqual(
        expect.objectContaining({
          serviceId: 'rpc',
          isHealthy: false,
          error: 'Network timeout',
        })
      );
    });

    it('should handle non-Error thrown values', async () => {
      mocks.filterEnabledServiceForms.mockReturnValue([rpcForm]);
      const testConnection = vi.fn().mockRejectedValue('string error');
      const adapter = createMockRuntime({
        testNetworkServiceConnection: testConnection,
        getDefaultServiceConfig: vi.fn(() => ({ url: 'https://rpc.example.com' })),
      });

      const { result } = renderHook(() => useNetworkServiceHealthCheck(adapter, mockNetworkConfig));

      await waitFor(() => {
        expect(result.current.allStatuses.length).toBe(1);
      });

      expect(result.current.allStatuses[0].error).toBe('Health check failed');
    });
  });

  // ---------------------------------------------------------------------------
  // Service config resolution
  // ---------------------------------------------------------------------------

  describe('service config resolution', () => {
    it('should prefer user overrides over default config', async () => {
      mocks.filterEnabledServiceForms.mockReturnValue([rpcForm]);
      mocks.userNetworkServiceConfigGet.mockReturnValue({ url: 'https://custom-rpc.example.com' });

      const testConnection = vi.fn().mockResolvedValue({ success: true });
      const getDefaultServiceConfig = vi.fn(() => ({ url: 'https://default-rpc.example.com' }));
      const adapter = createMockRuntime({
        testNetworkServiceConnection: testConnection,
        getDefaultServiceConfig,
      });

      const { result } = renderHook(() => useNetworkServiceHealthCheck(adapter, mockNetworkConfig));

      await waitFor(() => {
        expect(result.current.allStatuses.length).toBe(1);
      });

      expect(testConnection).toHaveBeenCalledWith('rpc', { url: 'https://custom-rpc.example.com' });
      expect(getDefaultServiceConfig).not.toHaveBeenCalled();
    });

    it('should fall back to default config when no user override exists', async () => {
      mocks.filterEnabledServiceForms.mockReturnValue([rpcForm]);
      mocks.userNetworkServiceConfigGet.mockReturnValue(null);

      const testConnection = vi.fn().mockResolvedValue({ success: true });
      const getDefaultServiceConfig = vi.fn(() => ({ url: 'https://default-rpc.example.com' }));
      const adapter = createMockRuntime({
        testNetworkServiceConnection: testConnection,
        getDefaultServiceConfig,
      });

      const { result } = renderHook(() => useNetworkServiceHealthCheck(adapter, mockNetworkConfig));

      await waitFor(() => {
        expect(result.current.allStatuses.length).toBe(1);
      });

      expect(getDefaultServiceConfig).toHaveBeenCalledWith('rpc');
      expect(testConnection).toHaveBeenCalledWith('rpc', {
        url: 'https://default-rpc.example.com',
      });
    });

    it('should skip services with no config (user or default)', async () => {
      mocks.filterEnabledServiceForms.mockReturnValue([rpcForm, indexerForm]);
      mocks.userNetworkServiceConfigGet.mockReturnValue(null);

      const testConnection = vi.fn().mockResolvedValue({ success: true });
      const getDefaultServiceConfig = vi.fn((serviceId: string) => {
        if (serviceId === 'rpc') return { url: 'https://rpc.example.com' };
        return {};
      });
      const adapter = createMockRuntime({
        testNetworkServiceConnection: testConnection,
        getDefaultServiceConfig,
      });

      const { result } = renderHook(() => useNetworkServiceHealthCheck(adapter, mockNetworkConfig));

      await waitFor(() => {
        expect(result.current.allStatuses.length).toBe(1);
      });

      expect(result.current.allStatuses[0].serviceId).toBe('rpc');
      expect(testConnection).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // Parallel execution
  // ---------------------------------------------------------------------------

  describe('parallel execution', () => {
    it('should run checks for all services in parallel', async () => {
      const callOrder: string[] = [];
      mocks.filterEnabledServiceForms.mockReturnValue([rpcForm, indexerForm, explorerForm]);

      const testConnection = vi.fn(async (serviceId: string) => {
        callOrder.push(`start-${serviceId}`);
        await new Promise((resolve) => setTimeout(resolve, 10));
        callOrder.push(`end-${serviceId}`);
        return { success: true };
      });
      const adapter = createMockRuntime({
        testNetworkServiceConnection: testConnection,
        getDefaultServiceConfig: vi.fn(() => ({ url: 'https://example.com' })),
      });

      const { result } = renderHook(() => useNetworkServiceHealthCheck(adapter, mockNetworkConfig));

      await waitFor(() => {
        expect(result.current.allStatuses.length).toBe(3);
      });

      // All starts should come before any ends (parallel, not sequential)
      const startIndices = callOrder
        .filter((s) => s.startsWith('start-'))
        .map((s) => callOrder.indexOf(s));
      const endIndices = callOrder
        .filter((s) => s.startsWith('end-'))
        .map((s) => callOrder.indexOf(s));

      const maxStart = Math.max(...startIndices);
      const minEnd = Math.min(...endIndices);
      expect(maxStart).toBeLessThan(minEnd);
    });
  });

  // ---------------------------------------------------------------------------
  // Mixed results
  // ---------------------------------------------------------------------------

  describe('mixed healthy and unhealthy', () => {
    it('should correctly partition healthy and unhealthy services', async () => {
      mocks.filterEnabledServiceForms.mockReturnValue([rpcForm, indexerForm, explorerForm]);
      const testConnection = vi.fn(async (serviceId: string) => {
        if (serviceId === 'indexer') return { success: false, error: 'Indexer down' };
        return { success: true, latency: 50 };
      });
      const adapter = createMockRuntime({
        testNetworkServiceConnection: testConnection,
        getDefaultServiceConfig: vi.fn(() => ({ url: 'https://example.com' })),
      });

      const { result } = renderHook(() => useNetworkServiceHealthCheck(adapter, mockNetworkConfig));

      await waitFor(() => {
        expect(result.current.allStatuses.length).toBe(3);
      });

      expect(result.current.hasUnhealthyServices).toBe(true);
      expect(result.current.unhealthyServices).toHaveLength(1);
      expect(result.current.unhealthyServices[0].serviceId).toBe('indexer');
    });
  });

  // ---------------------------------------------------------------------------
  // isChecking state
  // ---------------------------------------------------------------------------

  describe('isChecking lifecycle', () => {
    it('should reset isChecking to false after checks complete', async () => {
      mocks.filterEnabledServiceForms.mockReturnValue([rpcForm]);
      const testConnection = vi.fn().mockResolvedValue({ success: true });
      const adapter = createMockRuntime({
        testNetworkServiceConnection: testConnection,
        getDefaultServiceConfig: vi.fn(() => ({ url: 'https://rpc.example.com' })),
      });

      const { result } = renderHook(() => useNetworkServiceHealthCheck(adapter, mockNetworkConfig));

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
        expect(result.current.allStatuses.length).toBe(1);
      });
    });

    it('should reset isChecking to false even when all checks throw', async () => {
      mocks.filterEnabledServiceForms.mockReturnValue([rpcForm, indexerForm]);
      const testConnection = vi.fn().mockRejectedValue(new Error('Total failure'));
      const adapter = createMockRuntime({
        testNetworkServiceConnection: testConnection,
        getDefaultServiceConfig: vi.fn(() => ({ url: 'https://example.com' })),
      });

      const { result } = renderHook(() => useNetworkServiceHealthCheck(adapter, mockNetworkConfig));

      await waitFor(() => {
        expect(result.current.isChecking).toBe(false);
        expect(result.current.allStatuses.length).toBe(2);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Recheck
  // ---------------------------------------------------------------------------

  describe('recheck', () => {
    it('should re-run health checks when recheck is called', async () => {
      mocks.filterEnabledServiceForms.mockReturnValue([rpcForm]);
      let callCount = 0;
      const testConnection = vi.fn(async () => {
        callCount++;
        return { success: callCount > 1, latency: 50 };
      });
      const adapter = createMockRuntime({
        testNetworkServiceConnection: testConnection,
        getDefaultServiceConfig: vi.fn(() => ({ url: 'https://rpc.example.com' })),
      });

      const { result } = renderHook(() => useNetworkServiceHealthCheck(adapter, mockNetworkConfig));

      await waitFor(() => {
        expect(result.current.allStatuses.length).toBe(1);
      });

      expect(result.current.allStatuses[0].isHealthy).toBe(false);

      await act(async () => {
        await result.current.recheck();
      });

      expect(result.current.allStatuses[0].isHealthy).toBe(true);
      expect(testConnection).toHaveBeenCalledTimes(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Dependency changes
  // ---------------------------------------------------------------------------

  describe('dependency changes', () => {
    it('should re-run checks when networkConfig changes', async () => {
      mocks.filterEnabledServiceForms.mockReturnValue([rpcForm]);
      const testConnection = vi.fn().mockResolvedValue({ success: true });
      const adapter = createMockRuntime({
        testNetworkServiceConnection: testConnection,
        getDefaultServiceConfig: vi.fn(() => ({ url: 'https://rpc.example.com' })),
      });

      const secondNetwork: NetworkConfig = {
        ...mockNetworkConfig,
        id: 'polygon-mainnet',
        name: 'Polygon Mainnet',
      };

      const { result, rerender } = renderHook(
        ({ network }) => useNetworkServiceHealthCheck(adapter, network),
        { initialProps: { network: mockNetworkConfig } }
      );

      await waitFor(() => {
        expect(result.current.allStatuses.length).toBe(1);
      });

      const firstCallCount = testConnection.mock.calls.length;

      rerender({ network: secondNetwork });

      await waitFor(() => {
        expect(testConnection.mock.calls.length).toBeGreaterThan(firstCallCount);
      });
    });
  });
});
