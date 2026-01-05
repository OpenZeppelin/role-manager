/**
 * ErrorBoundary Component
 * Feature: 006-access-control-service
 *
 * Provides error boundary wrapper for handling "partial data" scenarios.
 * Integrates with @tanstack/react-query's QueryErrorResetBoundary.
 */

import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@openzeppelin/ui-components';
import { cn } from '@openzeppelin/ui-utils';

import { ErrorCategory, getErrorMeta } from '../utils/errors';

/**
 * Props for ErrorFallback component
 */
interface ErrorFallbackProps {
  /** The error that was caught */
  error: Error;
  /** Function to reset the error state and retry */
  resetErrorBoundary: () => void;
  /** Optional className for styling */
  className?: string;
  /** Whether to show in compact mode (inline banner vs full card) */
  compact?: boolean;
}

/**
 * Error fallback UI component
 *
 * Displays a user-friendly error message with categorized information
 * and retry capability. Supports compact mode for inline display.
 */
export function ErrorFallback({
  error,
  resetErrorBoundary,
  className,
  compact = false,
}: ErrorFallbackProps): React.ReactElement {
  const meta = getErrorMeta(error);

  const Icon =
    meta.category === ErrorCategory.NETWORK_ERROR ||
    meta.category === ErrorCategory.INDEXER_UNAVAILABLE
      ? WifiOff
      : AlertTriangle;

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3',
          className
        )}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-amber-600" />
          <span className="text-sm text-amber-800">{meta.title}</span>
        </div>
        {meta.canRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetErrorBoundary}
            className="h-7 gap-1.5 px-2"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-8 text-center',
        className
      )}
    >
      <div className="rounded-full bg-amber-100 p-3">
        <Icon className="h-6 w-6 text-amber-600" />
      </div>

      <div className="max-w-sm">
        <h3 className="text-lg font-semibold text-slate-900">{meta.title}</h3>
        <p className="mt-1 text-sm text-slate-600">{meta.description}</p>
      </div>

      {meta.hasPartialData && (
        <p className="text-xs text-slate-500">
          Some features may still be available with limited functionality.
        </p>
      )}

      {meta.canRetry && (
        <Button onClick={resetErrorBoundary} variant="outline" className="mt-2 gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  );
}

/**
 * Props for ErrorBoundary component
 */
interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;
  /** Optional custom fallback component */
  fallback?: ReactNode;
  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Callback when error is reset */
  onReset?: () => void;
  /** Whether to use compact fallback mode */
  compact?: boolean;
  /** Optional className for fallback styling */
  className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Class-based error boundary for catching render errors
 *
 * Required because React error boundaries must be class components.
 * Wrapped by ErrorBoundary function component for react-query integration.
 */
class ErrorBoundaryInner extends Component<
  ErrorBoundaryProps & { resetKey?: string },
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps & { resetKey?: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps & { resetKey?: string }): void {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = (): void => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          resetErrorBoundary={this.resetErrorBoundary}
          compact={this.props.compact}
          className={this.props.className}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Error boundary component with react-query integration
 *
 * Wraps children with both React's error boundary and react-query's
 * QueryErrorResetBoundary for comprehensive error handling.
 *
 * Features:
 * - Catches render errors from child components
 * - Integrates with react-query for query error reset
 * - Categorizes errors for appropriate user feedback
 * - Provides retry functionality for recoverable errors
 * - Supports compact mode for inline error display
 *
 * @example
 * ```tsx
 * // Wrap a section that might throw
 * <ErrorBoundary onError={(e) => console.error(e)}>
 *   <RolesList contractAddress={address} />
 * </ErrorBoundary>
 *
 * // With compact mode for inline display
 * <ErrorBoundary compact>
 *   <OwnershipCard />
 * </ErrorBoundary>
 * ```
 */
export function ErrorBoundary({
  children,
  fallback,
  onError,
  onReset,
  compact = false,
  className,
}: ErrorBoundaryProps): React.ReactElement {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundaryInner
          fallback={fallback}
          onError={onError}
          onReset={() => {
            reset();
            onReset?.();
          }}
          compact={compact}
          className={className}
        >
          {children}
        </ErrorBoundaryInner>
      )}
    </QueryErrorResetBoundary>
  );
}
