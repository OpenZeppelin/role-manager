/**
 * CompactEcosystemSelector Component
 * Feature: 004-add-contract-record
 *
 * A compact inline ecosystem selector for use in dialogs.
 * Shows ecosystem options as a clean horizontal row with icons.
 */

import { NetworkEthereum, NetworkSolana, NetworkStellar } from '@web3icons/react';

import type { Ecosystem } from '@openzeppelin/ui-builder-types';
import { MidnightIcon } from '@openzeppelin/ui-builder-ui';

import {
  ECOSYSTEM_ORDER,
  getEcosystemDefaultFeatureConfig,
  getEcosystemName,
} from '@/core/ecosystems/registry';

export interface CompactEcosystemSelectorProps {
  /** Currently selected ecosystem */
  selectedEcosystem: Ecosystem | null;
  /** Callback when an ecosystem is selected */
  onSelectEcosystem: (ecosystem: Ecosystem) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

// Map ecosystems to their icon components for cleaner lookup
const ECOSYSTEM_ICONS: Partial<
  Record<
    Ecosystem,
    React.ComponentType<{ size?: number; className?: string; variant?: 'branded' | 'mono' }>
  >
> = {
  evm: NetworkEthereum,
  stellar: NetworkStellar,
  solana: NetworkSolana,
  // Midnight is handled separately due to different props/icon set
};

/**
 * Get the icon component for an ecosystem
 */
function EcosystemIcon({
  ecosystem,
  disabled,
  size = 24,
}: {
  ecosystem: Ecosystem;
  disabled?: boolean;
  size?: number;
}): React.ReactElement {
  const className = disabled ? 'opacity-50' : '';

  // Special case for Midnight (custom icon from UI builder)
  if (ecosystem === 'midnight') {
    return <MidnightIcon size={size - 4} className={className} />;
  }

  // Standard Web3Icons
  const IconComponent = ECOSYSTEM_ICONS[ecosystem];
  if (IconComponent) {
    return <IconComponent size={size} variant="branded" className={className} />;
  }

  // Fallback for unknown ecosystems
  return (
    <div
      className={`rounded-full bg-muted flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <span className="text-xs font-medium text-muted-foreground">
        {ecosystem.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

/**
 * Compact horizontal ecosystem selector for dialogs.
 *
 * Features:
 * - Clean grid layout that adapts to available space
 * - Shows ecosystem icons with labels
 * - Disabled state for unavailable ecosystems
 * - Selected state styling with primary color highlight
 */
export function CompactEcosystemSelector({
  selectedEcosystem,
  onSelectEcosystem,
  disabled = false,
}: CompactEcosystemSelectorProps): React.ReactElement {
  // Get visible ecosystems (only those with showInUI !== false)
  const ecosystemOptions = ECOSYSTEM_ORDER.map((ecosystem) => {
    const config = getEcosystemDefaultFeatureConfig(ecosystem);
    return {
      value: ecosystem,
      label: getEcosystemName(ecosystem),
      enabled: config.enabled,
      showInUI: config.showInUI !== false,
      disabledLabel: config.disabledLabel,
    };
  }).filter((opt) => opt.showInUI);

  return (
    <div className="grid grid-cols-2 gap-2">
      {ecosystemOptions.map((option) => {
        const isSelected = selectedEcosystem === option.value;
        const isDisabled = disabled || !option.enabled;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              if (!isDisabled) {
                onSelectEcosystem(option.value);
              }
            }}
            disabled={isDisabled}
            title={isDisabled && option.disabledLabel ? option.disabledLabel : option.label}
            className={`
              flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all
              ${
                isDisabled
                  ? 'cursor-not-allowed border-border bg-muted/50'
                  : isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border bg-card hover:bg-muted hover:border-muted-foreground/40'
              }
            `}
            aria-selected={isSelected}
            aria-disabled={isDisabled}
          >
            <div className="flex-shrink-0">
              <EcosystemIcon ecosystem={option.value} disabled={isDisabled} size={28} />
            </div>
            <div className="flex flex-col min-w-0">
              <span
                className={`font-medium text-sm truncate ${
                  isDisabled
                    ? 'text-muted-foreground'
                    : isSelected
                      ? 'text-primary'
                      : 'text-foreground'
                }`}
              >
                {option.label}
              </span>
              {isDisabled && option.disabledLabel && (
                <span className="text-xs text-muted-foreground">{option.disabledLabel}</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
