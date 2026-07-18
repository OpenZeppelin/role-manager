import type { AddressingCapability } from '@openzeppelin/ui-types';

import { ResolvedAddressDisplay } from './ResolvedAddressDisplay';

export interface ResolvedAddressFieldPreviewProps {
  /** Resolved form value from AddressField (hex after ENS forward resolution). */
  address: string | undefined;
  networkId?: string;
  addressing?: AddressingCapability;
}

/**
 * Rich ENS preview shown below an AddressField once the value is a valid address.
 * Complements AddressField's mechanism-neutral "Resolved to 0x…" announcer with
 * reverse-resolved name + avatar via AddressDisplay.
 */
export function ResolvedAddressFieldPreview({
  address,
  networkId,
  addressing,
}: ResolvedAddressFieldPreviewProps): React.ReactElement | null {
  const trimmed = address?.trim() ?? '';
  const showPreview = trimmed !== '' && addressing?.isValidAddress(trimmed) === true;

  if (!showPreview) {
    return null;
  }

  return (
    <div
      className="rounded-md border border-border/60 bg-muted/30 px-3 py-2"
      aria-label="Resolved address preview"
    >
      <p className="mb-1.5 text-xs text-muted-foreground">Resolved account</p>
      <ResolvedAddressDisplay
        address={trimmed}
        networkId={networkId}
        variant="chip"
        showCopyButton
      />
    </div>
  );
}
