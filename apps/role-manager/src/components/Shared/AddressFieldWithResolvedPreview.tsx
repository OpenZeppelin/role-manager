import type { FieldValues } from 'react-hook-form';

import {
  AddressFieldWithResolvedPreview as BaseAddressFieldWithResolvedPreview,
  type AddressFieldWithResolvedPreviewProps as BaseAddressFieldWithResolvedPreviewProps,
} from '@openzeppelin/ui-components';

import { ResolvedAddressFieldPreview } from './ResolvedAddressFieldPreview';

export type AddressFieldWithResolvedPreviewProps<TFieldValues extends FieldValues> = Omit<
  BaseAddressFieldWithResolvedPreviewProps<TFieldValues>,
  'preview'
>;

/**
 * Role-manager address field: ui-components shell + contract-scoped reverse ENS
 * preview via `ResolvedAddressFieldPreview`.
 */
export function AddressFieldWithResolvedPreview<TFieldValues extends FieldValues>({
  previewAddress,
  previewNetworkId,
  addressing,
  ...rest
}: AddressFieldWithResolvedPreviewProps<TFieldValues>): React.ReactElement {
  return (
    <BaseAddressFieldWithResolvedPreview
      {...rest}
      addressing={addressing}
      previewAddress={previewAddress}
      previewNetworkId={previewNetworkId}
      preview={
        <ResolvedAddressFieldPreview
          address={previewAddress}
          networkId={previewNetworkId}
          addressing={addressing}
        />
      }
    />
  );
}
