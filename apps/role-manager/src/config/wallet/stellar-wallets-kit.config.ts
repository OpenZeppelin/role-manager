/**
 * Stellar Wallets Kit configuration placeholder
 *
 * NOTE: The Stellar adapter does NOT use this TypeScript config file.
 * Stellar wallet configuration is loaded from app.config.json via AppConfigService:
 *
 * {
 *   "globalServiceConfigs": {
 *     "walletui": {
 *       "stellar": { "kitName": "custom", "kitConfig": { "appName": "..." } }
 *     }
 *   }
 * }
 *
 * This file exists for potential future use if the Stellar adapter adds support
 * for native TypeScript config loading (like the EVM adapter does for RainbowKit).
 *
 * Feature: 013-wallet-connect-header
 */

export default {
  appName: 'Role Manager',
  // Stellar Wallets Kit auto-detects available wallet extensions
  // Actual config is in public/app.config.json
};
