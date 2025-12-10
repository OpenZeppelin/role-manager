/**
 * Stellar Wallets Kit configuration for Stellar wallet connections
 *
 * This file is loaded dynamically by WalletStateProvider via loadAppConfigModule.
 * Supports: Freighter, Albedo, xBull, and other Stellar wallets.
 *
 * Note: Stellar Wallets Kit doesn't require an external project ID like WalletConnect.
 * Wallet options are auto-detected based on installed browser extensions.
 *
 * Feature: 013-wallet-connect-header
 */

export default {
  appName: 'Role Manager',
  // Stellar Wallets Kit auto-detects available wallet extensions
  // No additional configuration required
};
