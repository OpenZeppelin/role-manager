/**
 * Tests for AliasLabelBridge
 *
 * Verifies that the bridge component:
 * - Renders children
 * - Passes the selected network ID to useAliasLabelResolver
 * - Passes the db instance to useAliasSuggestionResolver and useAliasEditCallbacks
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { NetworkConfig } from '@openzeppelin/ui-types';

import { AliasLabelBridge } from '../AliasLabelBridge';

// =============================================================================
// Mocks (hoisted to avoid vi.mock factory scoping issues)
// =============================================================================

const { mockUseAliasLabelResolver, mockUseAliasSuggestionResolver, mockUseAliasEditCallbacks } =
  vi.hoisted(() => ({
    mockUseAliasLabelResolver: vi.fn(() => ({ resolveLabel: vi.fn() })),
    mockUseAliasSuggestionResolver: vi.fn(() => ({ resolveSuggestions: vi.fn(() => []) })),
    mockUseAliasEditCallbacks: vi.fn(() => ({ onLookup: vi.fn(), onSave: vi.fn() })),
  }));

vi.mock('@openzeppelin/ui-storage', () => ({
  useAliasLabelResolver: mockUseAliasLabelResolver,
  useAliasSuggestionResolver: mockUseAliasSuggestionResolver,
  useAliasEditCallbacks: mockUseAliasEditCallbacks,
}));

vi.mock('@openzeppelin/ui-components', async () => {
  const actual = await vi.importActual('@openzeppelin/ui-components');
  return {
    ...actual,
    AddressLabelProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    AddressSuggestionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock('@openzeppelin/ui-renderer', () => ({
  AliasEditPopover: () => null,
  useAliasEditState: vi.fn(() => ({
    editing: null,
    onEditLabel: vi.fn(),
    handleClose: vi.fn(),
    lastClickRef: { current: { x: 0, y: 0 } },
  })),
}));

const mockSelectedNetwork: NetworkConfig = {
  id: 'ethereum-mainnet',
  name: 'Ethereum',
  ecosystem: 'evm',
  network: 'ethereum',
  type: 'mainnet',
  isTestnet: false,
} as NetworkConfig;

vi.mock('../../hooks/useSelectedContract', () => ({
  useSelectedContract: vi.fn(() => ({
    selectedNetwork: mockSelectedNetwork,
    selectedContract: null,
    setSelectedContract: vi.fn(),
    setSelectedNetwork: vi.fn(),
    runtime: null,
    isRuntimeLoading: false,
    contracts: [],
    isContractsLoading: false,
    isContractRegistered: vi.fn(),
    selectContractById: vi.fn(),
  })),
}));

vi.mock('../../core/storage/database', () => ({
  db: { _testDb: true },
}));

// =============================================================================
// Tests
// =============================================================================

describe('AliasLabelBridge', () => {
  it('renders children', () => {
    render(
      <AliasLabelBridge>
        <div data-testid="child">Hello</div>
      </AliasLabelBridge>
    );

    expect(screen.getByTestId('child')).toBeTruthy();
    expect(screen.getByText('Hello')).toBeTruthy();
  });

  it('passes network ID to useAliasLabelResolver', () => {
    render(
      <AliasLabelBridge>
        <div>Test</div>
      </AliasLabelBridge>
    );

    expect(mockUseAliasLabelResolver).toHaveBeenCalledWith(
      expect.objectContaining({ _testDb: true }),
      expect.objectContaining({ networkId: 'ethereum-mainnet' })
    );
  });

  it('passes db to useAliasSuggestionResolver', () => {
    render(
      <AliasLabelBridge>
        <div>Test</div>
      </AliasLabelBridge>
    );

    expect(mockUseAliasSuggestionResolver).toHaveBeenCalledWith(
      expect.objectContaining({ _testDb: true })
    );
  });

  it('passes db to useAliasEditCallbacks', () => {
    render(
      <AliasLabelBridge>
        <div>Test</div>
      </AliasLabelBridge>
    );

    expect(mockUseAliasEditCallbacks).toHaveBeenCalledWith(
      expect.objectContaining({ _testDb: true })
    );
  });
});
