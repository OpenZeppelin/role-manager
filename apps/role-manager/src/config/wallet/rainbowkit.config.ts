/**
 * RainbowKit UI kit configuration for EVM wallet connection modals
 *
 * This file is loaded dynamically by WalletStateProvider via loadAppConfigModule.
 * Used when connecting to EVM-based networks (Ethereum, Polygon, etc.).
 *
 * Feature: 013-wallet-connect-header
 */

export default {
  appName: 'Role Manager',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  // Additional RainbowKit options can be added here as needed
};
