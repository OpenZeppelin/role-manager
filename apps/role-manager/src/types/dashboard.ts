/**
 * Dashboard-specific type definitions
 * Feature: 007-dashboard-real-data
 *
 * These types define the data structures used by the Dashboard page
 * and its related hooks.
 */

import type {
  AccessControlCapabilities,
  ContractAdapter,
  NetworkConfig,
} from '@openzeppelin/ui-builder-types';

import type { ContractRecord } from './contracts';

// =============================================================================
// Contract Context
// =============================================================================

/**
 * Shared state provided by ContractContext to the entire application.
 * Enables components to access the currently selected contract without prop drilling.
 */
export interface ContractContextValue {
  /** Currently selected contract from storage */
  selectedContract: ContractRecord | null;
  /** Update the selected contract */
  setSelectedContract: (contract: ContractRecord | null) => void;

  /** Currently selected network */
  selectedNetwork: NetworkConfig | null;
  /** Update the selected network */
  setSelectedNetwork: (network: NetworkConfig | null) => void;

  /** Loaded adapter for the selected network */
  adapter: ContractAdapter | null;
  /** Whether the adapter is currently loading */
  isAdapterLoading: boolean;

  /** List of contracts for the current network */
  contracts: ContractRecord[];
  /** Whether contracts are currently loading */
  isContractsLoading: boolean;

  /**
   * Whether the selected contract has been registered with the access control service.
   * Data hooks should wait for this to be true before fetching data.
   * This is required for adapters (like Stellar) that need contract context registered first.
   */
  isContractRegistered: boolean;
}

// =============================================================================
// Dashboard Data
// =============================================================================

/**
 * Aggregated view model for Dashboard display.
 * Contains all data needed to render the Dashboard page.
 */
export interface DashboardData {
  /** Contract information derived from selectedContract + network */
  contractInfo: {
    label: string;
    address: string;
    networkId: string;
    networkName: string;
    explorerUrl: string | null;
    /** Access control capabilities - used for FeatureBadge display */
    capabilities: AccessControlCapabilities | null;
  } | null;

  /** Statistics computed from roles and ownership data */
  statistics: {
    /** Number of roles (null when loading or N/A) */
    rolesCount: number | null;
    /** Number of unique accounts across all roles (null when loading) */
    uniqueAccountsCount: number | null;
    /** Whether contract supports AccessControl */
    hasAccessControl: boolean;
    /** Whether contract supports Ownable */
    hasOwnable: boolean;
  };

  /** Current data loading/error state */
  state: {
    isLoading: boolean;
    isRefreshing: boolean;
    hasError: boolean;
    errorMessage: string | null;
    canRetry: boolean;
  };
}

// =============================================================================
// Hook Return Types
// =============================================================================

/**
 * Return type for useDashboardData hook.
 * Provides all data and actions needed by the Dashboard page.
 */
export interface UseDashboardDataReturn {
  /** Contract info (null if no contract selected) */
  contractInfo: DashboardData['contractInfo'];

  /** Number of roles (null when loading or N/A) */
  rolesCount: number | null;
  /** Number of unique accounts across all roles (null when loading) */
  uniqueAccountsCount: number | null;
  /** Whether contract supports AccessControl */
  hasAccessControl: boolean;
  /** Whether contract supports Ownable */
  hasOwnable: boolean;

  /** Whether initial data is loading */
  isLoading: boolean;
  /** Whether data is being refreshed (manual refresh) */
  isRefreshing: boolean;
  /** Whether there was an error loading data */
  hasError: boolean;
  /** User-friendly error message */
  errorMessage: string | null;
  /** Whether the error can be recovered by retrying */
  canRetry: boolean;

  /** Refetch roles and ownership data */
  refetch: () => Promise<void>;

  /** Export current access control state as JSON */
  exportSnapshot: () => void;
  /** Whether export is in progress */
  isExporting: boolean;
  /** Error from export, if any */
  exportError: string | null;
}

/**
 * Return type for useSelectedContract hook.
 * Convenience wrapper for ContractContext.
 */
export interface UseSelectedContractReturn {
  /** Currently selected contract */
  selectedContract: ContractRecord | null;
  /** Update the selected contract */
  setSelectedContract: (contract: ContractRecord | null) => void;
  /** Currently selected network */
  selectedNetwork: NetworkConfig | null;
  /** Update the selected network */
  setSelectedNetwork: (network: NetworkConfig | null) => void;
  /** Loaded adapter for the selected network */
  adapter: ContractAdapter | null;
  /** Whether the adapter is loading */
  isAdapterLoading: boolean;
  /** List of contracts for the current network */
  contracts: ContractRecord[];
  /** Whether contracts are loading */
  isContractsLoading: boolean;
  /** Whether the contract is registered with the access control service */
  isContractRegistered: boolean;
}
