/**
 * Component Interface Contracts: Add Contract Record
 * Feature: 004-add-contract-record
 * Date: 2025-12-02
 *
 * These interfaces define the API contracts for components in this feature.
 * Implementation must satisfy these interfaces.
 */

import type { ContractAdapter, NetworkConfig } from '@openzeppelin/ui-builder-types';

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
  /** Callback when form is submitted with valid data */
  onSubmit: (data: AddContractFormData) => Promise<void> | void;
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

// =============================================================================
// Domain Types (re-exported for convenience)
// =============================================================================

/**
 * Contract record from storage
 */
export interface ContractRecord {
  id: string;
  networkId: string;
  address: string;
  label?: string;
  lastAccessed: number;
  createdAt: number;
  updatedAt: number;
}
