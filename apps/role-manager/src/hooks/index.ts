/**
 * Hooks barrel file - exports all custom hooks for the Role Manager app.
 */

// Network hooks
export { useAllNetworks } from './useAllNetworks';
export { useNetworkAdapter } from './useNetworkAdapter';
export { useNetworksByEcosystem } from './useNetworksByEcosystem';
export { useNetworkSelection } from './useNetworkSelection';
export type { UseNetworkSelectionOptions, UseNetworkSelectionReturn } from './useNetworkSelection';

// Contract selection hooks (Feature: 007-dashboard-real-data)
export { useSelectedContract } from './useSelectedContract';
export { useContractSelection } from './useContractSelection';
export type {
  UseContractSelectionOptions,
  UseContractSelectionReturn,
} from './useContractSelection';
export { useContractRegistration } from './useContractRegistration';
export type {
  UseContractRegistrationOptions,
  UseContractRegistrationReturn,
} from './useContractRegistration';

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
export {
  useContractRoles,
  useContractOwnership,
  useContractAdminInfo,
  usePaginatedRoles,
  adminInfoQueryKey,
} from './useContractData';
export { DataError, ErrorCategory } from '../utils/errors';
export type {
  UseContractRolesReturn,
  UseContractOwnershipReturn,
  UseContractAdminInfoReturn,
  UsePaginatedRolesReturn,
  PaginationOptions,
} from './useContractData';

// Mutation hooks
export {
  useGrantRole,
  useRevokeRole,
  useTransferOwnership,
  useAcceptOwnership,
  useTransferAdminRole,
  useAcceptAdminTransfer,
  useRenounceOwnership,
  useRenounceRole,
  useExportSnapshot,
} from './useAccessControlMutations';
export type {
  GrantRoleArgs,
  RevokeRoleArgs,
  TransferOwnershipArgs,
  AcceptOwnershipArgs,
  TransferAdminRoleArgs,
  AcceptAdminTransferArgs,
  RenounceOwnershipArgs,
  RenounceRoleArgs,
  MutationHookOptions,
  UseAccessControlMutationReturn,
  AccessSnapshot,
  UseExportSnapshotReturn,
  ExportSnapshotOptions,
} from './useAccessControlMutations';

// Current Block Hook (Feature: 015-ownership-transfer)
export { useCurrentBlock, DEFAULT_POLL_INTERVAL_MS } from './useCurrentBlock';
export type { UseCurrentBlockOptions, UseCurrentBlockReturn } from './useCurrentBlock';

// Chain-agnostic block poll interval (Feature: 017-evm-access-control)
export { useBlockPollInterval, computeBlockPollInterval } from './useBlockPollInterval';

// Block Time Estimation Hook (Feature: 015-ownership-transfer)
export { useBlockTimeEstimate } from './useBlockTimeEstimate';
export type {
  BlockTimeEstimate,
  UseBlockTimeEstimateReturn,
  UseBlockTimeEstimateOptions,
} from './useBlockTimeEstimate';

// Ownership Transfer Dialog Hook (Feature: 015-ownership-transfer)
export { useOwnershipTransferDialog } from './useOwnershipTransferDialog';
export type {
  TransferOwnershipFormData,
  UseOwnershipTransferDialogOptions,
  UseOwnershipTransferDialogReturn,
} from './useOwnershipTransferDialog';

// Accept Ownership Dialog Hook (Feature: 015-ownership-transfer)
export { useAcceptOwnershipDialog } from './useAcceptOwnershipDialog';
export type {
  UseAcceptOwnershipDialogOptions,
  UseAcceptOwnershipDialogReturn,
} from './useAcceptOwnershipDialog';

// Admin Transfer Dialog Hook (Feature: 016-two-step-admin-assignment)
export { useAdminTransferDialog } from './useAdminTransferDialog';
export type {
  TransferAdminFormData,
  UseAdminTransferDialogOptions,
  UseAdminTransferDialogReturn,
} from './useAdminTransferDialog';

// Accept Admin Transfer Dialog Hook (Feature: 016-two-step-admin-assignment)
export { useAcceptAdminTransferDialog } from './useAcceptAdminTransferDialog';
export type {
  UseAcceptAdminTransferDialogOptions,
  UseAcceptAdminTransferDialogReturn,
} from './useAcceptAdminTransferDialog';

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

// Pending Transfers Hook (Feature: 015-ownership-transfer Phase 6.5)
export { usePendingTransfers } from './usePendingTransfers';
export type { UsePendingTransfersOptions } from './usePendingTransfers';

// Renounce Dialog Hook (Feature: 017-evm-access-control)
export { useRenounceDialog } from './useRenounceDialog';
export type {
  RenounceType,
  UseRenounceDialogOptions,
  UseRenounceDialogReturn,
} from './useRenounceDialog';

// Utility hooks
export { useDebounce } from './useDebounce';

// Analytics hooks (Feature: analytics)
export { useRoleManagerAnalytics } from './useRoleManagerAnalytics';
