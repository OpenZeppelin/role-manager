/**
 * Tests for useTransactionExecution hook
 * Feature: 014-role-grant-revoke
 *
 * Tests for the reusable transaction execution hook.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PropsWithChildren } from 'react';

import type {
  OperationResult,
  TransactionStatusUpdate,
  TxStatus,
} from '@openzeppelin/ui-types';

import {
  isUserRejectionError,
  useMultiMutationExecution,
  useTransactionExecution,
  type MutationHook,
} from '../useTransactionExecution';

// =============================================================================
// Test Fixtures
// =============================================================================

const mockOperationResult: OperationResult = {
  id: 'tx-123456',
};

interface TestMutationArgs {
  roleId: string;
  account: string;
}

// =============================================================================
// Test Utilities
// =============================================================================

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
};

const createMockMutation = (
  overrides?: Partial<MutationHook<TestMutationArgs>>
): MutationHook<TestMutationArgs> => ({
  mutateAsync: vi.fn().mockResolvedValue(mockOperationResult),
  reset: vi.fn(),
  status: 'idle' as TxStatus,
  statusDetails: null as TransactionStatusUpdate | null,
  isPending: false,
  ...overrides,
});

// =============================================================================
// Tests: isUserRejectionError
// =============================================================================

describe('isUserRejectionError', () => {
  it('should detect "rejected" in error message', () => {
    expect(isUserRejectionError(new Error('User rejected the transaction'))).toBe(true);
    expect(isUserRejectionError(new Error('Transaction rejected'))).toBe(true);
  });

  it('should detect "cancelled" in error message', () => {
    expect(isUserRejectionError(new Error('Transaction was cancelled'))).toBe(true);
    expect(isUserRejectionError(new Error('User cancelled'))).toBe(true);
  });

  it('should detect "denied" in error message', () => {
    expect(isUserRejectionError(new Error('User denied signature'))).toBe(true);
    expect(isUserRejectionError(new Error('Transaction denied'))).toBe(true);
  });

  it('should detect "user refused" in error message', () => {
    expect(isUserRejectionError(new Error('User refused to sign'))).toBe(true);
  });

  it('should be case insensitive', () => {
    expect(isUserRejectionError(new Error('USER REJECTED'))).toBe(true);
    expect(isUserRejectionError(new Error('CANCELLED'))).toBe(true);
  });

  it('should return false for network errors', () => {
    expect(isUserRejectionError(new Error('Network disconnected'))).toBe(false);
    expect(isUserRejectionError(new Error('Connection timeout'))).toBe(false);
    expect(isUserRejectionError(new Error('Failed to fetch'))).toBe(false);
  });
});

// =============================================================================
// Tests: useTransactionExecution
// =============================================================================

describe('useTransactionExecution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should start in form state', () => {
      const mutation = createMockMutation();
      const { result } = renderHook(() => useTransactionExecution(mutation), {
        wrapper: createWrapper(),
      });

      expect(result.current.step).toBe('form');
      expect(result.current.errorMessage).toBeNull();
      expect(result.current.isTransacting).toBe(false);
      expect(result.current.canSubmit).toBe(true);
    });

    it('should have canSubmit=false when mutation is pending', () => {
      const mutation = createMockMutation({ isPending: true });
      const { result } = renderHook(() => useTransactionExecution(mutation), {
        wrapper: createWrapper(),
      });

      expect(result.current.canSubmit).toBe(false);
    });
  });

  describe('execute', () => {
    it('should transition to pending state when executing', async () => {
      let resolvePromise: (value: OperationResult) => void;
      const pendingPromise = new Promise<OperationResult>((resolve) => {
        resolvePromise = resolve;
      });

      const mutation = createMockMutation({
        mutateAsync: vi.fn().mockReturnValue(pendingPromise),
      });

      const { result } = renderHook(() => useTransactionExecution(mutation), {
        wrapper: createWrapper(),
      });

      // Start execution
      act(() => {
        void result.current.execute({ roleId: 'ROLE_ID', account: '0xAccount' });
      });

      expect(result.current.step).toBe('pending');
      expect(result.current.isTransacting).toBe(true);

      // Cleanup
      await act(async () => {
        resolvePromise!(mockOperationResult);
        await pendingPromise;
      });
    });

    it('should call mutation.mutateAsync with correct args', async () => {
      const mutation = createMockMutation();
      const { result } = renderHook(() => useTransactionExecution(mutation), {
        wrapper: createWrapper(),
      });

      const args = { roleId: 'ROLE_ID', account: '0xAccount' };
      await act(async () => {
        await result.current.execute(args);
      });

      expect(mutation.mutateAsync).toHaveBeenCalledWith(args);
    });

    it('should transition to success state on success', async () => {
      const mutation = createMockMutation();
      const { result } = renderHook(() => useTransactionExecution(mutation), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.execute({ roleId: 'ROLE_ID', account: '0xAccount' });
      });

      expect(result.current.step).toBe('success');
    });

    it('should call onSuccess callback on success', async () => {
      const onSuccess = vi.fn();
      const mutation = createMockMutation();

      const { result } = renderHook(() => useTransactionExecution(mutation, { onSuccess }), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.execute({ roleId: 'ROLE_ID', account: '0xAccount' });
      });

      expect(onSuccess).toHaveBeenCalledWith(mockOperationResult);
    });

    it('should auto-close after 1.5s on success', async () => {
      const onClose = vi.fn();
      const mutation = createMockMutation();

      const { result } = renderHook(() => useTransactionExecution(mutation, { onClose }), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.execute({ roleId: 'ROLE_ID', account: '0xAccount' });
      });

      expect(onClose).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(1500);
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should use custom autoCloseDelay when provided', async () => {
      const onClose = vi.fn();
      const mutation = createMockMutation();

      const { result } = renderHook(
        () => useTransactionExecution(mutation, { onClose, autoCloseDelay: 3000 }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.execute({ roleId: 'ROLE_ID', account: '0xAccount' });
      });

      act(() => {
        vi.advanceTimersByTime(1500);
      });
      expect(onClose).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(1500);
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should transition to error state on network error', async () => {
      const mutation = createMockMutation({
        mutateAsync: vi.fn().mockRejectedValue(new Error('Network disconnected')),
      });

      const { result } = renderHook(() => useTransactionExecution(mutation), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.execute({ roleId: 'ROLE_ID', account: '0xAccount' });
      });

      expect(result.current.step).toBe('error');
      expect(result.current.errorMessage).toBe('Network disconnected');
    });

    it('should transition to cancelled state on user rejection', async () => {
      const mutation = createMockMutation({
        mutateAsync: vi.fn().mockRejectedValue(new Error('User rejected the transaction')),
      });

      const { result } = renderHook(() => useTransactionExecution(mutation), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.execute({ roleId: 'ROLE_ID', account: '0xAccount' });
      });

      expect(result.current.step).toBe('cancelled');
      expect(result.current.errorMessage).toBeNull();
    });
  });

  describe('retry', () => {
    it('should retry with the same args', async () => {
      const mutateAsync = vi.fn();
      mutateAsync.mockRejectedValueOnce(new Error('Network error'));
      mutateAsync.mockResolvedValueOnce(mockOperationResult);

      const mutation = createMockMutation({ mutateAsync });

      const { result } = renderHook(() => useTransactionExecution(mutation), {
        wrapper: createWrapper(),
      });

      const args = { roleId: 'ROLE_ID', account: '0xAccount' };

      // First attempt fails
      await act(async () => {
        await result.current.execute(args);
      });

      expect(result.current.step).toBe('error');
      expect(mutateAsync).toHaveBeenCalledTimes(1);

      // Retry succeeds
      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.step).toBe('success');
      expect(mutateAsync).toHaveBeenCalledTimes(2);
      expect(mutateAsync).toHaveBeenLastCalledWith(args);
    });

    it('should do nothing if no previous execution', async () => {
      const mutation = createMockMutation();

      const { result } = renderHook(() => useTransactionExecution(mutation), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.retry();
      });

      expect(mutation.mutateAsync).not.toHaveBeenCalled();
      expect(result.current.step).toBe('form');
    });
  });

  describe('reset', () => {
    it('should reset to form state', async () => {
      const mutation = createMockMutation({
        mutateAsync: vi.fn().mockRejectedValue(new Error('Network error')),
      });

      const { result } = renderHook(() => useTransactionExecution(mutation), {
        wrapper: createWrapper(),
      });

      // Get to error state
      await act(async () => {
        await result.current.execute({ roleId: 'ROLE_ID', account: '0xAccount' });
      });

      expect(result.current.step).toBe('error');

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.step).toBe('form');
      expect(result.current.errorMessage).toBeNull();
      expect(mutation.reset).toHaveBeenCalled();
    });
  });
});

// =============================================================================
// Tests: useMultiMutationExecution
// =============================================================================

describe('useMultiMutationExecution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should start in form state', () => {
      const { result } = renderHook(() => useMultiMutationExecution(), {
        wrapper: createWrapper(),
      });

      expect(result.current.step).toBe('form');
      expect(result.current.errorMessage).toBeNull();
      expect(result.current.isTransacting).toBe(false);
    });
  });

  describe('execute', () => {
    it('should execute the provided function', async () => {
      const executeFn = vi.fn().mockResolvedValue(mockOperationResult);

      const { result } = renderHook(() => useMultiMutationExecution(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.execute(executeFn);
      });

      expect(executeFn).toHaveBeenCalled();
      expect(result.current.step).toBe('success');
    });

    it('should transition to pending during execution', async () => {
      let resolvePromise: (value: OperationResult) => void;
      const pendingPromise = new Promise<OperationResult>((resolve) => {
        resolvePromise = resolve;
      });

      const { result } = renderHook(() => useMultiMutationExecution(), {
        wrapper: createWrapper(),
      });

      act(() => {
        void result.current.execute(() => pendingPromise);
      });

      expect(result.current.step).toBe('pending');
      expect(result.current.isTransacting).toBe(true);

      // Cleanup
      await act(async () => {
        resolvePromise!(mockOperationResult);
        await pendingPromise;
      });
    });

    it('should call onSuccess on success', async () => {
      const onSuccess = vi.fn();

      const { result } = renderHook(() => useMultiMutationExecution({ onSuccess }), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.execute(() => Promise.resolve(mockOperationResult));
      });

      expect(onSuccess).toHaveBeenCalledWith(mockOperationResult);
    });

    it('should auto-close after delay on success', async () => {
      const onClose = vi.fn();

      const { result } = renderHook(() => useMultiMutationExecution({ onClose }), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.execute(() => Promise.resolve(mockOperationResult));
      });

      expect(onClose).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(1500);
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should handle errors correctly', async () => {
      const { result } = renderHook(() => useMultiMutationExecution(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.execute(() => Promise.reject(new Error('Network error')));
      });

      expect(result.current.step).toBe('error');
      expect(result.current.errorMessage).toBe('Network error');
    });

    it('should detect user rejection', async () => {
      const { result } = renderHook(() => useMultiMutationExecution(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.execute(() =>
          Promise.reject(new Error('User rejected the transaction'))
        );
      });

      expect(result.current.step).toBe('cancelled');
    });
  });

  describe('retry', () => {
    it('should retry the last execution function', async () => {
      const executeFn = vi.fn();
      executeFn.mockRejectedValueOnce(new Error('Network error'));
      executeFn.mockResolvedValueOnce(mockOperationResult);

      const { result } = renderHook(() => useMultiMutationExecution(), {
        wrapper: createWrapper(),
      });

      // First attempt fails
      await act(async () => {
        await result.current.execute(executeFn);
      });

      expect(result.current.step).toBe('error');

      // Retry succeeds
      await act(async () => {
        await result.current.retry();
      });

      expect(result.current.step).toBe('success');
      expect(executeFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('reset', () => {
    it('should reset to form state and call resetMutations', async () => {
      const resetFn1 = vi.fn();
      const resetFn2 = vi.fn();

      const { result } = renderHook(
        () => useMultiMutationExecution({ resetMutations: [resetFn1, resetFn2] }),
        { wrapper: createWrapper() }
      );

      // Get to error state
      await act(async () => {
        await result.current.execute(() => Promise.reject(new Error('Error')));
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.step).toBe('form');
      expect(resetFn1).toHaveBeenCalled();
      expect(resetFn2).toHaveBeenCalled();
    });
  });
});
