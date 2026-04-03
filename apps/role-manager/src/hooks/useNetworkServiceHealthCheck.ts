import { useCallback, useEffect, useRef, useState } from 'react';

import type { NetworkConfig } from '@openzeppelin/ui-types';
import {
  filterEnabledServiceForms,
  logger,
  userNetworkServiceConfigService,
} from '@openzeppelin/ui-utils';

import type { RoleManagerRuntime } from '@/core/runtimeAdapter';

export interface ServiceHealthStatus {
  serviceId: string;
  serviceLabel: string;
  isHealthy: boolean;
  error?: string;
  latency?: number;
}

export interface NetworkHealthCheckResult {
  isChecking: boolean;
  hasUnhealthyServices: boolean;
  unhealthyServices: ServiceHealthStatus[];
  allStatuses: ServiceHealthStatus[];
  recheck: () => Promise<void>;
}

/**
 * Proactively tests network services (RPC, indexer, explorer) when a network is selected.
 * Helps users identify service outages before they try to interact with the network.
 *
 * Uses runtime's relayer capability for service forms and connection testing.
 * User overrides from the settings dialog take precedence.
 */
export function useNetworkServiceHealthCheck(
  runtime: RoleManagerRuntime | null,
  networkConfig: NetworkConfig | null
): NetworkHealthCheckResult {
  const [isChecking, setIsChecking] = useState(false);
  const [serviceStatuses, setServiceStatuses] = useState<ServiceHealthStatus[]>([]);
  const checkIdRef = useRef(0);

  const checkServices = useCallback(async () => {
    const currentCheckId = ++checkIdRef.current;

    if (!runtime || !networkConfig || !runtime.relayer.testNetworkServiceConnection) {
      setServiceStatuses([]);
      return;
    }

    const serviceForms = filterEnabledServiceForms(runtime.relayer.getNetworkServiceForms());
    if (!serviceForms || serviceForms.length === 0) {
      setServiceStatuses([]);
      return;
    }

    setIsChecking(true);
    try {
      const testConnection = runtime.relayer.testNetworkServiceConnection.bind(runtime.relayer);

      const statusPromises = serviceForms.map(
        async (serviceForm): Promise<ServiceHealthStatus | null> => {
          try {
            let serviceValues = getUserServiceConfigOverride(networkConfig.id, serviceForm.id);

            if (!serviceValues) {
              serviceValues = runtime.relayer.getDefaultServiceConfig(serviceForm.id);
            }

            if (!serviceValues || Object.keys(serviceValues).length === 0) {
              logger.debug(
                'useNetworkServiceHealthCheck',
                `No configuration for service ${serviceForm.id}, skipping`
              );
              return null;
            }

            const result = await testConnection(serviceForm.id, serviceValues);

            return {
              serviceId: serviceForm.id,
              serviceLabel: serviceForm.label,
              isHealthy: result?.success ?? false,
              error: result?.error,
              latency: result?.latency,
            };
          } catch (error) {
            logger.error(
              'useNetworkServiceHealthCheck',
              `Failed to test service ${serviceForm.id}:`,
              error
            );
            return {
              serviceId: serviceForm.id,
              serviceLabel: serviceForm.label,
              isHealthy: false,
              error: error instanceof Error ? error.message : 'Health check failed',
            };
          }
        }
      );

      const results = await Promise.all(statusPromises);

      if (currentCheckId !== checkIdRef.current) return;

      setServiceStatuses(results.filter((s): s is ServiceHealthStatus => s !== null));
    } finally {
      if (currentCheckId === checkIdRef.current) {
        setIsChecking(false);
      }
    }
  }, [runtime, networkConfig]);

  useEffect(() => {
    void checkServices();
  }, [checkServices]);

  const unhealthyServices = serviceStatuses.filter((s) => !s.isHealthy);

  return {
    isChecking,
    hasUnhealthyServices: unhealthyServices.length > 0,
    unhealthyServices,
    allStatuses: serviceStatuses,
    recheck: checkServices,
  };
}

function getUserServiceConfigOverride(
  networkId: string,
  serviceId: string
): Record<string, unknown> | null {
  const userConfig = userNetworkServiceConfigService.get(networkId, serviceId);
  if (userConfig && typeof userConfig === 'object' && Object.keys(userConfig).length > 0) {
    return userConfig as Record<string, unknown>;
  }
  return null;
}
