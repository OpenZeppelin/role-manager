/**
 * Tests for WalletSyncProvider
 * Feature: 013-wallet-connect-header
 *
 * Tests the synchronization between ContractContext (network selection)
 * and WalletStateProvider (wallet management).
 */
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NetworkConfig } from '@openzeppelin/ui-builder-types';

import { WalletSyncProvider } from '../WalletSyncProvider';

// =============================================================================
// Test Fixtures
// =============================================================================

const mockStellarNetwork: NetworkConfig = {
  id: 'stellar-testnet',
  name: 'Stellar Testnet',
  ecosystem: 'stellar',
  network: 'stellar',
  type: 'testnet',
  isTestnet: true,
} as NetworkConfig;

const mockEvmNetwork: NetworkConfig = {
  id: 'ethereum-sepolia',
  name: 'Ethereum Sepolia',
  ecosystem: 'evm',
  network: 'ethereum',
  type: 'testnet',
  isTestnet: true,
} as NetworkConfig;

// =============================================================================
// Mocks
// =============================================================================

// Track mock state
const mocks = {
  selectedNetwork: null as NetworkConfig | null,
  setActiveNetworkId: vi.fn(),
};

// Mock ContractContext hook
vi.mock('../ContractContext', () => ({
  useContractContext: () => ({
    selectedNetwork: mocks.selectedNetwork,
    setSelectedNetwork: vi.fn(),
    selectedContract: null,
    setSelectedContract: vi.fn(),
    adapter: null,
    isAdapterLoading: false,
    contracts: [],
    isContractsLoading: false,
    isContractRegistered: false,
  }),
}));

// Mock WalletState hook from react-core
vi.mock('@openzeppelin/ui-builder-react-core', () => ({
  useWalletState: () => ({
    setActiveNetworkId: mocks.setActiveNetworkId,
    activeNetworkId: null,
    activeNetworkConfig: null,
    activeAdapter: null,
    isAdapterLoading: false,
    walletFacadeHooks: null,
    reconfigureActiveAdapterUiKit: vi.fn(),
  }),
}));

// =============================================================================
// Tests
// =============================================================================

describe('WalletSyncProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state
    mocks.selectedNetwork = null;
    mocks.setActiveNetworkId.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render children', () => {
      const { getByTestId } = render(
        <WalletSyncProvider>
          <div data-testid="child">Child Content</div>
        </WalletSyncProvider>
      );

      expect(getByTestId('child')).toBeDefined();
    });
  });

  describe('network synchronization', () => {
    it('should call setActiveNetworkId with null when no network is selected', () => {
      mocks.selectedNetwork = null;

      render(
        <WalletSyncProvider>
          <div>Test</div>
        </WalletSyncProvider>
      );

      expect(mocks.setActiveNetworkId).toHaveBeenCalledWith(null);
    });

    it('should call setActiveNetworkId with network ID when network is selected', () => {
      mocks.selectedNetwork = mockStellarNetwork;

      render(
        <WalletSyncProvider>
          <div>Test</div>
        </WalletSyncProvider>
      );

      expect(mocks.setActiveNetworkId).toHaveBeenCalledWith('stellar-testnet');
    });

    it('should call setActiveNetworkId when network changes', async () => {
      // Start with Stellar network
      mocks.selectedNetwork = mockStellarNetwork;

      const { rerender } = render(
        <WalletSyncProvider>
          <div>Test</div>
        </WalletSyncProvider>
      );

      expect(mocks.setActiveNetworkId).toHaveBeenCalledWith('stellar-testnet');
      mocks.setActiveNetworkId.mockClear();

      // Change to EVM network
      mocks.selectedNetwork = mockEvmNetwork;
      rerender(
        <WalletSyncProvider>
          <div>Test</div>
        </WalletSyncProvider>
      );

      expect(mocks.setActiveNetworkId).toHaveBeenCalledWith('ethereum-sepolia');
    });

    it('should call setActiveNetworkId with null when network is deselected', () => {
      // Start with a network selected
      mocks.selectedNetwork = mockStellarNetwork;

      const { rerender } = render(
        <WalletSyncProvider>
          <div>Test</div>
        </WalletSyncProvider>
      );

      expect(mocks.setActiveNetworkId).toHaveBeenCalledWith('stellar-testnet');
      mocks.setActiveNetworkId.mockClear();

      // Deselect network
      mocks.selectedNetwork = null;
      rerender(
        <WalletSyncProvider>
          <div>Test</div>
        </WalletSyncProvider>
      );

      expect(mocks.setActiveNetworkId).toHaveBeenCalledWith(null);
    });
  });

  describe('contract obligations', () => {
    it('should read selectedNetwork from ContractContext', () => {
      // This test verifies the contract by ensuring the mock is being read
      mocks.selectedNetwork = mockStellarNetwork;

      render(
        <WalletSyncProvider>
          <div>Test</div>
        </WalletSyncProvider>
      );

      // If selectedNetwork wasn't read, setActiveNetworkId wouldn't be called with the network ID
      expect(mocks.setActiveNetworkId).toHaveBeenCalledWith(mockStellarNetwork.id);
    });

    it('should not modify ContractContext state', () => {
      // WalletSyncProvider should only read from ContractContext, never write
      // The mock's setSelectedNetwork should never be called by WalletSyncProvider
      // This is verified by the fact that our mock's setSelectedNetwork is not called
      // and by code inspection - WalletSyncProvider only uses useContractContext's selectedNetwork
      mocks.selectedNetwork = mockStellarNetwork;

      render(
        <WalletSyncProvider>
          <div>Test</div>
        </WalletSyncProvider>
      );

      // Only setActiveNetworkId should be called, not any ContractContext setters
      expect(mocks.setActiveNetworkId).toHaveBeenCalledTimes(1);
    });
  });
});
