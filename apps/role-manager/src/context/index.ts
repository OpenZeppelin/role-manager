/**
 * Context barrel file - exports all context providers for the Role Manager app.
 * Feature: 007-dashboard-real-data
 * Feature: 013-wallet-connect-header (WalletSyncProvider)
 */

export { ContractContext, ContractProvider, useContractContext } from './ContractContext';
export { WalletSyncProvider } from './WalletSyncProvider';
