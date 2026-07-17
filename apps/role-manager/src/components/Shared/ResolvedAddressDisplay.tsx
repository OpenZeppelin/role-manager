/**
 * ResolvedAddressDisplay
 *
 * Base AddressDisplay fed through AddressNameResolutionProvider so reverse
 * ENS (name + avatar) resolves when the active runtime supports it. Alias
 * labels still win via AliasLabelBridge (alias > ENS > hex).
 */
import { AddressDisplay, type AddressDisplayProps } from '@openzeppelin/ui-components';
import { AddressNameResolutionProvider } from '@openzeppelin/ui-renderer';

export type ResolvedAddressDisplayProps = {
  address: string;
  /** Scopes reverse lookup to a network; omit when not contract-scoped. */
  networkId?: string;
} & Omit<AddressDisplayProps, 'address'>;

/**
 * AddressDisplay with reverse name resolution for the given address.
 */
export function ResolvedAddressDisplay({
  address,
  networkId,
  ...displayProps
}: ResolvedAddressDisplayProps): React.ReactElement {
  return (
    <AddressNameResolutionProvider address={address} networkId={networkId}>
      <AddressDisplay address={address} networkId={networkId} {...displayProps} />
    </AddressNameResolutionProvider>
  );
}
