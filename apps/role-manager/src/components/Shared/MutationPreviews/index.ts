/**
 * Mutation Preview Components
 *
 * Context-specific ghost/shimmer placeholders rendered while the app
 * polls for post-mutation RPC confirmation.
 *
 * Governed by the central MutationPreviewData store in useContractData.
 * To add a new mutation preview:
 * 1. Create a new Ghost/Fading component in this directory.
 * 2. Export it from this barrel.
 * 3. Wire it into the relevant UI section (e.g. RoleDetails) by
 *    checking `preview.type` from useMutationPreview().
 */

export { GhostAccountRow } from './GhostAccountRow';
export type { GhostAccountRowProps } from './GhostAccountRow';

export { GhostPendingDelay } from './GhostPendingDelay';
export type { GhostPendingDelayProps } from './GhostPendingDelay';

export { GhostPendingTransfer } from './GhostPendingTransfer';
export type { GhostPendingTransferProps } from './GhostPendingTransfer';

export { FadingOverlay } from './FadingOverlay';
export type { FadingOverlayProps, FadingOverlayVariant } from './FadingOverlay';
