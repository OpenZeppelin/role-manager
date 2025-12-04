/**
 * AddContractDialog Component
 * Features: 004-add-contract-record, 005-contract-schema-storage
 *
 * Modal dialog for adding a new contract record.
 * Loads and validates schema BEFORE saving - only saves valid contracts.
 */

import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { NetworkConfig } from '@openzeppelin/ui-builder-types';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@openzeppelin/ui-builder-ui';

import { recentContractsStorage } from '@/core/storage/RecentContractsStorage';
import { useContractSchemaLoader, useNetworkAdapter } from '@/hooks';
import type { AddContractDialogProps, AddContractFormData } from '@/types/contracts';
import type { SchemaLoadResult } from '@/types/schema';

import { AddContractForm } from './AddContractForm';

/**
 * Dialog steps
 */
type DialogStep = 'form' | 'loading-schema' | 'error' | 'success';

/**
 * Extended props to receive network info from the form
 */
interface ExtendedAddContractFormData extends AddContractFormData {
  network?: NetworkConfig;
}

/**
 * Dialog for adding a new contract record with schema validation.
 *
 * Flow:
 * 1. User fills out form (ecosystem, network, name, contract definition)
 * 2. User clicks "Add" -> attempts to load schema via RPC
 * 3. If schema loads successfully -> saves contract with schema -> shows success
 * 4. If schema fails -> shows error with retry option (contract NOT saved)
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

  // Track if we've started loading to prevent double-loading
  const loadStartedRef = useRef(false);

  // Network adapter for schema loading (set after form submission)
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkConfig | null>(null);
  const { adapter, isLoading: isAdapterLoading } = useNetworkAdapter(selectedNetwork);

  // Schema loader hook
  const schemaLoader = useContractSchemaLoader(adapter);

  /**
   * Reset all dialog state to initial values
   */
  const resetDialogState = useCallback(() => {
    setStep('form');
    setIsSubmitting(false);
    setSavedContractId(null);
    setPendingFormData(null);
    setLoadError(null);
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
   * Save contract with schema to storage
   */
  const saveContractWithSchema = useCallback(
    async (result: SchemaLoadResult): Promise<string> => {
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
      });

      return contractId;
    },
    [pendingFormData]
  );

  /**
   * Execute the full load and save flow
   */
  const executeLoadAndSave = useCallback(async () => {
    if (loadStartedRef.current) return;
    loadStartedRef.current = true;

    try {
      const result = await loadSchema();

      if (!result) {
        // Don't read schemaLoader.error here - it would be stale from closure.
        // The error UI reads schemaLoader.error directly as a fallback.
        setLoadError('Failed to load contract schema');
        setStep('error');
        setIsSubmitting(false);
        return;
      }

      // Schema loaded successfully - now save to storage
      const contractId = await saveContractWithSchema(result);
      setSavedContractId(contractId);
      setStep('success');
      toast.success('Contract added successfully');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[AddContractDialog] Failed to load/save contract:', error);
      setLoadError(error instanceof Error ? error.message : 'An unexpected error occurred');
      setStep('error');
    } finally {
      setIsSubmitting(false);
    }
  }, [loadSchema, saveContractWithSchema]);

  // Trigger schema loading when adapter becomes available
  useEffect(() => {
    if (step === 'loading-schema' && adapter && !isAdapterLoading && !loadStartedRef.current) {
      executeLoadAndSave();
    }
  }, [step, adapter, isAdapterLoading, executeLoadAndSave]);

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

  // Get dialog title based on step
  const getDialogTitle = (): string => {
    switch (step) {
      case 'form':
        return 'Add Contract';
      case 'loading-schema':
        return 'Loading Contract...';
      case 'error':
        return 'Failed to Load Contract';
      case 'success':
        return 'Contract Added';
      default:
        return 'Add Contract';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
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
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium">Loading contract schema...</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Fetching contract information from the network
              </p>
            </div>
          </div>
        )}

        {/* Error Step */}
        {step === 'error' && (
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div className="flex-1">
                <p className="font-medium text-destructive">Could not load contract</p>
                <p className="mt-1 text-sm text-destructive/80">
                  {loadError || schemaLoader.error || 'The contract schema could not be loaded.'}
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Please verify the contract address is correct and the contract is deployed on the
              selected network.
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleRetry}>Try Again</Button>
            </div>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && pendingFormData && (
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium">Contract added successfully!</p>
                <p className="text-sm text-muted-foreground">{pendingFormData.name}</p>
              </div>
            </div>

            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="text-xs text-muted-foreground">Contract Address</div>
              <div className="mt-1 truncate font-mono text-sm">{pendingFormData.address}</div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleComplete}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
