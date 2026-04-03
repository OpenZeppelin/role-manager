import type { OperatorEcosystemRuntime, RelayerCapability } from '@openzeppelin/ui-types';

export interface RoleManagerRuntime extends OperatorEcosystemRuntime {
  relayer: RelayerCapability;
}
