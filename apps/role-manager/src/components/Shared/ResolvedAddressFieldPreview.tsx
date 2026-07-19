import {
  ResolvedAddressFieldPreview as BaseResolvedAddressFieldPreview,
  type ResolvedAddressFieldPreviewProps as BaseResolvedAddressFieldPreviewProps,
} from '@openzeppelin/ui-components';

import { useReverseAddressResolution } from '../../hooks/useReverseAddressResolution';

export type ResolvedAddressFieldPreviewProps = BaseResolvedAddressFieldPreviewProps;

/**
 * Role-manager preview card: ui-components shell + contract-scoped reverse ENS
 * via `useReverseAddressResolution` (wallet runtime or contract fallback).
 */
export function ResolvedAddressFieldPreview({
  address,
  networkId,
  addressing,
  ...rest
}: ResolvedAddressFieldPreviewProps): React.ReactElement | null {
  const resolvedName = useReverseAddressResolution(address, networkId);

  return (
    <BaseResolvedAddressFieldPreview
      address={address}
      networkId={networkId}
      addressing={addressing}
      resolvedName={resolvedName}
      {...rest}
    />
  );
}
