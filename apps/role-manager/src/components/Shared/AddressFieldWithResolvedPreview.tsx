import type { FieldValues } from 'react-hook-form';

import {
  AddressFieldWithResolvedPreview as BaseAddressFieldWithResolvedPreview,
  type AddressFieldWithResolvedPreviewProps as BaseAddressFieldWithResolvedPreviewProps,
} from '@openzeppelin/ui-components';
import { ResolvedAddressFieldPreviewWithNameResolution } from '@openzeppelin/ui-renderer';
import type { NetworkConfig } from '@openzeppelin/ui-types';

export type AddressFieldWithResolvedPreviewProps<TFieldValues extends FieldValues> = Omit<
  BaseAddressFieldWithResolvedPreviewProps<TFieldValues>,
  'preview'
> & {
  /**
   * Target network for network-scoped reverse ENS (e.g. contract network when it
   * differs from the wallet-global active network).
   */
  previewNetwork?: NetworkConfig;
};

/**
 * Role-manager address field: ui-components shell + network-scoped reverse ENS
 * preview via upstream `ResolvedAddressFieldPreviewWithNameResolution`.
 */
export function AddressFieldWithResolvedPreview<TFieldValues extends FieldValues>({
  previewAddress,
  previewNetworkId,
  previewNetwork,
  addressing,
  ...rest
}: AddressFieldWithResolvedPreviewProps<TFieldValues>): React.ReactElement {
  const networkId = previewNetworkId ?? previewNetwork?.id;

  return (
    <BaseAddressFieldWithResolvedPreview
      {...rest}
      addressing={addressing}
      previewAddress={previewAddress}
      previewNetworkId={networkId}
      preview={
        <ResolvedAddressFieldPreviewWithNameResolution
          address={previewAddress}
          networkId={networkId}
          network={previewNetwork}
          addressing={addressing}
        />
      }
    />
  );
}
