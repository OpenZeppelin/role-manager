/**
 * Tests for useAdminDelayDialog hook
 * Feature: 017-evm-access-control (T058, US7)
 *
 * Tests state management for admin delay change and rollback dialogs.
 * Mutation execution is tested in useAccessControlMutations.test.tsx.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';

import type { ContractAdapter } from '@openzeppelin/ui-types';

import { useAdminDelayDialog } from '../useAdminDelayDialog';
import { useSelectedContract } from '../useSelectedContract';
import { useTransactionExecution } from '../useTransactionExecution';

vi.mock('../useSelectedContract', () => ({
  useSelectedContract: vi.fn(),
}));

vi.mock('../useRoleManagerAnalytics', () => ({
  useRoleManagerAnalytics: vi.fn(() => ({
    trackAdminDelayChangeScheduled: vi.fn(),
    trackAdminDelayChangeRolledBack: vi.fn(),
  })),
}));

vi.mock('../useAccessControlMutations', () => ({
  useChangeAdminDelay: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'tx-change' }),
    reset: vi.fn(),
    status: 'idle',
    statusDetails: null,
    isPending: false,
  })),
  useRollbackAdminDelay: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'tx-rollback' }),
    reset: vi.fn(),
    status: 'idle',
    statusDetails: null,
    isPending: false,
  })),
}));

vi.mock('../useTransactionExecution', () => ({
  useTransactionExecution: vi.fn(() => ({
    step: 'form' as const,
    errorMessage: null as string | null,
    execute: vi.fn().mockResolvedValue(undefined),
    retry: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn(),
  })),
}));

const mockAdapter = {} as ContractAdapter;

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

describe('useAdminDelayDialog', () => {
  const mockUseSelectedContract = vi.mocked(useSelectedContract);
  const mockUseTransactionExecution = vi.mocked(useTransactionExecution);

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSelectedContract.mockReturnValue({
      selectedContract: { id: '1', address: '0xCONTRACT' },
      adapter: mockAdapter,
    } as never);
    mockUseTransactionExecution.mockReturnValue({
      step: 'form',
      errorMessage: null,
      execute: vi.fn().mockResolvedValue(undefined),
      retry: vi.fn().mockResolvedValue(undefined),
      reset: vi.fn(),
    } as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('change dialog', () => {
    it('starts with change dialog closed', () => {
      const { result } = renderHook(() => useAdminDelayDialog(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isChangeDialogOpen).toBe(false);
      expect(result.current.newDelayInput).toBe('');
    });

    it('openChangeDialog opens change dialog and resets input', () => {
      const { result } = renderHook(() => useAdminDelayDialog(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setNewDelayInput('3600');
      });
      expect(result.current.newDelayInput).toBe('3600');

      act(() => {
        result.current.openChangeDialog();
      });

      expect(result.current.isChangeDialogOpen).toBe(true);
      expect(result.current.newDelayInput).toBe('');
    });

    it('closeChangeDialog closes change dialog', () => {
      const { result } = renderHook(() => useAdminDelayDialog(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openChangeDialog();
      });
      expect(result.current.isChangeDialogOpen).toBe(true);

      act(() => {
        result.current.closeChangeDialog();
      });

      expect(result.current.isChangeDialogOpen).toBe(false);
    });
  });

  describe('rollback dialog', () => {
    it('starts with rollback dialog closed', () => {
      const { result } = renderHook(() => useAdminDelayDialog(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isRollbackDialogOpen).toBe(false);
    });

    it('openRollbackDialog opens rollback dialog', () => {
      const { result } = renderHook(() => useAdminDelayDialog(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openRollbackDialog();
      });

      expect(result.current.isRollbackDialogOpen).toBe(true);
    });

    it('closeRollbackDialog closes rollback dialog', () => {
      const { result } = renderHook(() => useAdminDelayDialog(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openRollbackDialog();
      });
      expect(result.current.isRollbackDialogOpen).toBe(true);

      act(() => {
        result.current.closeRollbackDialog();
      });

      expect(result.current.isRollbackDialogOpen).toBe(false);
    });
  });

  describe('mutual exclusivity', () => {
    it('opening change dialog closes rollback dialog', () => {
      const { result } = renderHook(() => useAdminDelayDialog(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openRollbackDialog();
      });
      expect(result.current.isRollbackDialogOpen).toBe(true);

      act(() => {
        result.current.openChangeDialog();
      });

      expect(result.current.isChangeDialogOpen).toBe(true);
      expect(result.current.isRollbackDialogOpen).toBe(false);
    });

    it('opening rollback dialog closes change dialog', () => {
      const { result } = renderHook(() => useAdminDelayDialog(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.openChangeDialog();
      });
      expect(result.current.isChangeDialogOpen).toBe(true);

      act(() => {
        result.current.openRollbackDialog();
      });

      expect(result.current.isRollbackDialogOpen).toBe(true);
      expect(result.current.isChangeDialogOpen).toBe(false);
    });
  });
});
