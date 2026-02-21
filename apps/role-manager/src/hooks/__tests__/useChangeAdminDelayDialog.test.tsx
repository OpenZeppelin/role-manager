/**
 * Tests for useChangeAdminDelayDialog hook
 * Feature: 017-evm-access-control (T064, US7)
 *
 * Tests transaction state management for the change admin delay dialog.
 * Form input state is owned by the dialog component (react-hook-form),
 * so the hook only exposes submit(newDelay), retry, and reset.
 * Mutation execution is tested in useAccessControlMutations.test.tsx.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';

import type { ContractAdapter } from '@openzeppelin/ui-types';

import { useChangeAdminDelayDialog } from '../useChangeAdminDelayDialog';
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

describe('useChangeAdminDelayDialog', () => {
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

  it('starts with form step and no error', () => {
    const { result } = renderHook(() => useChangeAdminDelayDialog(), {
      wrapper: createWrapper(),
    });

    expect(result.current.step).toBe('form');
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.isPending).toBe(false);
  });

  it('does not call execute when delay is invalid (NaN or <= 0)', async () => {
    const mockExecute = vi.fn().mockResolvedValue(undefined);
    mockUseTransactionExecution.mockReturnValue({
      step: 'form',
      errorMessage: null,
      execute: mockExecute,
      retry: vi.fn().mockResolvedValue(undefined),
      reset: vi.fn(),
    } as never);

    const { result } = renderHook(() => useChangeAdminDelayDialog(), {
      wrapper: createWrapper(),
    });

    // NaN
    await act(async () => {
      await result.current.submit(NaN);
    });
    expect(mockExecute).not.toHaveBeenCalled();

    // Zero
    await act(async () => {
      await result.current.submit(0);
    });
    expect(mockExecute).not.toHaveBeenCalled();

    // Negative
    await act(async () => {
      await result.current.submit(-5);
    });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('calls execute with delay when value is valid', async () => {
    const mockExecute = vi.fn().mockResolvedValue(undefined);
    mockUseTransactionExecution.mockReturnValue({
      step: 'form',
      errorMessage: null,
      execute: mockExecute,
      retry: vi.fn().mockResolvedValue(undefined),
      reset: vi.fn(),
    } as never);

    const { result } = renderHook(() => useChangeAdminDelayDialog(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.submit(3600);
    });

    expect(mockExecute).toHaveBeenCalledWith({
      newDelay: 3600,
      executionConfig: { method: 'eoa', allowAny: true },
    });
  });

  it('exposes retry and reset from execution', () => {
    const mockRetry = vi.fn().mockResolvedValue(undefined);
    const mockReset = vi.fn();
    mockUseTransactionExecution.mockReturnValue({
      step: 'form',
      errorMessage: null,
      execute: vi.fn().mockResolvedValue(undefined),
      retry: mockRetry,
      reset: mockReset,
    } as never);

    const { result } = renderHook(() => useChangeAdminDelayDialog(), {
      wrapper: createWrapper(),
    });

    result.current.retry();
    expect(mockRetry).toHaveBeenCalled();

    result.current.reset();
    expect(mockReset).toHaveBeenCalled();
  });
});
