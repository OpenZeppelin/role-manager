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
export { useContractRoles, useContractOwnership, usePaginatedRoles } from './useContractData';
export { DataError, ErrorCategory } from '../utils/errors';
export type {
  UseContractRolesReturn,
  UseContractOwnershipReturn,
  UsePaginatedRolesReturn,
  PaginationOptions,
} from './useContractData';

// Mutation hooks
export {
  useGrantRole,
  useRevokeRole,
  useTransferOwnership,
  useExportSnapshot,
} from './useAccessControlMutations';
export type {
  GrantRoleArgs,
  RevokeRoleArgs,
  TransferOwnershipArgs,
  MutationHookOptions,
  UseAccessControlMutationReturn,
  AccessSnapshot,
  UseExportSnapshotReturn,
  ExportSnapshotOptions,
} from './useAccessControlMutations';

// Utility hooks
export { useDebounce } from './useDebounce';
