import type {
  AccessControlCapability,
  AddressingCapability,
  ContractLoadingCapability,
  ExplorerCapability,
  NetworkCatalogCapability,
  OperatorEcosystemRuntime,
  QueryCapability,
  RelayerCapability,
  TypeMappingCapability,
} from '@openzeppelin/ui-types';

export interface RoleManagerRuntime extends OperatorEcosystemRuntime {
  relayer: RelayerCapability;
}

/**
 * Compatibility surface for the role-manager app while its consumers migrate
 * from the legacy monolithic adapter shape to profile runtimes and capabilities.
 */
export interface RoleManagerAdapter
  extends
    RoleManagerRuntime,
    AddressingCapability,
    ExplorerCapability,
    NetworkCatalogCapability,
    ContractLoadingCapability,
    TypeMappingCapability,
    QueryCapability,
    RelayerCapability {
  getAccessControlService?: () => AccessControlCapability | null;
}

export function toRoleManagerAdapter(
  runtime: RoleManagerRuntime | null
): RoleManagerAdapter | null {
  if (!runtime) {
    return null;
  }

  const {
    addressing,
    explorer,
    networkCatalog,
    contractLoading,
    typeMapping,
    query,
    relayer,
    accessControl,
  } = runtime;

  return {
    ...runtime,
    isValidAddress: addressing.isValidAddress.bind(addressing),
    getExplorerUrl: explorer.getExplorerUrl.bind(explorer),
    getExplorerTxUrl: explorer.getExplorerTxUrl?.bind(explorer),
    getNetworks: networkCatalog.getNetworks.bind(networkCatalog),
    loadContract: contractLoading.loadContract.bind(contractLoading),
    loadContractWithMetadata: contractLoading.loadContractWithMetadata?.bind(contractLoading),
    getContractDefinitionInputs: contractLoading.getContractDefinitionInputs.bind(contractLoading),
    mapParameterTypeToFieldType: typeMapping.mapParameterTypeToFieldType.bind(typeMapping),
    getCompatibleFieldTypes: typeMapping.getCompatibleFieldTypes.bind(typeMapping),
    generateDefaultField: typeMapping.generateDefaultField.bind(typeMapping),
    getTypeMappingInfo: typeMapping.getTypeMappingInfo.bind(typeMapping),
    getRuntimeFieldBinding: typeMapping.getRuntimeFieldBinding?.bind(typeMapping),
    queryViewFunction: query.queryViewFunction.bind(query),
    formatFunctionResult: query.formatFunctionResult.bind(query),
    getCurrentBlock: query.getCurrentBlock.bind(query),
    getRelayers: relayer.getRelayers.bind(relayer),
    getRelayer: relayer.getRelayer.bind(relayer),
    getNetworkServiceForms: relayer.getNetworkServiceForms.bind(relayer),
    validateNetworkServiceConfig: relayer.validateNetworkServiceConfig?.bind(relayer),
    testNetworkServiceConnection: relayer.testNetworkServiceConnection?.bind(relayer),
    validateRpcEndpoint: relayer.validateRpcEndpoint?.bind(relayer),
    testRpcConnection: relayer.testRpcConnection?.bind(relayer),
    validateExplorerConfig: relayer.validateExplorerConfig?.bind(relayer),
    testExplorerConnection: relayer.testExplorerConnection?.bind(relayer),
    getDefaultServiceConfig: relayer.getDefaultServiceConfig.bind(relayer),
    getAccessControlService: () => accessControl,
  };
}
