/**
 * Tests for useContractSchemaLoader hook
 * Feature: 005-contract-schema-storage
 *
 * TDD: These tests should FAIL initially before hook implementation
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ContractAdapter,
  ContractSchema,
  NetworkConfig,
} from '@openzeppelin/ui-builder-types';

import type { SchemaLoadResult } from '@/types/schema';
import { DEFAULT_CIRCUIT_BREAKER_CONFIG } from '@/types/schema';

import { useContractSchemaLoader } from '../useContractSchemaLoader';

// Test fixtures
const mockNetworkConfig: NetworkConfig = {
  id: 'stellar-testnet',
  name: 'Stellar Testnet',
  ecosystem: 'stellar',
  network: 'stellar',
  type: 'testnet',
  isTestnet: true,
} as NetworkConfig;

const mockContractSchema: ContractSchema = {
  name: 'TestToken',
  ecosystem: 'stellar',
  functions: [
    {
      id: 'transfer',
      name: 'transfer',
      displayName: 'Transfer',
      inputs: [],
      outputs: [],
      type: 'function',
      modifiesState: true,
    },
  ],
  events: [],
};

const mockLoadResult = {
  schema: mockContractSchema,
  source: 'fetched' as const,
  contractDefinitionOriginal: '{"spec": []}',
  metadata: {
    rpcUrl: 'https://soroban-testnet.stellar.org',
  },
};

// Create mock adapter factory
const createMockAdapter = (overrides?: Partial<ContractAdapter>): ContractAdapter =>
  ({
    networkConfig: mockNetworkConfig,
    isValidAddress: vi.fn().mockReturnValue(true),
    getContract: vi.fn(),
    getContractDefinitionInputs: vi.fn().mockReturnValue([
      {
        id: 'contractAddress',
        name: 'contractAddress',
        label: 'Contract ID',
        type: 'blockchain-address',
        validation: { required: true },
      },
    ]),
    loadContractWithMetadata: vi.fn().mockResolvedValue(mockLoadResult),
    ...overrides,
  }) as unknown as ContractAdapter;

describe('useContractSchemaLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with idle state', () => {
      const mockAdapter = createMockAdapter();
      const { result } = renderHook(() => useContractSchemaLoader(mockAdapter));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isCircuitBreakerActive).toBe(false);
    });

    it('should accept null adapter', () => {
      const { result } = renderHook(() => useContractSchemaLoader(null));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  // T019: Write test: load() returns schema on success
  describe('load() success', () => {
    it('should return schema on successful load', async () => {
      const mockAdapter = createMockAdapter();
      const { result } = renderHook(() => useContractSchemaLoader(mockAdapter));

      let loadResult: SchemaLoadResult | null = null;

      await act(async () => {
        loadResult = await result.current.load('CTEST123...', { contractAddress: 'CTEST123...' });
      });

      expect(loadResult).toEqual(mockLoadResult);
      expect(result.current.error).toBeNull();
    });

    it('should call adapter.loadContractWithMetadata with correct params', async () => {
      const mockAdapter = createMockAdapter();
      const { result } = renderHook(() => useContractSchemaLoader(mockAdapter));

      const artifacts = { contractAddress: 'CTEST123...' };

      await act(async () => {
        await result.current.load('CTEST123...', artifacts);
      });

      expect(mockAdapter.loadContractWithMetadata).toHaveBeenCalledWith(artifacts);
    });

    it('should reset circuit breaker state on successful load', async () => {
      const failingAdapter = createMockAdapter({
        loadContractWithMetadata: vi
          .fn()
          .mockRejectedValueOnce(new Error('Network error'))
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce(mockLoadResult),
      });

      const { result } = renderHook(() => useContractSchemaLoader(failingAdapter));

      // First two failures
      await act(async () => {
        await result.current.load('CTEST123...', { contractAddress: 'CTEST123...' });
      });
      await act(async () => {
        await result.current.load('CTEST123...', { contractAddress: 'CTEST123...' });
      });

      // Third call succeeds
      await act(async () => {
        const res = await result.current.load('CTEST123...', { contractAddress: 'CTEST123...' });
        expect(res).toEqual(mockLoadResult);
      });

      // Circuit breaker should be reset
      expect(result.current.isCircuitBreakerActive).toBe(false);
    });
  });

  // T020: Write test: load() sets error state on failure
  describe('load() error handling', () => {
    it('should set error state on load failure', async () => {
      const errorMessage = 'Contract not found';
      const failingAdapter = createMockAdapter({
        loadContractWithMetadata: vi.fn().mockRejectedValue(new Error(errorMessage)),
      });

      const { result } = renderHook(() => useContractSchemaLoader(failingAdapter));

      await act(async () => {
        const res = await result.current.load('CTEST123...', { contractAddress: 'CTEST123...' });
        expect(res).toBeNull();
      });

      expect(result.current.error).toBe(errorMessage);
    });

    it('should handle non-Error exceptions', async () => {
      const failingAdapter = createMockAdapter({
        loadContractWithMetadata: vi.fn().mockRejectedValue('string error'),
      });

      const { result } = renderHook(() => useContractSchemaLoader(failingAdapter));

      await act(async () => {
        await result.current.load('CTEST123...', { contractAddress: 'CTEST123...' });
      });

      expect(result.current.error).toBe('Unknown error');
    });

    it('should return null when adapter is null', async () => {
      const { result } = renderHook(() => useContractSchemaLoader(null));

      let loadResult: SchemaLoadResult | null = 'not-null' as unknown as SchemaLoadResult;

      await act(async () => {
        loadResult = await result.current.load('CTEST123...', { contractAddress: 'CTEST123...' });
      });

      expect(loadResult).toBeNull();
    });

    it('should return null when already loading', async () => {
      // Create a resolve function we can control manually
      let resolveLoad: ((value: typeof mockLoadResult) => void) | null = null;
      const mockAdapter = createMockAdapter({
        loadContractWithMetadata: vi.fn().mockImplementation(
          () =>
            new Promise((resolve) => {
              resolveLoad = resolve;
            })
        ),
      });

      const { result } = renderHook(() => useContractSchemaLoader(mockAdapter));

      // Start first load inside act to handle state updates
      let firstLoadPromise: Promise<SchemaLoadResult | null>;
      await act(async () => {
        firstLoadPromise = result.current.load('CTEST123...', {
          contractAddress: 'CTEST123...',
        });
        // Don't await - let it hang
      });

      // Verify we're in loading state
      expect(result.current.isLoading).toBe(true);

      // Try second load immediately - should return null because first is still loading
      let secondResult: SchemaLoadResult | null = null;
      await act(async () => {
        secondResult = await result.current.load('CTEST123...', {
          contractAddress: 'CTEST123...',
        });
      });

      // Second load should return null due to concurrent load
      expect(secondResult).toBeNull();

      // Complete the first load
      await act(async () => {
        resolveLoad?.(mockLoadResult);
      });

      const firstResult = await firstLoadPromise!;
      expect(firstResult).toEqual(mockLoadResult);
    });
  });

  // T017: Write test: circuit breaker blocks after 3 failures
  describe('circuit breaker - blocking after failures', () => {
    it('should activate circuit breaker after 3 consecutive failures within window', async () => {
      const failingAdapter = createMockAdapter({
        loadContractWithMetadata: vi.fn().mockRejectedValue(new Error('Network error')),
      });

      const { result } = renderHook(() => useContractSchemaLoader(failingAdapter));

      const address = 'CTEST123...';
      const artifacts = { contractAddress: address };

      // Fail 3 times
      await act(async () => {
        await result.current.load(address, artifacts);
      });
      await act(async () => {
        await result.current.load(address, artifacts);
      });
      await act(async () => {
        await result.current.load(address, artifacts);
      });

      // Circuit breaker should be active
      expect(result.current.isCircuitBreakerActive).toBe(true);

      // 4th attempt should be blocked and return null
      let fourthResult: SchemaLoadResult | null = null;
      await act(async () => {
        fourthResult = await result.current.load(address, artifacts);
      });

      expect(fourthResult).toBeNull();
      // loadContractWithMetadata should only be called 3 times (4th blocked)
      expect(failingAdapter.loadContractWithMetadata).toHaveBeenCalledTimes(3);
    });

    it('should track failures per contract+network combination', async () => {
      const failingAdapter = createMockAdapter({
        loadContractWithMetadata: vi.fn().mockRejectedValue(new Error('Network error')),
      });

      const { result } = renderHook(() => useContractSchemaLoader(failingAdapter));

      // Fail for contract A
      await act(async () => {
        await result.current.load('CONTRACT_A', { contractAddress: 'CONTRACT_A' });
      });
      await act(async () => {
        await result.current.load('CONTRACT_A', { contractAddress: 'CONTRACT_A' });
      });
      await act(async () => {
        await result.current.load('CONTRACT_A', { contractAddress: 'CONTRACT_A' });
      });

      // Circuit breaker active for contract A
      expect(result.current.isCircuitBreakerActive).toBe(true);

      // Contract B should still work (its own circuit breaker)
      await act(async () => {
        await result.current.load('CONTRACT_B', { contractAddress: 'CONTRACT_B' });
      });

      // Should have been called (circuit breaker is per-contract)
      expect(failingAdapter.loadContractWithMetadata).toHaveBeenCalledTimes(4);
    });

    it('should reset failure count after window expires', async () => {
      const failingAdapter = createMockAdapter({
        loadContractWithMetadata: vi.fn().mockRejectedValue(new Error('Network error')),
      });

      const { result } = renderHook(() => useContractSchemaLoader(failingAdapter));

      const address = 'CTEST123...';
      const artifacts = { contractAddress: address };

      // Fail twice
      await act(async () => {
        await result.current.load(address, artifacts);
      });
      await act(async () => {
        await result.current.load(address, artifacts);
      });

      // Advance time past the window (30 seconds)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(DEFAULT_CIRCUIT_BREAKER_CONFIG.windowMs + 1000);
      });

      // Third failure starts fresh count
      await act(async () => {
        await result.current.load(address, artifacts);
      });

      // Should NOT be in circuit breaker state yet (only 1 failure after reset)
      expect(result.current.isCircuitBreakerActive).toBe(false);
    });

    it('should display circuit breaker message for configured duration', async () => {
      const failingAdapter = createMockAdapter({
        loadContractWithMetadata: vi.fn().mockRejectedValue(new Error('Network error')),
      });

      const { result } = renderHook(() => useContractSchemaLoader(failingAdapter));

      const address = 'CTEST123...';
      const artifacts = { contractAddress: address };

      // Trigger circuit breaker
      await act(async () => {
        await result.current.load(address, artifacts);
        await result.current.load(address, artifacts);
        await result.current.load(address, artifacts);
      });

      expect(result.current.isCircuitBreakerActive).toBe(true);

      // Advance time less than display duration
      await act(async () => {
        await vi.advanceTimersByTimeAsync(DEFAULT_CIRCUIT_BREAKER_CONFIG.displayDurationMs - 100);
      });

      // Should still be active
      expect(result.current.isCircuitBreakerActive).toBe(true);

      // Advance past display duration
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200);
      });

      // Should be deactivated (display timer expired)
      expect(result.current.isCircuitBreakerActive).toBe(false);
    });
  });

  // T018: Write test: circuit breaker resets on success
  describe('circuit breaker - reset on success', () => {
    it('should reset circuit breaker after successful load', async () => {
      let callCount = 0;
      const intermittentAdapter = createMockAdapter({
        loadContractWithMetadata: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount <= 2) {
            return Promise.reject(new Error('Network error'));
          }
          return Promise.resolve(mockLoadResult);
        }),
      });

      const { result } = renderHook(() => useContractSchemaLoader(intermittentAdapter));

      const address = 'CTEST123...';
      const artifacts = { contractAddress: address };

      // Fail twice
      await act(async () => {
        await result.current.load(address, artifacts);
      });
      await act(async () => {
        await result.current.load(address, artifacts);
      });

      // Should NOT be in circuit breaker yet (only 2 failures)
      expect(result.current.isCircuitBreakerActive).toBe(false);

      // Success on third try
      await act(async () => {
        const res = await result.current.load(address, artifacts);
        expect(res).toEqual(mockLoadResult);
      });

      // Now fail again - counter should have reset
      callCount = 0; // Reset mock counter

      // This should work as a fresh start
      await act(async () => {
        await result.current.load(address, artifacts);
      });

      // Should not be in circuit breaker (only 1 failure after reset)
      expect(result.current.isCircuitBreakerActive).toBe(false);
    });

    it('should clear circuit breaker state via reset()', async () => {
      const failingAdapter = createMockAdapter({
        loadContractWithMetadata: vi.fn().mockRejectedValue(new Error('Network error')),
      });

      const { result } = renderHook(() => useContractSchemaLoader(failingAdapter));

      const address = 'CTEST123...';
      const artifacts = { contractAddress: address };

      // Trigger circuit breaker
      await act(async () => {
        await result.current.load(address, artifacts);
        await result.current.load(address, artifacts);
        await result.current.load(address, artifacts);
      });

      expect(result.current.isCircuitBreakerActive).toBe(true);
      expect(result.current.error).toBe('Network error');

      // Call reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.isCircuitBreakerActive).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('loading state', () => {
    it('should set isLoading to true during load', async () => {
      const mockAdapter = createMockAdapter({
        loadContractWithMetadata: vi
          .fn()
          .mockImplementation(
            () => new Promise((resolve) => setTimeout(() => resolve(mockLoadResult), 500))
          ),
      });

      const { result } = renderHook(() => useContractSchemaLoader(mockAdapter));

      expect(result.current.isLoading).toBe(false);

      // Start load
      act(() => {
        result.current.load('CTEST123...', { contractAddress: 'CTEST123...' });
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);

      // Complete load
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should set isLoading to false after error', async () => {
      const failingAdapter = createMockAdapter({
        loadContractWithMetadata: vi.fn().mockRejectedValue(new Error('Error')),
      });

      const { result } = renderHook(() => useContractSchemaLoader(failingAdapter));

      await act(async () => {
        await result.current.load('CTEST123...', { contractAddress: 'CTEST123...' });
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Error');
    });
  });

  describe('return type interface', () => {
    it('should match UseContractSchemaLoaderReturn interface', () => {
      const mockAdapter = createMockAdapter();
      const { result } = renderHook(() => useContractSchemaLoader(mockAdapter));

      expect(result.current).toHaveProperty('load');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isCircuitBreakerActive');
      expect(result.current).toHaveProperty('reset');

      expect(typeof result.current.load).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });
});
