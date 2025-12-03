/**
 * AddContractForm Component
 * Feature: 004-add-contract-record
 *
 * Form for adding a new contract record with network-specific validation.
 * Uses a two-step flow: first select ecosystem, then network.
 * Adapters are loaded lazily only when an ecosystem is selected.
 */

import { Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import type { Ecosystem, NetworkConfig } from '@openzeppelin/ui-builder-types';
import {
  AddressField,
  Button,
  Label,
  NetworkIcon,
  NetworkSelector,
  TextField,
} from '@openzeppelin/ui-builder-ui';

import {
  ECOSYSTEM_ORDER,
  getEcosystemAddressExample,
  getEcosystemDefaultFeatureConfig,
  getEcosystemName,
} from '@/core/ecosystems/registry';
import { useNetworkAdapter } from '@/hooks/useNetworkAdapter';
import { useNetworksByEcosystem } from '@/hooks/useNetworksByEcosystem';
import type { AddContractFormData, AddContractFormProps } from '@/types/contracts';
import { ERROR_MESSAGES } from '@/types/contracts';

import { CompactEcosystemSelector } from './CompactEcosystemSelector';

/**
 * Form for adding a new contract with network-specific address validation.
 *
 * Two-Step Flow (lazy adapter loading):
 * 1. Select Ecosystem (EVM, Stellar, etc.) - no adapter loaded yet
 * 2. Select Network (from ecosystem) - adapter loads here
 * 3. Enter Contract Name and Address
 *
 * This defers adapter loading until the user selects an ecosystem,
 * improving initial dialog load time.
 *
 * @param onSubmit - Callback when form is submitted with valid data
 * @param onCancel - Callback when form is cancelled
 * @param isSubmitting - Whether form submission is in progress
 */
export function AddContractForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
}: AddContractFormProps): React.ReactElement {
  // Get the first enabled ecosystem (for auto-selection)
  const firstEnabledEcosystem = useMemo(() => {
    return (
      ECOSYSTEM_ORDER.find((eco) => {
        const config = getEcosystemDefaultFeatureConfig(eco);
        return config.enabled && config.showInUI !== false;
      }) ?? null
    );
  }, []);

  // Two-step state: ecosystem selection before network (auto-select first enabled)
  const [selectedEcosystem, setSelectedEcosystem] = useState<Ecosystem | null>(
    firstEnabledEcosystem
  );

  // Lazy load networks only for the selected ecosystem
  const {
    networks,
    isLoading: isLoadingNetworks,
    error: networksError,
  } = useNetworksByEcosystem(selectedEcosystem);

  // Form state management with react-hook-form
  const { control, handleSubmit, watch, setValue, formState, reset } = useForm<AddContractFormData>(
    {
      mode: 'onChange',
      defaultValues: {
        name: '',
        address: '',
        networkId: '',
      },
    }
  );

  // Watch networkId to manage network selection state
  const networkId = watch('networkId');
  const selectedNetwork = networks.find((n) => n.id === networkId) ?? null;

  // Load adapter for selected network (used for address validation)
  const {
    adapter,
    isLoading: isAdapterLoading,
    error: adapterError,
  } = useNetworkAdapter(selectedNetwork);

  // Handle ecosystem selection
  const handleEcosystemSelect = (ecosystem: Ecosystem) => {
    setSelectedEcosystem(ecosystem);
    // Reset form when ecosystem changes
    reset({ name: '', address: '', networkId: '' });
  };

  // Handle network selection
  const handleNetworkSelect = (network: NetworkConfig | null) => {
    setValue('networkId', network?.id ?? '', { shouldValidate: true });
    // Clear address when network changes to force re-validation
    setValue('address', '', { shouldValidate: false });
  };

  // Handle form submission
  const onFormSubmit = handleSubmit((data: AddContractFormData) => {
    onSubmit(data);
  });

  // Determine if form is valid for submission
  const isFormValid = formState.isValid && !!selectedNetwork && !isAdapterLoading && !adapterError;

  // Get address placeholder based on ecosystem
  const addressPlaceholder = selectedNetwork
    ? getEcosystemAddressExample(selectedNetwork.ecosystem) ||
      `Enter ${selectedNetwork.ecosystem} address`
    : 'Select a network first';

  return (
    <form onSubmit={onFormSubmit} className="flex flex-col gap-4">
      {/* Step 1: Ecosystem Selector */}
      <div className="flex flex-col gap-2">
        <Label id="blockchain-label">Blockchain</Label>
        <CompactEcosystemSelector
          selectedEcosystem={selectedEcosystem}
          onSelectEcosystem={handleEcosystemSelect}
          disabled={isSubmitting}
          aria-labelledby="blockchain-label"
        />
      </div>

      {/* Step 2: Network Selector (shown after ecosystem is selected) */}
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

      {/* Step 3: Contract Details (shown after network is selected) */}
      {selectedNetwork && (
        <>
          {/* Contract Name Field */}
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

          {/* Contract Address Field */}
          <div className="relative">
            <AddressField
              id="contract-address"
              name="address"
              label="Contract Address"
              placeholder={addressPlaceholder}
              control={control}
              adapter={adapter ?? undefined}
              validation={{
                required: true,
              }}
              readOnly={isAdapterLoading}
            />
            {/* Loading spinner overlay */}
            {isAdapterLoading && (
              <div className="absolute right-3 top-[38px]">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
            {/* Adapter load error with retry */}
            {adapterError && (
              <p className="mt-1 text-sm text-destructive" role="alert" aria-live="polite">
                {ERROR_MESSAGES.ADAPTER_LOAD_FAILED}{' '}
                <button
                  type="button"
                  onClick={() => {
                    // Re-select network to retry adapter load
                    if (selectedNetwork) {
                      handleNetworkSelect(null);
                      setTimeout(() => handleNetworkSelect(selectedNetwork), 0);
                    }
                  }}
                  className="text-primary underline hover:text-primary/80"
                >
                  Retry
                </button>
              </p>
            )}
          </div>
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
