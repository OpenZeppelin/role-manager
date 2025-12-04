/**
 * Tests for useContractSchema hook
 * Feature: 005-contract-schema-storage (Phase 5: US3 - Persist Contract Schema for Offline Use)
 *
 * TDD: These tests should FAIL initially before hook implementation
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ContractAdapter, ContractSchema } from '@openzeppelin/ui-builder-types';

import type { ContractSchemaMetadata, RecentContractRecord } from '@/types/storage';

import { useContractSchema } from '../useContractSchema';

// =============================================================================
// Test Setup - Mock Dependencies
// =============================================================================

// Mock the storage module
const mockGetByAddressAndNetwork = vi.fn();
const mockHasSchema = vi.fn();
const mockAddOrUpdateWithSchema = vi.fn();

vi.mock('@/core/storage/RecentContractsStorage', () => ({
  recentContractsStorage: {
    getByAddressAndNetwork: (...args: unknown[]) => mockGetByAddressAndNetwork(...args),
    hasSchema: (...args: unknown[]) => mockHasSchema(...args),
    addOrUpdateWithSchema: (...args: unknown[]) => mockAddOrUpdateWithSchema(...args),
    getByNetwork: vi.fn().mockResolvedValue([]),
  },
}));

// Mock useContractSchemaLoader
const mockLoad = vi.fn();
const mockReset = vi.fn();
vi.mock('../useContractSchemaLoader', () => ({
  useContractSchemaLoader: () => ({
    load: mockLoad,
    isLoading: false,
    error: null,
    isCircuitBreakerActive: false,
    reset: mockReset,
  }),
}));

// =============================================================================
// Test Fixtures
// =============================================================================

const mockContractSchema: ContractSchema = {
  name: 'TestToken',
  ecosystem: 'stellar',
  functions: [
    {
      id: 'transfer',
      name: 'transfer',
      displayName: 'Transfer',
      inputs: [
        {
          name: 'to',
          type: 'blockchain-address',
          displayName: 'To',
        },
        {
          name: 'amount',
          type: 'number',
          displayName: 'Amount',
        },
      ],
      outputs: [],
      type: 'function',
      modifiesState: true,
    },
    {
      id: 'balance',
      name: 'balance',
      displayName: 'Balance',
      inputs: [],
      outputs: [],
      type: 'function',
      modifiesState: false,
    },
  ],
  events: [],
};

const mockSchemaMetadata: ContractSchemaMetadata = {
  fetchedFrom: 'https://soroban-testnet.stellar.org',
  fetchTimestamp: Date.now(),
  contractName: 'TestToken',
};

const createMockRecord = (overrides?: Partial<RecentContractRecord>): RecentContractRecord => ({
  id: 'record-1',
  networkId: 'stellar-testnet',
  address: 'CTEST123ABC...',
  lastAccessed: Date.now(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ecosystem: 'stellar',
  schema: JSON.stringify(mockContractSchema),
  schemaHash: 'abc123',
  source: 'fetched',
  schemaMetadata: mockSchemaMetadata,
  ...overrides,
});

const createMockAdapter = (overrides?: Partial<ContractAdapter>): ContractAdapter =>
  ({
    networkConfig: {
      id: 'stellar-testnet',
      name: 'Stellar Testnet',
      ecosystem: 'stellar',
      network: 'stellar',
      type: 'testnet',
      isTestnet: true,
    },
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
    loadContractWithMetadata: vi.fn().mockResolvedValue({
      schema: mockContractSchema,
      source: 'fetched',
      metadata: { rpcUrl: 'https://soroban-testnet.stellar.org' },
    }),
    ...overrides,
  }) as unknown as ContractAdapter;

// =============================================================================
// Tests
// =============================================================================

describe('useContractSchema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with idle state', () => {
      const mockAdapter = createMockAdapter();
      const { result } = renderHook(() => useContractSchema(mockAdapter));

      expect(result.current.state).toBe('idle');
      expect(result.current.schema).toBeNull();
      expect(result.current.record).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.hasSchema).toBe(false);
      expect(result.current.isCircuitBreakerActive).toBe(false);
    });

    it('should accept null adapter', () => {
      const { result } = renderHook(() => useContractSchema(null));

      expect(result.current.state).toBe('idle');
      expect(result.current.schema).toBeNull();
    });
  });

  // T038: Write test: useContractSchema loads from storage when available
  describe('loads from storage when available', () => {
    it('should load schema from storage if record exists with schema', async () => {
      const mockRecord = createMockRecord();
      mockGetByAddressAndNetwork.mockResolvedValue(mockRecord);
      mockHasSchema.mockResolvedValue(true);

      const mockAdapter = createMockAdapter();
      const { result } = renderHook(() => useContractSchema(mockAdapter));

      await act(async () => {
        await result.current.load('CTEST123ABC...', 'stellar-testnet');
      });

      // Should return schema from storage
      expect(result.current.state).toBe('success');
      expect(result.current.schema).toEqual(mockContractSchema);
      expect(result.current.record).toEqual(mockRecord);
      expect(result.current.hasSchema).toBe(true);

      // Should have checked storage
      expect(mockGetByAddressAndNetwork).toHaveBeenCalledWith('CTEST123ABC...', 'stellar-testnet');
    });

    it('should restore full record including metadata from storage', async () => {
      const mockRecord = createMockRecord({
        label: 'My Token',
        schemaMetadata: {
          fetchedFrom: 'https://soroban-testnet.stellar.org',
          fetchTimestamp: 1234567890,
          contractName: 'TestToken',
        },
      });
      mockGetByAddressAndNetwork.mockResolvedValue(mockRecord);
      mockHasSchema.mockResolvedValue(true);

      const mockAdapter = createMockAdapter();
      const { result } = renderHook(() => useContractSchema(mockAdapter));

      await act(async () => {
        await result.current.load('CTEST123ABC...', 'stellar-testnet');
      });

      expect(result.current.record?.label).toBe('My Token');
      expect(result.current.record?.schemaMetadata?.fetchedFrom).toBe(
        'https://soroban-testnet.stellar.org'
      );
      expect(result.current.record?.schemaMetadata?.contractName).toBe('TestToken');
    });

    it('should parse JSON schema string from storage correctly', async () => {
      const complexSchema: ContractSchema = {
        name: 'ComplexContract',
        ecosystem: 'stellar',
        functions: [
          {
            id: 'fn1',
            name: 'function1',
            displayName: 'Function 1',
            inputs: [{ name: 'arg1', type: 'string', displayName: 'Arg 1' }],
            outputs: [{ name: 'out1', type: 'number', displayName: 'Out 1' }],
            type: 'function',
            modifiesState: true,
          },
          {
            id: 'fn2',
            name: 'function2',
            displayName: 'Function 2',
            inputs: [],
            outputs: [],
            type: 'function',
            modifiesState: false,
          },
        ],
        events: [],
      };

      const mockRecord = createMockRecord({
        schema: JSON.stringify(complexSchema),
      });
      mockGetByAddressAndNetwork.mockResolvedValue(mockRecord);
      mockHasSchema.mockResolvedValue(true);

      const mockAdapter = createMockAdapter();
      const { result } = renderHook(() => useContractSchema(mockAdapter));

      await act(async () => {
        await result.current.load('CTEST123ABC...', 'stellar-testnet');
      });

      expect(result.current.schema).toEqual(complexSchema);
      expect(result.current.schema?.functions).toHaveLength(2);
      expect(result.current.schema?.functions[0].name).toBe('function1');
    });
  });

  // T039: Write test: useContractSchema skips network when schema exists
  describe('skips network when schema exists in storage', () => {
    it('should NOT call adapter when schema exists in storage', async () => {
      const mockRecord = createMockRecord();
      mockGetByAddressAndNetwork.mockResolvedValue(mockRecord);
      mockHasSchema.mockResolvedValue(true);

      const mockAdapter = createMockAdapter();
      const { result } = renderHook(() => useContractSchema(mockAdapter));

      await act(async () => {
        await result.current.load('CTEST123ABC...', 'stellar-testnet');
      });

      // Should NOT have called the network loader
      expect(mockLoad).not.toHaveBeenCalled();
    });

    it('should call adapter when schema does NOT exist in storage', async () => {
      // No record in storage
      mockGetByAddressAndNetwork.mockResolvedValue(null);
      mockHasSchema.mockResolvedValue(false);

      // Mock the loader to return a schema
      mockLoad.mockResolvedValue({
        schema: mockContractSchema,
        source: 'fetched',
        metadata: { rpcUrl: 'https://soroban-testnet.stellar.org' },
      });

      const mockAdapter = createMockAdapter();
      const { result } = renderHook(() => useContractSchema(mockAdapter));

      await act(async () => {
        await result.current.load('CTEST123ABC...', 'stellar-testnet');
      });

      // Should have called the network loader
      expect(mockLoad).toHaveBeenCalled();
    });

    it('should call adapter when record exists but has no schema', async () => {
      // Record exists but without schema
      const mockRecordWithoutSchema = createMockRecord({
        schema: undefined,
        schemaHash: undefined,
        ecosystem: undefined,
        source: undefined,
      });
      mockGetByAddressAndNetwork.mockResolvedValue(mockRecordWithoutSchema);
      mockHasSchema.mockResolvedValue(false);

      mockLoad.mockResolvedValue({
        schema: mockContractSchema,
        source: 'fetched',
        metadata: { rpcUrl: 'https://soroban-testnet.stellar.org' },
      });

      const mockAdapter = createMockAdapter();
      const { result } = renderHook(() => useContractSchema(mockAdapter));

      await act(async () => {
        await result.current.load('CTEST123ABC...', 'stellar-testnet');
      });

      // Should have called the network loader because no schema in storage
      expect(mockLoad).toHaveBeenCalled();
    });

    it('should use cached schema for subsequent loads of same contract', async () => {
      const mockRecord = createMockRecord();
      mockGetByAddressAndNetwork.mockResolvedValue(mockRecord);
      mockHasSchema.mockResolvedValue(true);

      const mockAdapter = createMockAdapter();
      const { result } = renderHook(() => useContractSchema(mockAdapter));

      // First load
      await act(async () => {
        await result.current.load('CTEST123ABC...', 'stellar-testnet');
      });

      // Reset the mock calls
      mockGetByAddressAndNetwork.mockClear();
      mockLoad.mockClear();

      // Second load of same contract
      await act(async () => {
        await result.current.load('CTEST123ABC...', 'stellar-testnet');
      });

      // Should check storage again (in case of external updates), but NOT call network
      expect(mockGetByAddressAndNetwork).toHaveBeenCalledTimes(1);
      expect(mockLoad).not.toHaveBeenCalled();
    });
  });

  // T040: Write test: multiple contracts are restored correctly
  describe('multiple contracts restored correctly', () => {
    it('should correctly restore different contracts from storage', async () => {
      const schema1: ContractSchema = {
        name: 'Token1',
        ecosystem: 'stellar',
        functions: [
          {
            id: 'transfer1',
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

      const schema2: ContractSchema = {
        name: 'Token2',
        ecosystem: 'stellar',
        functions: [
          {
            id: 'mint2',
            name: 'mint',
            displayName: 'Mint',
            inputs: [],
            outputs: [],
            type: 'function',
            modifiesState: true,
          },
        ],
        events: [],
      };

      const record1 = createMockRecord({
        id: 'record-1',
        address: 'CONTRACT_A',
        schema: JSON.stringify(schema1),
      });

      const record2 = createMockRecord({
        id: 'record-2',
        address: 'CONTRACT_B',
        schema: JSON.stringify(schema2),
      });

      mockGetByAddressAndNetwork.mockImplementation(
        (address: string): Promise<RecentContractRecord | null> => {
          if (address === 'CONTRACT_A') return Promise.resolve(record1);
          if (address === 'CONTRACT_B') return Promise.resolve(record2);
          return Promise.resolve(null);
        }
      );
      mockHasSchema.mockResolvedValue(true);

      const mockAdapter = createMockAdapter();
      const { result } = renderHook(() => useContractSchema(mockAdapter));

      // Load first contract
      await act(async () => {
        await result.current.load('CONTRACT_A', 'stellar-testnet');
      });

      expect(result.current.schema?.name).toBe('Token1');
      expect(result.current.record?.address).toBe('CONTRACT_A');

      // Load second contract
      await act(async () => {
        await result.current.load('CONTRACT_B', 'stellar-testnet');
      });

      expect(result.current.schema?.name).toBe('Token2');
      expect(result.current.record?.address).toBe('CONTRACT_B');
    });

    it('should handle contracts from different networks', async () => {
      const testnetRecord = createMockRecord({
        id: 'testnet-record',
        address: 'CONTRACT_X',
        networkId: 'stellar-testnet',
        schema: JSON.stringify({ ...mockContractSchema, name: 'TestnetToken' }),
      });

      const mainnetRecord = createMockRecord({
        id: 'mainnet-record',
        address: 'CONTRACT_X',
        networkId: 'stellar-mainnet',
        schema: JSON.stringify({ ...mockContractSchema, name: 'MainnetToken' }),
      });

      mockGetByAddressAndNetwork.mockImplementation(
        (address: string, networkId: string): Promise<RecentContractRecord | null> => {
          if (address === 'CONTRACT_X' && networkId === 'stellar-testnet')
            return Promise.resolve(testnetRecord);
          if (address === 'CONTRACT_X' && networkId === 'stellar-mainnet')
            return Promise.resolve(mainnetRecord);
          return Promise.resolve(null);
        }
      );
      mockHasSchema.mockResolvedValue(true);

      const mockAdapter = createMockAdapter();
      const { result } = renderHook(() => useContractSchema(mockAdapter));

      // Load testnet contract
      await act(async () => {
        await result.current.load('CONTRACT_X', 'stellar-testnet');
      });

      expect(result.current.schema?.name).toBe('TestnetToken');
      expect(result.current.record?.networkId).toBe('stellar-testnet');

      // Load mainnet contract (same address, different network)
      await act(async () => {
        await result.current.load('CONTRACT_X', 'stellar-mainnet');
      });

      expect(result.current.schema?.name).toBe('MainnetToken');
      expect(result.current.record?.networkId).toBe('stellar-mainnet');
    });

    it('should maintain independence between contracts with different schemas', async () => {
      const tokenSchema: ContractSchema = {
        name: 'TokenContract',
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
          {
            id: 'balance',
            name: 'balance',
            displayName: 'Balance',
            inputs: [],
            outputs: [],
            type: 'function',
            modifiesState: false,
          },
        ],
        events: [],
      };

      const nftSchema: ContractSchema = {
        name: 'NFTContract',
        ecosystem: 'stellar',
        functions: [
          {
            id: 'mint',
            name: 'mint',
            displayName: 'Mint',
            inputs: [],
            outputs: [],
            type: 'function',
            modifiesState: true,
          },
          {
            id: 'burn',
            name: 'burn',
            displayName: 'Burn',
            inputs: [],
            outputs: [],
            type: 'function',
            modifiesState: true,
          },
          {
            id: 'owner',
            name: 'owner',
            displayName: 'Owner',
            inputs: [],
            outputs: [],
            type: 'function',
            modifiesState: false,
          },
        ],
        events: [],
      };

      const tokenRecord = createMockRecord({
        id: 'token-record',
        address: 'TOKEN_ADDRESS',
        schema: JSON.stringify(tokenSchema),
      });

      const nftRecord = createMockRecord({
        id: 'nft-record',
        address: 'NFT_ADDRESS',
        schema: JSON.stringify(nftSchema),
      });

      mockGetByAddressAndNetwork.mockImplementation(
        (address: string): Promise<RecentContractRecord | null> => {
          if (address === 'TOKEN_ADDRESS') return Promise.resolve(tokenRecord);
          if (address === 'NFT_ADDRESS') return Promise.resolve(nftRecord);
          return Promise.resolve(null);
        }
      );
      mockHasSchema.mockResolvedValue(true);

      const mockAdapter = createMockAdapter();
      const { result } = renderHook(() => useContractSchema(mockAdapter));

      // Load token contract
      await act(async () => {
        await result.current.load('TOKEN_ADDRESS', 'stellar-testnet');
      });

      expect(result.current.schema?.functions).toHaveLength(2);
      expect(result.current.schema?.functions.map((f) => f.name)).toContain('transfer');
      expect(result.current.schema?.functions.map((f) => f.name)).toContain('balance');

      // Load NFT contract
      await act(async () => {
        await result.current.load('NFT_ADDRESS', 'stellar-testnet');
      });

      expect(result.current.schema?.functions).toHaveLength(3);
      expect(result.current.schema?.functions.map((f) => f.name)).toContain('mint');
      expect(result.current.schema?.functions.map((f) => f.name)).toContain('burn');
      expect(result.current.schema?.functions.map((f) => f.name)).toContain('owner');
      // Should NOT contain token functions
      expect(result.current.schema?.functions.map((f) => f.name)).not.toContain('transfer');
    });
  });

  // Additional tests for auto-save and error handling (T043, T044)
  describe('auto-save to storage after network load', () => {
    it('should save schema to storage after successful network load', async () => {
      // No record in storage initially
      mockGetByAddressAndNetwork.mockResolvedValue(null);
      mockHasSchema.mockResolvedValue(false);
      mockAddOrUpdateWithSchema.mockResolvedValue('new-record-id');

      // Mock the loader to return a schema
      mockLoad.mockResolvedValue({
        schema: mockContractSchema,
        source: 'fetched',
        contractDefinitionOriginal: '{"spec": []}',
        metadata: { rpcUrl: 'https://soroban-testnet.stellar.org' },
      });

      const mockAdapter = createMockAdapter();
      const { result } = renderHook(() => useContractSchema(mockAdapter));

      await act(async () => {
        await result.current.load('CTEST123ABC...', 'stellar-testnet');
      });

      // Should have saved to storage
      expect(mockAddOrUpdateWithSchema).toHaveBeenCalledWith(
        expect.objectContaining({
          address: 'CTEST123ABC...',
          networkId: 'stellar-testnet',
          ecosystem: 'stellar',
          schema: mockContractSchema,
          source: 'fetched',
        })
      );
    });

    it('should not save to storage if network load fails', async () => {
      mockGetByAddressAndNetwork.mockResolvedValue(null);
      mockHasSchema.mockResolvedValue(false);

      // Mock the loader to fail
      mockLoad.mockResolvedValue(null);

      const mockAdapter = createMockAdapter();
      const { result } = renderHook(() => useContractSchema(mockAdapter));

      await act(async () => {
        await result.current.load('CTEST123ABC...', 'stellar-testnet');
      });

      // Should NOT have saved to storage
      expect(mockAddOrUpdateWithSchema).not.toHaveBeenCalled();
    });
  });

  describe('storage quota error handling', () => {
    it('should handle storage quota errors gracefully', async () => {
      mockGetByAddressAndNetwork.mockResolvedValue(null);
      mockHasSchema.mockResolvedValue(false);

      // Mock successful network load
      mockLoad.mockResolvedValue({
        schema: mockContractSchema,
        source: 'fetched',
        metadata: { rpcUrl: 'https://soroban-testnet.stellar.org' },
      });

      // Mock storage quota error
      mockAddOrUpdateWithSchema.mockRejectedValue(new Error('QuotaExceededError'));

      const mockAdapter = createMockAdapter();
      const { result } = renderHook(() => useContractSchema(mockAdapter));

      await act(async () => {
        await result.current.load('CTEST123ABC...', 'stellar-testnet');
      });

      // Should still show the schema (graceful degradation)
      expect(result.current.schema).toEqual(mockContractSchema);
      expect(result.current.state).toBe('success');
      // The error should be captured but not block functionality
    });

    it('should show schema even when storage fails', async () => {
      mockGetByAddressAndNetwork.mockResolvedValue(null);
      mockHasSchema.mockResolvedValue(false);

      mockLoad.mockResolvedValue({
        schema: mockContractSchema,
        source: 'fetched',
        metadata: { rpcUrl: 'https://soroban-testnet.stellar.org' },
      });

      // Storage fails
      mockAddOrUpdateWithSchema.mockRejectedValue(new Error('Storage error'));

      const mockAdapter = createMockAdapter();
      const { result } = renderHook(() => useContractSchema(mockAdapter));

      await act(async () => {
        await result.current.load('CTEST123ABC...', 'stellar-testnet');
      });

      // Schema should still be available
      expect(result.current.schema).toBeDefined();
      expect(result.current.hasSchema).toBe(true);
    });
  });

  describe('reset functionality', () => {
    it('should clear all state when reset is called', async () => {
      const mockRecord = createMockRecord();
      mockGetByAddressAndNetwork.mockResolvedValue(mockRecord);
      mockHasSchema.mockResolvedValue(true);

      const mockAdapter = createMockAdapter();
      const { result } = renderHook(() => useContractSchema(mockAdapter));

      // Load a contract
      await act(async () => {
        await result.current.load('CTEST123ABC...', 'stellar-testnet');
      });

      expect(result.current.schema).not.toBeNull();
      expect(result.current.state).toBe('success');

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.state).toBe('idle');
      expect(result.current.schema).toBeNull();
      expect(result.current.record).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.hasSchema).toBe(false);
    });
  });

  describe('refresh functionality', () => {
    it('should return null when no schema is loaded', async () => {
      const mockAdapter = createMockAdapter();
      const { result } = renderHook(() => useContractSchema(mockAdapter));

      const refreshResult = await result.current.refresh();

      expect(refreshResult).toBeNull();
    });

    it('should return null for manual schemas', async () => {
      const manualRecord = createMockRecord({
        source: 'manual',
      });
      mockGetByAddressAndNetwork.mockResolvedValue(manualRecord);
      mockHasSchema.mockResolvedValue(true);

      const mockAdapter = createMockAdapter();
      const { result } = renderHook(() => useContractSchema(mockAdapter));

      await act(async () => {
        await result.current.load('CTEST123ABC...', 'stellar-testnet');
      });

      const refreshResult = await result.current.refresh();

      // Manual schemas cannot be refreshed
      expect(refreshResult).toBeNull();
    });
  });

  describe('interface compliance', () => {
    it('should match UseContractSchemaReturn interface', () => {
      const mockAdapter = createMockAdapter();
      const { result } = renderHook(() => useContractSchema(mockAdapter));

      expect(result.current).toHaveProperty('state');
      expect(result.current).toHaveProperty('schema');
      expect(result.current).toHaveProperty('record');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('isCircuitBreakerActive');
      expect(result.current).toHaveProperty('hasSchema');
      expect(result.current).toHaveProperty('load');
      expect(result.current).toHaveProperty('refresh');
      expect(result.current).toHaveProperty('reset');

      expect(typeof result.current.load).toBe('function');
      expect(typeof result.current.refresh).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });
});
