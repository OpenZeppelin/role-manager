/**
 * Tests for WalletConnectionTracker
 *
 * Verifies that:
 * - wallet_connected fires once per connect transition with the connector name
 * - wallet_disconnected fires once per disconnect transition
 * - No account address is ever forwarded to analytics
 */
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RoleManagerRuntime } from '@/core/runtimeAdapter';

import { WalletConnectionTracker } from '../WalletConnectionTracker';

const mockAnalytics = vi.hoisted(() => ({
  trackWalletConnection: vi.fn(),
  trackWalletDisconnection: vi.fn(),
}));
const mockUseDerivedAccountStatus = vi.hoisted(() => vi.fn());
const mockUseWalletState = vi.hoisted(() => vi.fn());
const mockUseSelectedContract = vi.hoisted(() => vi.fn());

vi.mock('@openzeppelin/ui-react', () => ({
  useDerivedAccountStatus: () => mockUseDerivedAccountStatus(),
  useWalletState: () => mockUseWalletState(),
}));

vi.mock('../../../hooks/useRoleManagerAnalytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../hooks/useRoleManagerAnalytics')>()),
  useRoleManagerAnalytics: () => mockAnalytics,
}));

vi.mock('../../../hooks/useSelectedContract', () => ({
  useSelectedContract: () => mockUseSelectedContract(),
}));

const ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const NETWORK = { networkId: 'ethereum-mainnet', ecosystem: 'evm' };

const runtime = {
  networkConfig: { id: 'ethereum-mainnet', ecosystem: 'evm' },
} as unknown as RoleManagerRuntime;

function setAccountStatus(isConnected: boolean) {
  mockUseDerivedAccountStatus.mockReturnValue({
    isConnected,
    address: isConnected ? ADDRESS : undefined,
  });
}

function setConnector(connector: { id: string; name?: string } | undefined) {
  mockUseWalletState.mockReturnValue({
    activeRuntime: {
      wallet: { getWalletConnectionStatus: () => ({ isConnected: true, connector }) },
    },
  });
}

describe('WalletConnectionTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSelectedContract.mockReturnValue({ runtime });
    setConnector({ id: 'io.metamask', name: 'MetaMask' });
    setAccountStatus(false);
  });

  it('renders nothing and tracks nothing while disconnected', () => {
    const { container } = render(<WalletConnectionTracker />);

    expect(container).toBeEmptyDOMElement();
    expect(mockAnalytics.trackWalletConnection).not.toHaveBeenCalled();
    expect(mockAnalytics.trackWalletDisconnection).not.toHaveBeenCalled();
  });

  it('tracks wallet_connected with the connector name on connect', () => {
    const { rerender } = render(<WalletConnectionTracker />);

    setAccountStatus(true);
    rerender(<WalletConnectionTracker />);

    expect(mockAnalytics.trackWalletConnection).toHaveBeenCalledTimes(1);
    expect(mockAnalytics.trackWalletConnection).toHaveBeenCalledWith('MetaMask', NETWORK);
  });

  it('tracks wallet_disconnected once on disconnect', () => {
    setAccountStatus(true);
    const { rerender } = render(<WalletConnectionTracker />);

    setAccountStatus(false);
    rerender(<WalletConnectionTracker />);
    rerender(<WalletConnectionTracker />);

    expect(mockAnalytics.trackWalletDisconnection).toHaveBeenCalledTimes(1);
    expect(mockAnalytics.trackWalletDisconnection).toHaveBeenCalledWith(NETWORK);
  });

  it('does not re-track while the connection state is unchanged', () => {
    setAccountStatus(true);
    const { rerender } = render(<WalletConnectionTracker />);

    rerender(<WalletConnectionTracker />);
    rerender(<WalletConnectionTracker />);

    expect(mockAnalytics.trackWalletConnection).toHaveBeenCalledTimes(1);
  });

  it('falls back to the connector id, then unknown, when no name is available', () => {
    setConnector({ id: 'freighter' });
    setAccountStatus(true);
    render(<WalletConnectionTracker />);
    expect(mockAnalytics.trackWalletConnection).toHaveBeenCalledWith('freighter', NETWORK);

    vi.clearAllMocks();
    mockUseWalletState.mockReturnValue({ activeRuntime: null });
    render(<WalletConnectionTracker />);
    expect(mockAnalytics.trackWalletConnection).toHaveBeenCalledWith('unknown', NETWORK);
  });

  it('never forwards the account address', () => {
    setAccountStatus(true);
    render(<WalletConnectionTracker />);

    const forwarded = JSON.stringify([
      ...mockAnalytics.trackWalletConnection.mock.calls,
      ...mockAnalytics.trackWalletDisconnection.mock.calls,
    ]);
    expect(forwarded).not.toContain(ADDRESS);
  });
});
