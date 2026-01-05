/**
 * AddContractDialog Component
 * Features: 004-add-contract-record, 005-contract-schema-storage, 006-access-control-service
 *
 * Modal dialog for adding a new contract record.
 * Loads schema and validates Access Control capabilities BEFORE saving.
 * Only saves contracts that support AccessControl or Ownable interfaces.
 */

import { toast } from 'sonner';
import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  AccessControlCapabilities,
  AccessControlService,
  ContractSchema,
  NetworkConfig,
} from '@openzeppelin/ui-types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@openzeppelin/ui-components';
import { logger } from '@openzeppelin/ui-utils';

import { recentContractsStorage } from '@/core/storage/RecentContractsStorage';
import {
  isContractSupported,
  useAccessControlService,
  useContractSchemaLoader,
  useNetworkAdapter,
} from '@/hooks';
import type { AddContractDialogProps, AddContractFormData } from '@/types/contracts';
import type { SchemaLoadResult } from '@/types/schema';

import { AddContractForm } from './AddContractForm';
import { ContractUnsupportedState } from './ContractUnsupportedState';
import { DialogErrorState } from './DialogErrorState';
import { DialogLoadingState } from './DialogLoadingState';
import { DialogSuccessState } from './DialogSuccessState';

/**
 * Dialog steps
 */
type DialogStep = 'form' | 'loading-schema' | 'validating' | 'unsupported' | 'error' | 'success';

/**
 * Extended props to receive network info from the form
 */
interface ExtendedAddContractFormData extends AddContractFormData {
  network?: NetworkConfig;
}

/**
 * Map of step to dialog title
 */
const DIALOG_TITLES: Record<DialogStep, string> = {
  form: 'Add Contract',
  'loading-schema': 'Loading Contract...',
  validating: 'Validating Contract...',
  unsupported: 'Contract Not Supported',
  error: 'Failed to Load Contract',
  success: 'Contract Added',
};

/**
 * Dialog for adding a new contract record with schema validation.
 *
 * Flow:
 * 1. User fills out form (ecosystem, network, name, contract definition)
 * 2. User clicks "Add" -> attempts to load schema via RPC
 * 3. Detect access control capabilities
 * 4. Validate contract is supported (has AccessControl OR Ownable)
 * 5. If valid -> save contract with schema -> show success
 * 6. If unsupported -> show unsupported error (contract NOT saved)
 * 7. If schema fails -> show error with retry option (contract NOT saved)
 *
 * @param open - Whether the dialog is open
 * @param onOpenChange - Callback when dialog open state changes
 * @param onContractAdded - Callback when a contract is successfully added
 */
export function AddContractDialog({
  open,
  onOpenChange,
  onContractAdded,
}: AddContractDialogProps): React.ReactElement {
  const [step, setStep] = useState<DialogStep>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedContractId, setSavedContractId] = useState<string | null>(null);
  const [pendingFormData, setPendingFormData] = useState<ExtendedAddContractFormData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detectedCapabilities, setDetectedCapabilities] =
    useState<AccessControlCapabilities | null>(null);

  // Track if we've started loading to prevent double-loading
  const loadStartedRef = useRef(false);

  // Network adapter for schema loading (set after form submission)
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkConfig | null>(null);
  const { adapter, isLoading: isAdapterLoading } = useNetworkAdapter(selectedNetwork);

  // Schema loader hook
  const schemaLoader = useContractSchemaLoader(adapter);

  // Access control service for capability detection
  const { service: accessControlService, isReady: isAccessControlReady } =
    useAccessControlService(adapter);

  /**
   * Reset all dialog state to initial values
   */
  const resetDialogState = useCallback(() => {
    setStep('form');
    setIsSubmitting(false);
    setSavedContractId(null);
    setPendingFormData(null);
    setLoadError(null);
    setDetectedCapabilities(null);
    setSelectedNetwork(null);
    loadStartedRef.current = false;
    schemaLoader.reset();
  }, [schemaLoader]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      // Small delay to allow close animation
      const timer = setTimeout(resetDialogState, 150);
      return () => clearTimeout(timer);
    }
  }, [open, resetDialogState]);

  /**
   * Handle form submission - starts the schema loading process
   */
  const handleSubmit = useCallback(async (data: AddContractFormData, network?: NetworkConfig) => {
    if (!network) {
      toast.error('Please select a network');
      return;
    }

    setIsSubmitting(true);
    setPendingFormData({ ...data, network });
    setLoadError(null);
    setSelectedNetwork(network);
    setStep('loading-schema');
    loadStartedRef.current = false;
  }, []);

  /**
   * Actually load the schema once adapter is ready
   */
  const loadSchema = useCallback(async (): Promise<SchemaLoadResult | null> => {
    if (!adapter || !pendingFormData) {
      return null;
    }

    const artifacts = pendingFormData.adapterArtifacts ?? {
      contractAddress: pendingFormData.address,
    };

    return schemaLoader.load(pendingFormData.address, artifacts);
  }, [adapter, pendingFormData, schemaLoader]);

  /**
   * Save contract with schema and capabilities to storage
   */
  const saveContractWithSchema = useCallback(
    async (result: SchemaLoadResult, capabilities: AccessControlCapabilities): Promise<string> => {
      if (!pendingFormData?.network) {
        throw new Error('Missing form data');
      }

      const contractId = await recentContractsStorage.addOrUpdateWithSchema({
        address: pendingFormData.address,
        networkId: pendingFormData.networkId,
        ecosystem: pendingFormData.network.ecosystem,
        schema: result.schema,
        source: 'fetched',
        label: pendingFormData.name,
        schemaMetadata: {
          fetchTimestamp: Date.now(),
          contractName: result.schema.name,
        },
        capabilities,
      });

      return contractId;
    },
    [pendingFormData]
  );

  /**
   * Execute the full load, validate, and save flow
   */
  const executeLoadAndSave = useCallback(async () => {
    if (loadStartedRef.current) return;
    loadStartedRef.current = true;

    try {
      // Step 1: Load schema
      const result = await loadSchema();

      if (!result) {
        setLoadError('Failed to load contract schema');
        setStep('error');
        setIsSubmitting(false);
        return;
      }

      // Step 2: Detect access control capabilities
      setStep('validating');

      if (!accessControlService || !pendingFormData) {
        setLoadError(
          'Access control validation is not available for this network. ' +
            'Please ensure the adapter supports access control features.'
        );
        setStep('error');
        setIsSubmitting(false);
        return;
      }

      let capabilities: AccessControlCapabilities;
      try {
        // Some adapters (e.g., Stellar) require contract registration before capability detection
        const serviceWithRegister = accessControlService as AccessControlService & {
          registerContract?: (address: string, schema: ContractSchema) => void;
        };
        if (typeof serviceWithRegister.registerContract === 'function') {
          serviceWithRegister.registerContract(pendingFormData.address, result.schema);
        }

        capabilities = await accessControlService.getCapabilities(pendingFormData.address);
        setDetectedCapabilities(capabilities);
      } catch (capabilityError) {
        logger.error('AddContractDialog', 'Capability detection failed:', capabilityError);
        setLoadError(
          capabilityError instanceof Error
            ? capabilityError.message
            : 'Failed to detect contract capabilities'
        );
        setStep('error');
        setIsSubmitting(false);
        return;
      }

      // Step 3: Validate contract is supported (FR-003, FR-009)
      if (!isContractSupported(capabilities)) {
        setStep('unsupported');
        setIsSubmitting(false);
        return;
      }

      // Step 4: Contract is valid - save with capabilities
      const contractId = await saveContractWithSchema(result, capabilities);
      setSavedContractId(contractId);
      setStep('success');
      toast.success('Contract added successfully');
    } catch (error) {
      logger.error('AddContractDialog', 'Failed to load/save contract:', error);
      setLoadError(error instanceof Error ? error.message : 'An unexpected error occurred');
      setStep('error');
    } finally {
      setIsSubmitting(false);
    }
  }, [loadSchema, saveContractWithSchema, accessControlService, pendingFormData]);

  // Trigger schema loading when adapter and access control service are ready
  useEffect(() => {
    if (
      step === 'loading-schema' &&
      adapter &&
      !isAdapterLoading &&
      isAccessControlReady &&
      !loadStartedRef.current
    ) {
      executeLoadAndSave();
    }
  }, [step, adapter, isAdapterLoading, isAccessControlReady, executeLoadAndSave]);

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    setLoadError(null);
    setStep('loading-schema');
    loadStartedRef.current = false;
    schemaLoader.reset();
  }, [schemaLoader]);

  /**
   * Handle cancel button
   */
  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  /**
   * Handle completion (success state)
   */
  const handleComplete = useCallback(() => {
    if (savedContractId) {
      onContractAdded?.(savedContractId);
    }
    onOpenChange(false);
  }, [onOpenChange, onContractAdded, savedContractId]);

  // Get explorer URL for the contract address
  const explorerUrl =
    adapter && pendingFormData ? adapter.getExplorerUrl(pendingFormData.address) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{DIALOG_TITLES[step]}</DialogTitle>
        </DialogHeader>

        {/* Form Step */}
        {step === 'form' && (
          <AddContractForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        )}

        {/* Loading Schema Step */}
        {step === 'loading-schema' && (
          <DialogLoadingState
            title="Loading contract schema..."
            description="Fetching contract information from the network"
          />
        )}

        {/* Validating Capabilities Step */}
        {step === 'validating' && (
          <DialogLoadingState
            title="Validating access control..."
            description="Checking contract capabilities"
          />
        )}

        {/* Unsupported Contract Step */}
        {step === 'unsupported' && (
          <ContractUnsupportedState
            capabilities={detectedCapabilities}
            onCancel={handleCancel}
            onTryAgain={resetDialogState}
          />
        )}

        {/* Error Step */}
        {step === 'error' && (
          <DialogErrorState
            title="Could not load contract"
            message={loadError || schemaLoader.error || 'The contract schema could not be loaded.'}
            helpText="Please verify the contract address is correct and the contract is deployed on the selected network."
            onCancel={handleCancel}
            onRetry={handleRetry}
          />
        )}

        {/* Success Step */}
        {step === 'success' && pendingFormData && (
          <DialogSuccessState
            contractName={pendingFormData.name}
            contractAddress={pendingFormData.address}
            explorerUrl={explorerUrl}
            capabilities={detectedCapabilities}
            onComplete={handleComplete}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
