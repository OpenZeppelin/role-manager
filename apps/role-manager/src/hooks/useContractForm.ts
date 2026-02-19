/**
 * Hook for managing the Add Contract form state and validation
 * Feature: 004-add-contract-record
 *
 * Provides form state management using react-hook-form with
 * network-specific address validation via the adapter pattern.
 */

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import type { NetworkConfig } from '@openzeppelin/ui-types';

import { getEcosystemMetadata } from '@/core/ecosystems/ecosystemManager';
import type { AddContractFormData, UseContractFormReturn } from '@/types/contracts';
import { ADDRESS_PLACEHOLDERS, ERROR_MESSAGES } from '@/types/contracts';

import { useNetworkAdapter } from './useNetworkAdapter';

/**
 * Hook that manages the Add Contract form state and validation.
 *
 * Features:
 * - react-hook-form integration for form state management
 * - Network-specific address validation via adapter.isValidAddress()
 * - Dynamic address placeholder based on selected ecosystem
 * - Re-validation when network changes
 *
 * @returns Form control, handlers, validation state, and adapter info
 *
 * @example
 * ```tsx
 * const {
 *   control,
 *   handleSubmit,
 *   errors,
 *   selectedNetwork,
 *   setSelectedNetwork,
 *   addressPlaceholder,
 *   isValid,
 * } = useContractForm();
 *
 * const onSubmit = async (data: AddContractFormData) => {
 *   await saveContract(data);
 * };
 *
 * return (
 *   <form onSubmit={handleSubmit(onSubmit)}>
 *     <NetworkSelector
 *       selectedNetwork={selectedNetwork}
 *       onSelectNetwork={setSelectedNetwork}
 *     />
 *     <Controller
 *       name="address"
 *       control={control}
 *       render={({ field }) => (
 *         <Input {...field} placeholder={addressPlaceholder} />
 *       )}
 *     />
 *   </form>
 * );
 * ```
 */
export function useContractForm(): UseContractFormReturn {
  // Track selected network separately from form state for adapter loading
  const [selectedNetwork, setSelectedNetworkState] = useState<NetworkConfig | null>(null);

  // Load adapter for selected network
  const {
    adapter,
    isLoading: isAdapterLoading,
    error: adapterError,
  } = useNetworkAdapter(selectedNetwork);

  // Initialize react-hook-form
  const {
    control,
    handleSubmit: rhfHandleSubmit,
    formState: { errors, isValid },
    setValue,
    trigger,
    reset: rhfReset,
    watch,
  } = useForm<AddContractFormData>({
    mode: 'onChange',
    defaultValues: {
      name: '',
      address: '',
      networkId: '',
    },
  });

  // Watch the address field for validation
  const addressValue = watch('address');

  // Custom wrapper for setSelectedNetwork that also updates form value
  const setSelectedNetwork = useCallback(
    (network: NetworkConfig | null) => {
      setSelectedNetworkState(network);
      setValue('networkId', network?.id ?? '', { shouldValidate: true });
    },
    [setValue]
  );

  // Re-validate address when network changes
  useEffect(() => {
    if (selectedNetwork && addressValue) {
      trigger('address');
    }
  }, [selectedNetwork, trigger, addressValue]);

  // Generate dynamic placeholder based on selected network
  const addressPlaceholder = (() => {
    if (!selectedNetwork) {
      return ADDRESS_PLACEHOLDERS.NO_NETWORK;
    }
    if (isAdapterLoading) {
      return ADDRESS_PLACEHOLDERS.LOADING;
    }

    const meta = getEcosystemMetadata(selectedNetwork.ecosystem);
    if (meta?.addressExample) {
      const name = meta.name;
      const shortName = name.includes('(')
        ? (name.match(/\(([^)]+)\)/)?.[1] ?? name.split(' ')[0])
        : name.split(' ')[0];
      return ADDRESS_PLACEHOLDERS.DEFAULT(shortName, meta.addressExample);
    }

    return `Enter ${selectedNetwork.ecosystem} address`;
  })();

  // Custom validation function for address field
  const validateAddress = useCallback(
    (value: string): string | true => {
      if (!value || value.trim() === '') {
        return ERROR_MESSAGES.ADDRESS_REQUIRED;
      }

      if (!selectedNetwork) {
        return ERROR_MESSAGES.NETWORK_REQUIRED;
      }

      if (!adapter) {
        // Adapter not loaded yet - allow input but note loading state
        if (isAdapterLoading) {
          return true; // Don't block during loading
        }
        if (adapterError) {
          return ERROR_MESSAGES.ADAPTER_LOAD_FAILED;
        }
        return true; // No adapter and no error - probably just selected
      }

      const trimmedValue = value.trim();
      if (!adapter.isValidAddress(trimmedValue)) {
        return ERROR_MESSAGES.ADDRESS_INVALID(
          getEcosystemMetadata(selectedNetwork.ecosystem)?.name ?? selectedNetwork.ecosystem
        );
      }

      return true;
    },
    [adapter, selectedNetwork, isAdapterLoading, adapterError]
  );

  // Custom validation function for name field
  const validateName = useCallback((value: string): string | true => {
    if (!value || value.trim() === '') {
      return ERROR_MESSAGES.NAME_REQUIRED;
    }

    if (value.trim().length > 64) {
      return ERROR_MESSAGES.NAME_TOO_LONG;
    }

    return true;
  }, []);

  // Custom validation function for networkId
  const validateNetworkId = useCallback((value: string): string | true => {
    if (!value) {
      return ERROR_MESSAGES.NETWORK_REQUIRED;
    }
    return true;
  }, []);

  // Wrap handleSubmit to include custom validation
  const handleSubmit = useCallback(
    (onValid: (data: AddContractFormData) => void) => {
      return rhfHandleSubmit(async (data) => {
        // Run custom validations
        const nameError = validateName(data.name);
        const addressError = validateAddress(data.address);
        const networkError = validateNetworkId(data.networkId);

        if (nameError !== true || addressError !== true || networkError !== true) {
          // Let react-hook-form handle displaying errors
          return;
        }

        // Trim values before submitting
        const trimmedData: AddContractFormData = {
          name: data.name.trim(),
          address: data.address.trim(),
          networkId: data.networkId,
        };

        onValid(trimmedData);
      });
    },
    [rhfHandleSubmit, validateName, validateAddress, validateNetworkId]
  );

  // Reset form to initial state
  const reset = useCallback(() => {
    rhfReset({
      name: '',
      address: '',
      networkId: '',
    });
    setSelectedNetworkState(null);
  }, [rhfReset]);

  // Build errors object with validation messages
  const formErrors = {
    name:
      errors.name ??
      (validateName(watch('name') ?? '') !== true
        ? { message: validateName(watch('name') ?? '') as string }
        : undefined),
    address:
      errors.address ??
      (addressValue && validateAddress(addressValue) !== true
        ? { message: validateAddress(addressValue) as string }
        : undefined),
    networkId:
      errors.networkId ??
      (!selectedNetwork ? { message: ERROR_MESSAGES.NETWORK_REQUIRED } : undefined),
  };

  return {
    control,
    handleSubmit,
    errors: formErrors,
    isValid:
      isValid &&
      !!selectedNetwork &&
      validateName(watch('name') ?? '') === true &&
      validateAddress(addressValue ?? '') === true,
    selectedNetwork,
    setSelectedNetwork,
    adapter,
    isAdapterLoading,
    addressPlaceholder,
    reset,
  };
}
