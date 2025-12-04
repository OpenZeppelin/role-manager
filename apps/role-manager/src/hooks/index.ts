/**
 * Hooks barrel file - exports all custom hooks for the Role Manager app.
 */

// Network hooks
export { useAllNetworks } from './useAllNetworks';
export { useNetworkAdapter } from './useNetworkAdapter';
export { useNetworksByEcosystem } from './useNetworksByEcosystem';

// Contract hooks
export { useContractForm } from './useContractForm';
export { useRecentContracts } from './useRecentContracts';
export { useContractSchema } from './useContractSchema';
export { useContractSchemaLoader } from './useContractSchemaLoader';

// Access Control hooks
export { useAccessControlService } from './useAccessControlService';
export type { UseAccessControlServiceReturn } from './useAccessControlService';
export { useContractCapabilities, isContractSupported } from './useContractCapabilities';
export type { UseContractCapabilitiesReturn } from './useContractCapabilities';

// Utility hooks
export { useDebounce } from './useDebounce';
