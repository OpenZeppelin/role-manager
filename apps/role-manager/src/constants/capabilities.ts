import type { AccessControlCapabilities } from '@openzeppelin/ui-types';

import type { FeatureBadgeVariant } from '../components/Shared/FeatureBadge';

export interface CapabilityDescriptor {
  label: string;
  variant: FeatureBadgeVariant;
  description: string;
}

type CapabilityKey = keyof AccessControlCapabilities;

/**
 * Core contract types — the primary access control model(s) the contract implements.
 * Displayed in the "Contract Type" row.
 */
export const CONTRACT_TYPES: Record<string, CapabilityDescriptor> = {
  hasAccessControl: {
    label: 'AccessControl',
    variant: 'purple',
    description: 'Role-based access control with granular permissions for multiple roles.',
  },
  hasOwnable: {
    label: 'Ownable',
    variant: 'blue',
    description: 'Single-owner access control pattern.',
  },
} as const satisfies Partial<Record<CapabilityKey, CapabilityDescriptor>>;

/**
 * Contract features — additional capabilities layered on top of the core type.
 * Displayed in the "Contract Features" row.
 */
export const CONTRACT_FEATURES: Record<string, CapabilityDescriptor> = {
  hasTwoStepOwnable: {
    label: 'Two-Step Ownership',
    variant: 'cyan',
    description:
      'Ownership transfers require the new owner to explicitly accept, preventing accidental transfers to wrong addresses.',
  },
  hasTwoStepAdmin: {
    label: 'Two-Step Admin',
    variant: 'teal',
    description:
      'Admin transfers require acceptance after a configurable delay, adding a safety window before the change takes effect.',
  },
  hasEnumerableRoles: {
    label: 'Enumerable Roles',
    variant: 'green',
    description: 'Roles and their members can be enumerated on-chain.',
  },
  supportsHistory: {
    label: 'History',
    variant: 'amber',
    description: 'On-chain history of role changes is available via an indexer.',
  },
} as const satisfies Partial<Record<CapabilityKey, CapabilityDescriptor>>;

/**
 * Resolve active entries from a descriptor map against detected capabilities.
 * Returns only entries whose corresponding capability flag is truthy.
 */
export function resolveCapabilities(
  capabilities: AccessControlCapabilities | null | undefined,
  descriptors: Record<string, CapabilityDescriptor>
): CapabilityDescriptor[] {
  if (!capabilities) return [];
  return Object.entries(descriptors)
    .filter(([key]) => capabilities[key as CapabilityKey])
    .map(([, descriptor]) => descriptor);
}
