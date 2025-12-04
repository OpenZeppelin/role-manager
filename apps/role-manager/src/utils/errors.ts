/**
 * Error utilities
 * Feature: 006-access-control-service
 *
 * Consolidated error categorization, types, and utilities for handling
 * "partial data" scenarios (FR-012) across hooks and components.
 */

/**
 * Error categories for UI display and retry logic
 */
export enum ErrorCategory {
  /** Service not available (adapter issue) */
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  /** Indexer/data source is down */
  INDEXER_UNAVAILABLE = 'INDEXER_UNAVAILABLE',
  /** Network connectivity issue */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** Contract call reverted or failed */
  CONTRACT_CALL_FAILED = 'CONTRACT_CALL_FAILED',
  /** Generic/unknown error */
  UNKNOWN = 'UNKNOWN',
}

/**
 * Error metadata for enhanced error display
 */
export interface ErrorMeta {
  category: ErrorCategory;
  title: string;
  description: string;
  canRetry: boolean;
  hasPartialData: boolean;
}

/**
 * Structured error for data operations with categorization and user messaging
 */
export class DataError extends Error {
  category: ErrorCategory;
  originalError?: Error;
  canRetry: boolean;
  hasPartialData: boolean;

  constructor(
    message: string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    options?: { originalError?: Error; canRetry?: boolean; hasPartialData?: boolean }
  ) {
    super(message);
    this.name = 'DataError';
    this.category = category;
    this.originalError = options?.originalError;
    this.canRetry = options?.canRetry ?? true;
    this.hasPartialData = options?.hasPartialData ?? false;
  }

  /**
   * Get a user-friendly error message based on the error category
   */
  getUserMessage(): string {
    switch (this.category) {
      case ErrorCategory.SERVICE_UNAVAILABLE:
        return 'Access control service is not available. Please try reloading the contract.';
      case ErrorCategory.INDEXER_UNAVAILABLE:
        return 'The data indexer is temporarily unavailable. Some information may be incomplete.';
      case ErrorCategory.NETWORK_ERROR:
        return 'Network error occurred. Please check your connection and try again.';
      case ErrorCategory.CONTRACT_CALL_FAILED:
        return 'Unable to retrieve data from this contract. The contract may have been updated.';
      default:
        return this.message || 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Get display metadata for UI rendering
   */
  getMeta(): ErrorMeta {
    return {
      category: this.category,
      title: this.getTitle(),
      description: this.getUserMessage(),
      canRetry: this.canRetry,
      hasPartialData: this.hasPartialData,
    };
  }

  private getTitle(): string {
    switch (this.category) {
      case ErrorCategory.SERVICE_UNAVAILABLE:
        return 'Service Unavailable';
      case ErrorCategory.INDEXER_UNAVAILABLE:
        return 'Data Service Unavailable';
      case ErrorCategory.NETWORK_ERROR:
        return 'Network Error';
      case ErrorCategory.CONTRACT_CALL_FAILED:
        return 'Contract Data Unavailable';
      default:
        return 'Something Went Wrong';
    }
  }
}

/**
 * Categorizes an error based on message patterns
 */
export function categorizeError(error: Error): ErrorCategory {
  if (error instanceof DataError) {
    return error.category;
  }

  const message = error.message.toLowerCase();

  if (message.includes('service not available') || message.includes('access control service')) {
    return ErrorCategory.SERVICE_UNAVAILABLE;
  }

  if (
    message.includes('indexer') ||
    message.includes('rpc') ||
    message.includes('service unavailable')
  ) {
    return ErrorCategory.INDEXER_UNAVAILABLE;
  }

  if (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    message.includes('offline') ||
    error.name === 'NetworkError'
  ) {
    return ErrorCategory.NETWORK_ERROR;
  }

  if (
    message.includes('revert') ||
    message.includes('execution failed') ||
    message.includes('call failed') ||
    message.includes('contract error') ||
    message.includes('execution reverted') ||
    message.includes('unable to fetch')
  ) {
    return ErrorCategory.CONTRACT_CALL_FAILED;
  }

  return ErrorCategory.UNKNOWN;
}

/**
 * Gets display metadata for any error
 */
export function getErrorMeta(error: Error): ErrorMeta {
  if (error instanceof DataError) {
    return error.getMeta();
  }

  const category = categorizeError(error);
  const hasPartialData =
    category === ErrorCategory.INDEXER_UNAVAILABLE ||
    category === ErrorCategory.CONTRACT_CALL_FAILED;
  const tempError = new DataError(error.message, category, {
    originalError: error,
    hasPartialData,
  });

  return tempError.getMeta();
}

/**
 * Wraps an unknown error as a DataError with context
 */
export function wrapError(error: unknown, context: string): DataError {
  if (error instanceof DataError) {
    return error;
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  const originalError = error instanceof Error ? error : undefined;
  const category = originalError ? categorizeError(originalError) : ErrorCategory.UNKNOWN;

  const hasPartialData =
    category === ErrorCategory.INDEXER_UNAVAILABLE ||
    category === ErrorCategory.CONTRACT_CALL_FAILED;

  return new DataError(`Unable to fetch ${context}: ${errorMessage}`, category, {
    originalError,
    canRetry: category !== ErrorCategory.SERVICE_UNAVAILABLE,
    hasPartialData,
  });
}
