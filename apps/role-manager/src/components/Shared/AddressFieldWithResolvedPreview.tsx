import type { FieldValues } from 'react-hook-form';

import { AddressField, type AddressFieldProps } from '@openzeppelin/ui-components';
import type { AddressingCapability } from '@openzeppelin/ui-types';
import { cn } from '@openzeppelin/ui-utils';

import { ResolvedAddressFieldPreview } from './ResolvedAddressFieldPreview';

export type AddressFieldWithResolvedPreviewProps<TFieldValues extends FieldValues> =
  AddressFieldProps<TFieldValues> & {
    /** Current form value watched from the same field `name`. */
    previewAddress: string | undefined;
    previewNetworkId?: string;
    addressing?: AddressingCapability;
    className?: string;
  };

/**
 * AddressField plus a rich ENS preview card. Suppresses the redundant forward
 * "Resolved to 0x…" announcer once the preview is visible via
 * `showForwardResolutionSuccessAnnouncer` when the preview is visible.
 */
export function AddressFieldWithResolvedPreview<TFieldValues extends FieldValues>({
  previewAddress,
  previewNetworkId,
  addressing,
  className,
  showCrossNetworkFallbackDisclaimer,
  showForwardResolutionSuccessAnnouncer,
  ...addressFieldProps
}: AddressFieldWithResolvedPreviewProps<TFieldValues>): React.ReactElement {
  const trimmed = previewAddress?.trim() ?? '';
  const showPreview = trimmed !== '' && addressing?.isValidAddress(trimmed) === true;
  const suppressForwardSuccess = showPreview;

  return (
    <div className={cn('space-y-1.5', className)}>
      <AddressField
        {...addressFieldProps}
        addressing={addressing}
        showCrossNetworkFallbackDisclaimer={
          showCrossNetworkFallbackDisclaimer ?? !suppressForwardSuccess
        }
        showForwardResolutionSuccessAnnouncer={
          showForwardResolutionSuccessAnnouncer ?? !suppressForwardSuccess
        }
      />
      <ResolvedAddressFieldPreview
        address={previewAddress}
        networkId={previewNetworkId}
        addressing={addressing}
      />
    </div>
  );
}
