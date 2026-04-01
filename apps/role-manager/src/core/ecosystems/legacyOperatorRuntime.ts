import type React from 'react';

import type {
  AccessControlCapability,
  AccessControlService,
  AddressingCapability,
  AvailableUiKit,
  ContractLoadingCapability,
  EcosystemReactUiProviderProps,
  EcosystemSpecificReactHooks,
  EcosystemWalletComponents,
  ExecutionCapability,
  ExplorerCapability,
  NetworkCatalogCapability,
  NetworkConfig,
  QueryCapability,
  RelayerCapability,
  SchemaCapability,
  TypeMappingCapability,
  UiKitCapability,
  UiKitConfiguration,
  WalletCapability,
} from '@openzeppelin/ui-types';

import type { RoleManagerRuntime } from '@/core/runtimeAdapter';

type LegacyContractLoadingAdapter = Pick<
  ContractLoadingCapability,
  'loadContract' | 'loadContractWithMetadata' | 'getContractDefinitionInputs'
>;

type LegacyTypeMappingAdapter = Pick<
  TypeMappingCapability,
  | 'mapParameterTypeToFieldType'
  | 'getCompatibleFieldTypes'
  | 'generateDefaultField'
  | 'getTypeMappingInfo'
  | 'getRuntimeFieldBinding'
>;

type LegacyQueryAdapter = Pick<
  QueryCapability,
  'queryViewFunction' | 'formatFunctionResult' | 'getCurrentBlock'
>;

type LegacySchemaAdapter = Pick<
  SchemaCapability,
  'getWritableFunctions' | 'isViewFunction' | 'filterAutoQueryableFunctions'
>;

type LegacyExecutionAdapter = Pick<
  ExecutionCapability,
  | 'formatTransactionData'
  | 'signAndBroadcast'
  | 'getSupportedExecutionMethods'
  | 'validateExecutionConfig'
  | 'waitForTransactionConfirmation'
>;

type LegacyRelayerAdapter = Pick<
  RelayerCapability,
  | 'getRelayers'
  | 'getRelayer'
  | 'getNetworkServiceForms'
  | 'validateNetworkServiceConfig'
  | 'testNetworkServiceConnection'
  | 'validateRpcEndpoint'
  | 'testRpcConnection'
  | 'validateExplorerConfig'
  | 'testExplorerConnection'
  | 'getDefaultServiceConfig'
>;

type LegacyWalletAdapter = {
  supportsWalletConnection: WalletCapability['supportsWalletConnection'];
  getAvailableConnectors: WalletCapability['getAvailableConnectors'];
  connectWallet: WalletCapability['connectWallet'];
  disconnectWallet: WalletCapability['disconnectWallet'];
  getWalletConnectionStatus: WalletCapability['getWalletConnectionStatus'];
  onWalletConnectionChange?: WalletCapability['onWalletConnectionChange'];
};

type LegacyUiKitAdapter = {
  getUiLabels: () => Record<string, string> | undefined;
  configureUiKit?: UiKitCapability['configureUiKit'];
  getEcosystemReactUiContextProvider?: () =>
    | React.ComponentType<EcosystemReactUiProviderProps>
    | undefined;
  getEcosystemReactHooks?: () => EcosystemSpecificReactHooks | undefined;
  getEcosystemWalletComponents?: () => EcosystemWalletComponents | undefined;
  getAvailableUiKits: () => Promise<AvailableUiKit[]>;
  getRelayerOptionsComponent?: UiKitCapability['getRelayerOptionsComponent'];
  getExportableWalletConfigFiles?: (
    uiKitConfig?: UiKitConfiguration
  ) => Promise<Record<string, string>>;
};

interface LegacyOperatorAdapter
  extends
    AddressingCapability,
    ExplorerCapability,
    LegacyContractLoadingAdapter,
    LegacyTypeMappingAdapter,
    LegacySchemaAdapter,
    LegacyQueryAdapter,
    LegacyExecutionAdapter,
    LegacyRelayerAdapter,
    LegacyWalletAdapter,
    LegacyUiKitAdapter {
  readonly networkConfig: NetworkConfig;
  getAccessControlService?: () => AccessControlService | null;
}

type DisposableAccessControlService = AccessControlService & { dispose?: () => void };

function bindMethod<T extends object, TMethod extends keyof T>(target: T, method: TMethod) {
  const value = target[method];

  if (typeof value !== 'function') {
    throw new Error(`Expected "${String(method)}" to be a function on the legacy adapter.`);
  }

  return value.bind(target) as T[TMethod];
}

function bindOptionalMethod<T extends object, TMethod extends keyof T>(target: T, method: TMethod) {
  const value = target[method];
  return typeof value === 'function' ? value.bind(target) : undefined;
}

function createLegacyAccessControlCapability(
  adapter: LegacyOperatorAdapter
): AccessControlCapability {
  const service = adapter.getAccessControlService?.() as DisposableAccessControlService | null;

  if (!service) {
    throw new Error(
      `Legacy adapter for ${adapter.networkConfig.ecosystem} does not expose access control support.`
    );
  }

  return {
    networkConfig: adapter.networkConfig,
    dispose: () => {
      service.dispose?.();
    },
    getCapabilities: bindMethod(service, 'getCapabilities'),
    getOwnership: bindMethod(service, 'getOwnership'),
    getCurrentRoles: bindMethod(service, 'getCurrentRoles'),
    getCurrentRolesEnriched: bindMethod(service, 'getCurrentRolesEnriched'),
    grantRole: bindMethod(service, 'grantRole'),
    revokeRole: bindMethod(service, 'revokeRole'),
    transferOwnership: bindMethod(service, 'transferOwnership'),
    acceptOwnership: bindOptionalMethod(service, 'acceptOwnership'),
    getAdminInfo: bindOptionalMethod(service, 'getAdminInfo'),
    transferAdminRole: bindOptionalMethod(service, 'transferAdminRole'),
    acceptAdminTransfer: bindOptionalMethod(service, 'acceptAdminTransfer'),
    renounceOwnership: bindOptionalMethod(service, 'renounceOwnership'),
    renounceRole: bindOptionalMethod(service, 'renounceRole'),
    cancelAdminTransfer: bindOptionalMethod(service, 'cancelAdminTransfer'),
    changeAdminDelay: bindOptionalMethod(service, 'changeAdminDelay'),
    rollbackAdminDelay: bindOptionalMethod(service, 'rollbackAdminDelay'),
    getExpirationMetadata: bindOptionalMethod(service, 'getExpirationMetadata'),
    exportSnapshot: bindMethod(service, 'exportSnapshot'),
    getHistory: bindMethod(service, 'getHistory'),
  };
}

export function createLegacyOperatorRuntime(
  adapter: LegacyOperatorAdapter,
  networks: NetworkConfig[]
): RoleManagerRuntime {
  const accessControl = createLegacyAccessControlCapability(adapter);
  const dispose = () => {
    accessControl.dispose();
  };

  return {
    networkConfig: adapter.networkConfig,
    addressing: {
      isValidAddress: bindMethod(adapter, 'isValidAddress'),
    },
    explorer: {
      getExplorerUrl: bindMethod(adapter, 'getExplorerUrl'),
      getExplorerTxUrl: bindOptionalMethod(adapter, 'getExplorerTxUrl'),
    },
    networkCatalog: {
      getNetworks: () => networks,
    } satisfies NetworkCatalogCapability,
    uiLabels: {
      getUiLabels: () => adapter.getUiLabels() ?? {},
    },
    contractLoading: {
      networkConfig: adapter.networkConfig,
      dispose,
      loadContract: bindMethod(adapter, 'loadContract'),
      loadContractWithMetadata: bindOptionalMethod(adapter, 'loadContractWithMetadata'),
      getContractDefinitionInputs: bindMethod(adapter, 'getContractDefinitionInputs'),
    },
    schema: {
      networkConfig: adapter.networkConfig,
      dispose,
      getWritableFunctions: bindMethod(adapter, 'getWritableFunctions'),
      isViewFunction: bindMethod(adapter, 'isViewFunction'),
      filterAutoQueryableFunctions: bindOptionalMethod(adapter, 'filterAutoQueryableFunctions'),
      getFunctionDecorations: undefined,
    },
    typeMapping: {
      networkConfig: adapter.networkConfig,
      dispose,
      mapParameterTypeToFieldType: bindMethod(adapter, 'mapParameterTypeToFieldType'),
      getCompatibleFieldTypes: bindMethod(adapter, 'getCompatibleFieldTypes'),
      generateDefaultField: bindMethod(adapter, 'generateDefaultField'),
      getTypeMappingInfo: bindMethod(adapter, 'getTypeMappingInfo'),
      getRuntimeFieldBinding: bindOptionalMethod(adapter, 'getRuntimeFieldBinding'),
    },
    query: {
      networkConfig: adapter.networkConfig,
      dispose,
      queryViewFunction: bindMethod(adapter, 'queryViewFunction'),
      formatFunctionResult: bindMethod(adapter, 'formatFunctionResult'),
      getCurrentBlock: bindMethod(adapter, 'getCurrentBlock'),
    },
    execution: {
      networkConfig: adapter.networkConfig,
      dispose,
      formatTransactionData: bindMethod(adapter, 'formatTransactionData'),
      signAndBroadcast: bindMethod(adapter, 'signAndBroadcast'),
      getSupportedExecutionMethods: bindMethod(adapter, 'getSupportedExecutionMethods'),
      validateExecutionConfig: bindMethod(adapter, 'validateExecutionConfig'),
      waitForTransactionConfirmation: bindOptionalMethod(adapter, 'waitForTransactionConfirmation'),
    },
    wallet: {
      networkConfig: adapter.networkConfig,
      dispose,
      supportsWalletConnection: bindMethod(adapter, 'supportsWalletConnection'),
      getAvailableConnectors: bindMethod(adapter, 'getAvailableConnectors'),
      connectWallet: bindMethod(adapter, 'connectWallet'),
      disconnectWallet: bindMethod(adapter, 'disconnectWallet'),
      getWalletConnectionStatus: bindMethod(adapter, 'getWalletConnectionStatus'),
      onWalletConnectionChange: bindOptionalMethod(adapter, 'onWalletConnectionChange'),
    },
    uiKit: {
      networkConfig: adapter.networkConfig,
      dispose,
      configureUiKit: bindOptionalMethod(adapter, 'configureUiKit'),
      getEcosystemReactUiContextProvider: bindOptionalMethod(
        adapter,
        'getEcosystemReactUiContextProvider'
      ),
      getEcosystemReactHooks: bindOptionalMethod(adapter, 'getEcosystemReactHooks'),
      getEcosystemWalletComponents: bindOptionalMethod(adapter, 'getEcosystemWalletComponents'),
      getAvailableUiKits: bindMethod(adapter, 'getAvailableUiKits'),
      getRelayerOptionsComponent: bindOptionalMethod(adapter, 'getRelayerOptionsComponent'),
      getExportableWalletConfigFiles: bindOptionalMethod(adapter, 'getExportableWalletConfigFiles'),
    },
    relayer: {
      networkConfig: adapter.networkConfig,
      dispose,
      getRelayers: bindMethod(adapter, 'getRelayers'),
      getRelayer: bindMethod(adapter, 'getRelayer'),
      getNetworkServiceForms: bindMethod(adapter, 'getNetworkServiceForms'),
      validateNetworkServiceConfig: bindOptionalMethod(adapter, 'validateNetworkServiceConfig'),
      testNetworkServiceConnection: bindOptionalMethod(adapter, 'testNetworkServiceConnection'),
      validateRpcEndpoint: bindOptionalMethod(adapter, 'validateRpcEndpoint'),
      testRpcConnection: bindOptionalMethod(adapter, 'testRpcConnection'),
      validateExplorerConfig: bindOptionalMethod(adapter, 'validateExplorerConfig'),
      testExplorerConnection: bindOptionalMethod(adapter, 'testExplorerConnection'),
      getDefaultServiceConfig: bindMethod(adapter, 'getDefaultServiceConfig'),
    },
    accessControl,
    dispose,
  };
}
