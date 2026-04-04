import type { ExecutionConfig } from '@openzeppelin/ui-types';

/** Default execution config for EOA-based transactions. */
export const DEFAULT_EXECUTION_CONFIG: ExecutionConfig = { method: 'eoa', allowAny: true };
