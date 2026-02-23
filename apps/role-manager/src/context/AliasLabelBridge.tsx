/**
 * AliasLabelBridge
 *
 * Bridges alias storage and the AddressLabelProvider + AddressSuggestionProvider
 * from ui-components. Reads the current network from ContractContext and creates
 * reactive resolvers backed by the app's Dexie database.
 *
 * - All `AddressDisplay` instances in the subtree automatically resolve aliases.
 * - All `AddressField` instances in the subtree automatically show alias suggestions.
 * - Clicking the pencil icon on any AddressDisplay opens the AliasEditPopover.
 */
import { useCallback } from 'react';
import type { ReactNode } from 'react';

import { AddressLabelProvider, AddressSuggestionProvider } from '@openzeppelin/ui-components';
import { AliasEditPopover, useAliasEditState } from '@openzeppelin/ui-renderer';
import {
  useAliasEditCallbacks,
  useAliasLabelResolver,
  useAliasSuggestionResolver,
} from '@openzeppelin/ui-storage';

import { db } from '../core/storage/database';
import { useSelectedContract } from '../hooks/useSelectedContract';

/** Bridges alias storage into ui-components contexts for labels and suggestions. */
export function AliasLabelBridge({ children }: { children: ReactNode }) {
  const { selectedNetwork } = useSelectedContract();

  const labelResolver = useAliasLabelResolver(db, {
    networkId: selectedNetwork?.id,
  });

  const suggestionResolver = useAliasSuggestionResolver(db);
  const editCallbacks = useAliasEditCallbacks(db);

  const { editing, onEditLabel, handleClose, lastClickRef } = useAliasEditState(
    selectedNetwork?.id
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      lastClickRef.current = { x: e.clientX, y: e.clientY };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ref is stable
    []
  );

  return (
    <div onPointerDown={handlePointerDown}>
      <AddressLabelProvider resolveLabel={labelResolver.resolveLabel} onEditLabel={onEditLabel}>
        <AddressSuggestionProvider resolveSuggestions={suggestionResolver.resolveSuggestions}>
          {children}
        </AddressSuggestionProvider>
      </AddressLabelProvider>

      {editing && (
        <AliasEditPopover
          address={editing.address}
          networkId={editing.networkId}
          anchorRect={editing.anchorRect}
          onClose={handleClose}
          {...editCallbacks}
        />
      )}
    </div>
  );
}
