/**
 * AddContractForm Component
 * Features: 004-add-contract-record, 005-contract-schema-storage
 *
 * Form for adding a new contract record with network-specific validation.
 * Uses a two-step flow: first select ecosystem, then network.
 * Contract definition fields (address, ABI, etc.) are dynamically rendered
 * based on the adapter's getContractDefinitionInputs().
 */

import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { Control } from 'react-hook-form';

import {
  Button,
  Label,
  NetworkIcon,
  NetworkSelector,
  TextField,
} from '@openzeppelin/ui-components';
import { DynamicFormField } from '@openzeppelin/ui-renderer';
import type { Ecosystem, FormFieldType, FormValues, NetworkConfig } from '@openzeppelin/ui-types';

import {
  ECOSYSTEM_ORDER,
  getEcosystemDefaultFeatureConfig,
  getEcosystemName,
} from '@/core/ecosystems/registry';
import { recentContractsStorage } from '@/core/storage/RecentContractsStorage';
import { useNetworkAdapter, useNetworksByEcosystem } from '@/hooks';
import type { AddContractFormProps } from '@/types/contracts';

import { CompactEcosystemSelector } from './CompactEcosystemSelector';

/**
 * Extended form data that includes adapter-specific fields
 */
interface ExtendedFormData extends FormValues {
  name: string;
  networkId: string;
}

/**
 * Form for adding a new contract with adapter-driven definition fields.
 *
 * Three-Section Layout:
 * 1. Ecosystem & Network Selection (hardcoded - Role Manager specific)
 * 2. Contract Name (hardcoded - Role Manager specific label)
 * 3. Contract Definition Fields (dynamic from adapter via DynamicFormField)
 *
 * This approach keeps Role Manager concerns separate from adapter concerns:
 * - Ecosystem/Network selection is app-specific
 * - Contract name is app-specific (used as label in storage)
 * - Address, ABI, and other contract definition fields are adapter-specific
 *
 * @param onSubmit - Callback when form is submitted with valid data
 * @param onCancel - Callback when form is cancelled
 * @param isSubmitting - Whether form submission is in progress
 */
export function AddContractForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  defaultNetwork,
}: AddContractFormProps): React.ReactElement {
  // Get the first enabled ecosystem (for auto-selection when no default)
  const firstEnabledEcosystem = useMemo(() => {
    return (
      ECOSYSTEM_ORDER.find((eco) => {
        const config = getEcosystemDefaultFeatureConfig(eco);
        return config.enabled && config.showInUI !== false;
      }) ?? null
    );
  }, []);

  // Determine initial ecosystem: use default network's ecosystem or fall back to first enabled
  const initialEcosystem = useMemo(() => {
    if (defaultNetwork?.ecosystem) {
      return defaultNetwork.ecosystem;
    }
    return firstEnabledEcosystem;
  }, [defaultNetwork, firstEnabledEcosystem]);

  // Two-step state: ecosystem selection before network
  const [selectedEcosystem, setSelectedEcosystem] = useState<Ecosystem | null>(initialEcosystem);

  // Lazy load networks only for the selected ecosystem
  const {
    networks,
    isLoading: isLoadingNetworks,
    error: networksError,
  } = useNetworksByEcosystem(selectedEcosystem);

  // Form state management with react-hook-form
  const { control, handleSubmit, watch, setValue, formState, reset, setError, clearErrors } =
    useForm<ExtendedFormData>({
      mode: 'onChange',
      defaultValues: {
        name: '',
        networkId: defaultNetwork?.id ?? '',
      },
    });

  // Track if we've applied the default network (to avoid re-applying on subsequent renders)
  const defaultNetworkAppliedRef = useRef(false);

  // Preselect network when networks load and a default is provided
  useEffect(() => {
    // Only apply default once, when networks first load
    if (defaultNetworkAppliedRef.current || !defaultNetwork || isLoadingNetworks) {
      return;
    }

    // Check if the default network exists in the loaded networks
    const networkExists = networks.some((n) => n.id === defaultNetwork.id);
    if (networkExists) {
      setValue('networkId', defaultNetwork.id, { shouldValidate: true });
      defaultNetworkAppliedRef.current = true;
    }
  }, [defaultNetwork, networks, isLoadingNetworks, setValue]);

  // Watch networkId to manage network selection state
  const networkId = watch('networkId');
  const selectedNetwork = networks.find((n) => n.id === networkId) ?? null;

  // Watch contractAddress for duplicate validation
  const contractAddress = watch('contractAddress') as string | undefined;

  // Load adapter for selected network (used for address validation and dynamic fields)
  const {
    adapter,
    isLoading: isAdapterLoading,
    error: adapterError,
  } = useNetworkAdapter(selectedNetwork);

  // Duplicate contract validation
  const [isDuplicateChecking, setIsDuplicateChecking] = useState(false);
  const duplicateCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for duplicate contracts when address or network changes
  useEffect(() => {
    // Always clear any pending timeout when dependencies change
    // This must happen before any early returns to ensure cleanup
    if (duplicateCheckTimeoutRef.current) {
      clearTimeout(duplicateCheckTimeoutRef.current);
      duplicateCheckTimeoutRef.current = null;
    }

    // Clear any existing error when inputs change
    const clearDuplicateError = () => {
      if (formState.errors.contractAddress?.type === 'duplicate') {
        clearErrors('contractAddress');
      }
    };

    // If no address or network, clear error and return
    if (!contractAddress || !networkId) {
      clearDuplicateError();
      return;
    }

    duplicateCheckTimeoutRef.current = setTimeout(async () => {
      setIsDuplicateChecking(true);
      try {
        const existing = await recentContractsStorage.getByAddressAndNetwork(
          contractAddress,
          networkId
        );

        if (existing) {
          setError('contractAddress', {
            type: 'duplicate',
            message: `This contract is already added${existing.label ? ` as "${existing.label}"` : ''}`,
          });
        } else {
          clearDuplicateError();
        }
      } catch {
        // Silently ignore storage errors during validation
      } finally {
        setIsDuplicateChecking(false);
      }
    }, 300); // 300ms debounce

    // Cleanup on unmount
    return () => {
      if (duplicateCheckTimeoutRef.current) {
        clearTimeout(duplicateCheckTimeoutRef.current);
      }
    };
  }, [contractAddress, networkId, setError, clearErrors, formState.errors.contractAddress]);

  // Get contract definition inputs from adapter
  const contractDefinitionInputs = useMemo<FormFieldType[]>(() => {
    if (!adapter || typeof adapter.getContractDefinitionInputs !== 'function') {
      return [];
    }
    return adapter.getContractDefinitionInputs();
  }, [adapter]);

  // Handle ecosystem selection
  const handleEcosystemSelect = (ecosystem: Ecosystem) => {
    setSelectedEcosystem(ecosystem);
    // Reset form when ecosystem changes
    reset({ name: '', networkId: '' });
  };

  // Handle network selection
  const handleNetworkSelect = (network: NetworkConfig | null) => {
    setValue('networkId', network?.id ?? '', { shouldValidate: true });
  };

  // Handle form submission - pass network and adapter artifacts for schema loading
  const onFormSubmit = handleSubmit((data: ExtendedFormData) => {
    // Extract adapter-specific fields (everything except name and networkId)
    const { name, networkId, ...adapterFields } = data;

    // Build the form data expected by the dialog
    onSubmit(
      {
        name,
        networkId,
        // Get address from the adapter's contractAddress field
        address: (adapterFields.contractAddress as string) || '',
        // Pass all adapter fields for schema loading (contractAddress, contractDefinition, etc.)
        adapterArtifacts: adapterFields,
      },
      selectedNetwork ?? undefined
    );
  });

  // Determine if form is valid for submission
  // Check that required adapter fields are filled
  const hasRequiredAdapterFields = useMemo(() => {
    if (!adapter || contractDefinitionInputs.length === 0) {
      return false;
    }
    // For now, just check if we have the adapter ready
    // The actual validation is handled by react-hook-form
    return true;
  }, [adapter, contractDefinitionInputs]);

  // Check if there's a duplicate error
  const hasDuplicateError = formState.errors.contractAddress?.type === 'duplicate';

  const isFormValid =
    formState.isValid &&
    !!selectedNetwork &&
    !isAdapterLoading &&
    !adapterError &&
    hasRequiredAdapterFields &&
    !hasDuplicateError &&
    !isDuplicateChecking;

  return (
    <form onSubmit={onFormSubmit} className="flex flex-col gap-4">
      {/* Section 1: Ecosystem Selector */}
      <div className="flex flex-col gap-2">
        <Label id="blockchain-label">Blockchain</Label>
        <CompactEcosystemSelector
          selectedEcosystem={selectedEcosystem}
          onSelectEcosystem={handleEcosystemSelect}
          disabled={isSubmitting}
          aria-labelledby="blockchain-label"
        />
      </div>

      {/* Section 2: Network Selector (shown after ecosystem is selected) */}
      {selectedEcosystem && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="network-selector">Network</Label>
          {isLoadingNetworks ? (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading {getEcosystemName(selectedEcosystem)} networks...</span>
            </div>
          ) : networksError ? (
            <div
              className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
              aria-live="polite"
            >
              Failed to load networks.{' '}
              <button
                type="button"
                onClick={() => {
                  // Re-trigger by cycling ecosystem
                  const eco = selectedEcosystem;
                  setSelectedEcosystem(null);
                  setTimeout(() => setSelectedEcosystem(eco), 0);
                }}
                className="underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          ) : networks.length === 0 ? (
            <div
              className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              No networks available for {getEcosystemName(selectedEcosystem)}.
            </div>
          ) : (
            <NetworkSelector
              networks={networks}
              selectedNetwork={selectedNetwork}
              onSelectNetwork={handleNetworkSelect}
              getNetworkLabel={(n: NetworkConfig) => n.name}
              getNetworkId={(n: NetworkConfig) => n.id}
              getNetworkIcon={(n: NetworkConfig) => <NetworkIcon network={n} />}
              getNetworkType={(n: NetworkConfig) => n.type}
              groupByEcosystem={true}
              getEcosystem={(n: NetworkConfig) => getEcosystemName(n.ecosystem)}
              filterNetwork={(n: NetworkConfig, query: string) => {
                const q = query.toLowerCase();
                return n.name.toLowerCase().includes(q) || n.type.toLowerCase().includes(q);
              }}
              placeholder="Select a network..."
            />
          )}
        </div>
      )}

      {/* Section 3: Contract Details (shown after network is selected) */}
      {selectedNetwork && (
        <>
          {/* Contract Name Field (Role Manager specific - used as label) */}
          <TextField
            id="contract-name"
            name="name"
            label="Contract Name"
            placeholder="My Contract"
            control={control}
            validation={{
              required: true,
              maxLength: 64,
            }}
          />

          {/* Adapter Loading State */}
          {isAdapterLoading && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading adapter...</span>
            </div>
          )}

          {/* Adapter Error */}
          {adapterError && (
            <div
              className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
              aria-live="polite"
            >
              Failed to load adapter.{' '}
              <button
                type="button"
                onClick={() => {
                  // Re-select network to retry adapter load
                  if (selectedNetwork) {
                    handleNetworkSelect(null);
                    setTimeout(() => handleNetworkSelect(selectedNetwork), 0);
                  }
                }}
                className="underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Dynamic Contract Definition Fields from Adapter */}
          {adapter && !isAdapterLoading && !adapterError && (
            <div className="space-y-4">
              {contractDefinitionInputs.map((field) => (
                <DynamicFormField
                  key={field.id}
                  field={field}
                  control={control as unknown as Control<FormValues>}
                  adapter={adapter}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Form Actions */}
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={!isFormValid || isSubmitting}>
          Add
        </Button>
      </div>
    </form>
  );
}
