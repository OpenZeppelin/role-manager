/**
 * Tests for useRenounceDialog hook
 * Feature: 017-evm-access-control (T047)
 *
 * Tests the state management and configuration logic for renounce confirmation dialogs.
 * Covers ownership vs role configuration, initial state, wallet connection, and submit flow.
 *
 * Mutation execution is tested separately in useAccessControlMutations.test.tsx.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';

import { useDerivedAccountStatus } from '@openzeppelin/ui-react';
import type { ContractAdapter } from '@openzeppelin/ui-types';

import { useRenounceOwnership, useRenounceRole } from '../useAccessControlMutations';
import { useRenounceDialog } from '../useRenounceDialog';
import { useSelectedContract } from '../useSelectedContract';
import { useTransactionExecution } from '../useTransactionExecution';

// =============================================================================
// Mocks
// =============================================================================

vi.mock('../useSelectedContract', () => ({
  useSelectedContract: vi.fn(),
}));

vi.mock('@openzeppelin/ui-react', () => ({
  useDerivedAccountStatus: vi.fn(),
}));

vi.mock('../useAccessControlMutations', () => ({
  useRenounceOwnership: vi.fn(),
  useRenounceRole: vi.fn(),
}));

vi.mock('../useTransactionExecution', () => ({
  useTransactionExecution: vi.fn(),
}));

// =============================================================================
// Fixtures
// =============================================================================

const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const CONNECTED_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const ROLE_ID = '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6';
const ROLE_NAME = 'Minter';

const mockAdapter = {} as ContractAdapter;

const createMockMutation = (overrides?: { isPending?: boolean; status?: string }) => ({
  mutateAsync: vi.fn().mockResolvedValue({ id: 'tx-123' }),
  reset: vi.fn(),
  status: 'idle',
  statusDetails: null,
  isPending: false,
  ...overrides,
});

const createMockExecution = () => ({
  step: 'form' as const,
  errorMessage: null as string | null,
  execute: vi.fn().mockResolvedValue(undefined),
  retry: vi.fn().mockResolvedValue(undefined),
  reset: vi.fn(),
});

// =============================================================================
// Wrapper
// =============================================================================

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
};

// =============================================================================
// Tests
// =============================================================================

describe('useRenounceDialog', () => {
  const mockUseSelectedContract = vi.mocked(useSelectedContract);
  const mockUseDerivedAccountStatus = vi.mocked(useDerivedAccountStatus);
  const mockUseRenounceOwnership = vi.mocked(useRenounceOwnership);
  const mockUseRenounceRole = vi.mocked(useRenounceRole);
  const mockUseTransactionExecution = vi.mocked(useTransactionExecution);

  let ownershipExecution: ReturnType<typeof createMockExecution>;
  let roleExecution: ReturnType<typeof createMockExecution>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseSelectedContract.mockReturnValue({
      selectedContract: { id: '1', address: CONTRACT_ADDRESS },
      adapter: mockAdapter,
    } as never);

    mockUseDerivedAccountStatus.mockReturnValue({ address: CONNECTED_ADDRESS } as never);

    const ownershipMutation = createMockMutation();
    const roleMutation = createMockMutation();
    mockUseRenounceOwnership.mockReturnValue(ownershipMutation as never);
    mockUseRenounceRole.mockReturnValue(roleMutation as never);

    ownershipExecution = createMockExecution();
    roleExecution = createMockExecution();

    mockUseTransactionExecution.mockImplementation((_mutation, _options) => {
      // Differentiate by mutation identity: ownership is first, role is second
      if (mockUseTransactionExecution.mock.calls.length === 1) {
        return ownershipExecution as never;
      }
      return roleExecution as never;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('ownership configuration', () => {
    it('returns correct title, warningText, confirmKeyword, submitLabel, successMessage when type="ownership"', () => {
      const { result } = renderHook(() => useRenounceDialog({ type: 'ownership' }), {
        wrapper: createWrapper(),
      });

      expect(result.current.title).toBe('Renounce Ownership');
      expect(result.current.warningText).toBe(
        'This action is irreversible. Once ownership is renounced, the contract will have no owner and owner-only functions will be permanently inaccessible.'
      );
      expect(result.current.confirmKeyword).toBe('RENOUNCE');
      expect(result.current.submitLabel).toBe('Renounce Ownership');
      expect(result.current.successMessage).toBe('Ownership has been renounced successfully.');
    });
  });

  describe('role configuration', () => {
    it('returns contextual title and warningText with role name when type="role" with roleName', () => {
      const { result } = renderHook(
        () =>
          useRenounceDialog({
            type: 'role',
            roleId: ROLE_ID,
            roleName: ROLE_NAME,
          }),
        {
          wrapper: createWrapper(),
        }
      );

      expect(result.current.title).toBe('Renounce Role: Minter');
      expect(result.current.warningText).toContain('"Minter"');
      expect(result.current.warningText).toContain(
        'You will lose all permissions associated with this role'
      );
      expect(result.current.confirmKeyword).toBe('RENOUNCE');
      expect(result.current.submitLabel).toBe('Renounce Role');
      expect(result.current.successMessage).toContain('"Minter"');
    });

    it('falls back to roleId when roleName is not provided', () => {
      const { result } = renderHook(
        () =>
          useRenounceDialog({
            type: 'role',
            roleId: ROLE_ID,
          }),
        {
          wrapper: createWrapper(),
        }
      );

      expect(result.current.title).toBe(`Renounce Role: ${ROLE_ID}`);
      expect(result.current.warningText).toContain(`"${ROLE_ID}"`);
      expect(result.current.successMessage).toContain(`"${ROLE_ID}"`);
    });

    it('falls back to "Unknown" when neither roleId nor roleName provided', () => {
      const { result } = renderHook(
        () =>
          useRenounceDialog({
            type: 'role',
          }),
        {
          wrapper: createWrapper(),
        }
      );

      expect(result.current.title).toBe('Renounce Role: Unknown');
      expect(result.current.warningText).toContain('Unknown');
    });
  });

  describe('initial state', () => {
    it('returns step="form", errorMessage=null, isPending=false initially', () => {
      const { result } = renderHook(() => useRenounceDialog({ type: 'ownership' }), {
        wrapper: createWrapper(),
      });

      expect(result.current.step).toBe('form');
      expect(result.current.errorMessage).toBeNull();
      expect(result.current.isPending).toBe(false);
    });
  });

  describe('wallet connection', () => {
    it('isWalletConnected is true when useDerivedAccountStatus returns address', () => {
      mockUseDerivedAccountStatus.mockReturnValue({ address: CONNECTED_ADDRESS } as never);

      const { result } = renderHook(() => useRenounceDialog({ type: 'ownership' }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isWalletConnected).toBe(true);
    });

    it('isWalletConnected is false when useDerivedAccountStatus returns no address', () => {
      mockUseDerivedAccountStatus.mockReturnValue({ address: undefined } as never);

      const { result } = renderHook(() => useRenounceDialog({ type: 'ownership' }), {
        wrapper: createWrapper(),
      });

      expect(result.current.isWalletConnected).toBe(false);
    });
  });

  describe('submit for ownership', () => {
    it('calls ownership execution execute with executionConfig when type="ownership"', async () => {
      const { result } = renderHook(() => useRenounceDialog({ type: 'ownership' }), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.submit();
      });

      expect(ownershipExecution.execute).toHaveBeenCalledTimes(1);
      expect(ownershipExecution.execute).toHaveBeenCalledWith({
        executionConfig: expect.objectContaining({ method: 'eoa', allowAny: true }),
      });
      expect(roleExecution.execute).not.toHaveBeenCalled();
    });
  });

  describe('submit for role', () => {
    it('calls role execution execute with roleId and connectedAddress when type="role"', async () => {
      const { result } = renderHook(
        () =>
          useRenounceDialog({
            type: 'role',
            roleId: ROLE_ID,
            roleName: ROLE_NAME,
          }),
        {
          wrapper: createWrapper(),
        }
      );

      await act(async () => {
        await result.current.submit();
      });

      expect(roleExecution.execute).toHaveBeenCalledTimes(1);
      expect(roleExecution.execute).toHaveBeenCalledWith({
        roleId: ROLE_ID,
        account: CONNECTED_ADDRESS,
        executionConfig: expect.objectContaining({ method: 'eoa', allowAny: true }),
      });
      expect(ownershipExecution.execute).not.toHaveBeenCalled();
    });

    it('does not call role execution when roleId is missing', async () => {
      const { result } = renderHook(
        () =>
          useRenounceDialog({
            type: 'role',
            roleName: ROLE_NAME,
          }),
        {
          wrapper: createWrapper(),
        }
      );

      await act(async () => {
        await result.current.submit();
      });

      expect(roleExecution.execute).not.toHaveBeenCalled();
    });

    it('does not call role execution when connectedAddress is missing', async () => {
      mockUseDerivedAccountStatus.mockReturnValue({ address: undefined } as never);

      const { result } = renderHook(
        () =>
          useRenounceDialog({
            type: 'role',
            roleId: ROLE_ID,
            roleName: ROLE_NAME,
          }),
        {
          wrapper: createWrapper(),
        }
      );

      await act(async () => {
        await result.current.submit();
      });

      expect(roleExecution.execute).not.toHaveBeenCalled();
    });
  });

  describe('retry and reset', () => {
    it('retry delegates to execution retry', async () => {
      const { result } = renderHook(() => useRenounceDialog({ type: 'ownership' }), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.retry();
      });

      expect(ownershipExecution.retry).toHaveBeenCalledTimes(1);
    });

    it('reset delegates to execution reset', () => {
      const { result } = renderHook(() => useRenounceDialog({ type: 'ownership' }), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.reset();
      });

      expect(ownershipExecution.reset).toHaveBeenCalledTimes(1);
    });

    it('role retry delegates to role execution', async () => {
      const { result } = renderHook(
        () =>
          useRenounceDialog({
            type: 'role',
            roleId: ROLE_ID,
          }),
        {
          wrapper: createWrapper(),
        }
      );

      await act(async () => {
        await result.current.retry();
      });

      expect(roleExecution.retry).toHaveBeenCalledTimes(1);
    });
  });
});
