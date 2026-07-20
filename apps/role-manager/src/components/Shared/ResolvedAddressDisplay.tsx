/**
 * ResolvedAddressDisplay
 *
 * AddressDisplay with reverse ENS (name + avatar) resolved via the effective
 * runtime (wallet when available, otherwise contract-scoped). Alias labels
 * still win via AliasLabelBridge (alias > ENS > hex).
 */
import { AddressDisplay, type AddressDisplayProps } from '@openzeppelin/ui-components';

import { useReverseAddressResolution } from '../../hooks/useReverseAddressResolution';

export type ResolvedAddressDisplayProps = {
  address: string;
  /** Scopes reverse lookup to a network; omit when not contract-scoped. */
  networkId?: string;
} & Omit<AddressDisplayProps, 'address' | 'resolvedName'>;

/**
 * AddressDisplay with reverse name resolution for the given address.
 */
export function ResolvedAddressDisplay({
  address,
  networkId,
  ...displayProps
}: ResolvedAddressDisplayProps): React.ReactElement {
  const resolvedName = useReverseAddressResolution(address, networkId);

  return (
    <AddressDisplay
      address={address}
      networkId={networkId}
      resolvedName={resolvedName}
      {...displayProps}
    />
  );
}
