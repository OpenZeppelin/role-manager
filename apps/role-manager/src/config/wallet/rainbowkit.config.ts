/**
 * RainbowKit UI kit configuration for EVM wallet connection modals
 *
 * This file is loaded dynamically by WalletStateProvider via loadAppConfigModule
 * when the EVM adapter's kitName is 'rainbowkit'.
 *
 * Structure follows the EVM adapter's expected format:
 * - wagmiParams: Options for RainbowKit's getDefaultConfig() (appName, projectId, etc.)
 * - providerProps: Props for <RainbowKitProvider /> component
 * - customizations: UI customizations for ConnectButton
 *
 * Feature: 013-wallet-connect-header
 */

const rainbowKitAppConfig = {
  wagmiParams: {
    appName: 'OpenZeppelin Role Manager',
    projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string,
    ssr: false,
  },
  providerProps: {
    showRecentTransactions: true,
    appInfo: {
      appName: 'OpenZeppelin Role Manager',
      learnMoreUrl: 'https://openzeppelin.com',
    },
  },
  customizations: {
    connectButton: {
      // Hide the network switcher - we use our own ecosystem picker
      chainStatus: 'none',
    },
  },
};

export default rainbowKitAppConfig;
