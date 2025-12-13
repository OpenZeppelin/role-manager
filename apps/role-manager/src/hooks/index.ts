/**
 * Hooks barrel file - exports all custom hooks for the Role Manager app.
 */

// Network hooks
export { useAllNetworks } from './useAllNetworks';
export { useNetworkAdapter } from './useNetworkAdapter';
export { useNetworksByEcosystem } from './useNetworksByEcosystem';

// Contract selection hooks (Feature: 007-dashboard-real-data)
export { useSelectedContract } from './useSelectedContract';

// Dashboard data aggregation hook (Feature: 007-dashboard-real-data)
export { useDashboardData } from './useDashboardData';

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

// Custom Role Descriptions (Feature: 009-roles-page-data)
export { useCustomRoleDescriptions } from './useCustomRoleDescriptions';
export type { UseCustomRoleDescriptionsReturn } from './useCustomRoleDescriptions';

// Roles Page Data Orchestration (Feature: 009-roles-page-data)
export { useRolesPageData } from './useRolesPageData';
export type { UseRolesPageDataReturn } from './useRolesPageData';

// Authorized Accounts Data Hook (Feature: 011-accounts-real-data)
export { useContractRolesEnriched } from './useContractRolesEnriched';
export type { UseContractRolesEnrichedReturn } from './useContractRolesEnriched';
export { useAuthorizedAccountsPageData } from './useAuthorizedAccountsPageData';
export type {
  UseAuthorizedAccountsPageDataReturn,
  PaginationControls,
} from './useAuthorizedAccountsPageData';

// Role Changes Data Hook (Feature: 012-role-changes-data)
export { useContractHistory, DEFAULT_PAGE_SIZE } from './useContractHistory';
export type { UseContractHistoryReturn } from '../types/role-changes';
export { useRoleChangesPageData } from './useRoleChangesPageData';
export type { UseRoleChangesPageDataReturn } from '../types/role-changes';

// Role Dialog Hooks (Feature: 014-role-grant-revoke)
export { useManageRolesDialog } from './useManageRolesDialog';
export type {
  UseManageRolesDialogOptions,
  UseManageRolesDialogReturn,
} from './useManageRolesDialog';
export { useAssignRoleDialog } from './useAssignRoleDialog';
export type {
  UseAssignRoleDialogOptions,
  UseAssignRoleDialogReturn,
  AssignRoleFormData,
} from './useAssignRoleDialog';
export { useRevokeRoleDialog } from './useRevokeRoleDialog';
export type { UseRevokeRoleDialogOptions, UseRevokeRoleDialogReturn } from './useRevokeRoleDialog';
export {
  useTransactionExecution,
  useMultiMutationExecution,
  isUserRejectionError,
  SUCCESS_AUTO_CLOSE_DELAY,
} from './useTransactionExecution';
export type {
  MutationHook,
  UseTransactionExecutionOptions,
  UseTransactionExecutionReturn,
  UseMultiMutationExecutionOptions,
  UseMultiMutationExecutionReturn,
} from './useTransactionExecution';

// Utility hooks
export { useDebounce } from './useDebounce';
