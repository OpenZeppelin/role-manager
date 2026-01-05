/**
 * Contract-specific types for the Add Contract Record feature
 * Feature: 004-add-contract-record
 *
 * These types are used by the form, hooks, and components for managing contract records.
 */

import type { ContractAdapter, NetworkConfig } from '@openzeppelin/ui-types';

import type { RecentContractRecord } from './storage';

// =============================================================================
// Domain Types (re-exported for convenience)
// =============================================================================

/**
 * Contract record from storage
 * Re-exported from storage.ts to provide a semantic alias for component interfaces
 */
export type ContractRecord = RecentContractRecord;

// =============================================================================
// Form Data Types
// =============================================================================

/**
 * Form data for adding a new contract
 */
export interface AddContractFormData {
  /** User-defined name for the contract (1-64 chars) */
  name: string;
  /** Contract address (format depends on network) */
  address: string;
  /** Selected network ID */
  networkId: string;
  /** Adapter-specific artifacts (contractAddress, contractDefinition, etc.) */
  adapterArtifacts?: Record<string, unknown>;
}

// =============================================================================
// Component Props Interfaces
// =============================================================================

/**
 * Props for the AddContractDialog component
 */
export interface AddContractDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when a contract is successfully added, receives the record ID */
  onContractAdded?: (contractId: string) => void;
}

/**
 * Props for the AddContractForm component
 */
export interface AddContractFormProps {
  /** Callback when form is submitted with valid data and optional network */
  onSubmit: (data: AddContractFormData, network?: NetworkConfig) => Promise<void> | void;
  /** Callback when form is cancelled */
  onCancel: () => void;
  /** Whether form submission is in progress */
  isSubmitting?: boolean;
}

/**
 * Props for the ContractSelector component (renamed from AccountSelector)
 */
export interface ContractSelectorProps {
  /** List of contract records to display */
  contracts: ContractRecord[];
  /** Currently selected contract, or null if none */
  selectedContract: ContractRecord | null;
  /** Callback when a contract is selected */
  onSelectContract: (contract: ContractRecord) => void;
  /** Callback when "Add Contract" is clicked */
  onAddContract: () => void;
  /** Callback when a contract should be removed */
  onRemoveContract?: (contract: ContractRecord) => void;
}

// =============================================================================
// Hook Return Types
// =============================================================================

/**
 * Return type for useContractForm hook
 */
export interface UseContractFormReturn {
  /** Form control from react-hook-form */
  control: unknown; // Control<AddContractFormData>
  /** Submit handler */
  handleSubmit: (
    onValid: (data: AddContractFormData) => void
  ) => (e?: React.BaseSyntheticEvent) => Promise<void>;
  /** Form errors */
  errors: {
    name?: { message?: string };
    address?: { message?: string };
    networkId?: { message?: string };
  };
  /** Whether form is valid */
  isValid: boolean;
  /** Currently selected network config */
  selectedNetwork: NetworkConfig | null;
  /** Set the selected network */
  setSelectedNetwork: (network: NetworkConfig | null) => void;
  /** Current adapter for the selected network */
  adapter: ContractAdapter | null;
  /** Whether adapter is loading */
  isAdapterLoading: boolean;
  /** Address placeholder text based on selected network */
  addressPlaceholder: string;
  /** Reset form to initial state */
  reset: () => void;
}

/**
 * Return type for useNetworkAdapter hook
 */
export interface UseNetworkAdapterReturn {
  /** The loaded adapter, or null if not loaded */
  adapter: ContractAdapter | null;
  /** Whether the adapter is currently loading */
  isLoading: boolean;
  /** Error if adapter failed to load */
  error: Error | null;
  /** Retry loading the adapter (after error) */
  retry: () => void;
}

// =============================================================================
// Error Message Types
// =============================================================================

/**
 * Standard error messages for form validation (ERR-001)
 */
export const ERROR_MESSAGES = {
  NAME_REQUIRED: 'Contract name is required',
  NAME_TOO_LONG: 'Contract name must be 64 characters or less',
  ADDRESS_REQUIRED: 'Contract address is required',
  ADDRESS_INVALID: (ecosystem: string) => `Invalid address format for ${ecosystem}`,
  NETWORK_REQUIRED: 'Please select a network',
  ADAPTER_LOAD_FAILED: 'Failed to load network adapter. Please try again.',
  SAVE_FAILED: 'Failed to save contract. Please try again.',
  DELETE_FAILED: 'Failed to delete contract. Please try again.',
  NO_NETWORKS: 'No networks available. Please enable at least one ecosystem.',
} as const;

/**
 * Placeholder messages for address field
 */
export const ADDRESS_PLACEHOLDERS = {
  NO_NETWORK: 'Select a network first',
  LOADING: 'Loading...',
  DEFAULT: (prefix: string, example: string) => `${prefix}: ${example}`,
} as const;

/**
 * Extended return type for useRecentContracts hook (with delete)
 */
export interface UseRecentContractsReturn {
  /** List of contracts for the current network */
  data: ContractRecord[];
  /** Whether data is loading */
  isLoading: boolean;
  /** Add or update a contract record */
  addOrUpdate: (input: { networkId: string; address: string; label?: string }) => Promise<string>;
  /** Get contracts for a specific network */
  getByNetwork: (networkId: string) => Promise<ContractRecord[]>;
  /** Delete a contract by ID */
  deleteContract: (id: string) => Promise<void>;
}
