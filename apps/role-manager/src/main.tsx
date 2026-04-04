import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { appConfigService } from '@openzeppelin/ui-utils';

import './index.css';

import App from './App';

/**
 * Initialize configuration and render the application.
 *
 * AppConfigService must be initialized before rendering to ensure
 * adapters can access configuration (indexer endpoints, RPC overrides, etc.)
 *
 * Configuration sources (priority order, later overrides earlier):
 * 1. app.config.json - Base config (committed, no secrets)
 * 2. Vite env vars - VITE_APP_CFG_* environment variables (.env.local, gitignored)
 *
 * Example env vars:
 * - VITE_APP_CFG_INDEXER_ENDPOINT_STELLAR_TESTNET=https://...?apikey=xxx
 * - VITE_APP_CFG_RPC_ENDPOINT_STELLAR_TESTNET=https://...
 */
/**
 * If VITE_RPC_PROXY_URL is set, auto-populate rpcEndpoints for all known
 * EVM networks using the proxy pattern: <proxyUrl>/<chainId>
 * This routes all RPC traffic through a first-party domain, avoiding
 * ad-blocker and CORS issues with public RPC endpoints.
 */
function injectRpcProxy(): void {
  const proxyUrl = import.meta.env.VITE_RPC_PROXY_URL as string | undefined;
  if (!proxyUrl) return;

  const base = proxyUrl.replace(/\/$/, '');
  const chains: Record<string, number> = {
    'ethereum-mainnet': 1,
    'arbitrum-mainnet': 42161,
    'polygon-mainnet': 137,
    'optimism-mainnet': 10,
    'base-mainnet': 8453,
  };

  for (const [networkId, chainId] of Object.entries(chains)) {
    // Only set if not already configured by user or app.config.json
    const existing = appConfigService.getRpcEndpointOverride(networkId);
    if (!existing) {
      // Use internal setter — rpcEndpoints is a plain object
      const config = (appConfigService as unknown as { config: { rpcEndpoints: Record<string, string> } }).config;
      config.rpcEndpoints[networkId] = `${base}/${chainId}`;
    }
  }
}

async function init(): Promise<void> {
  await appConfigService.initialize([
    { type: 'json', path: '/app.config.json' },
    { type: 'viteEnv', env: import.meta.env },
  ]);

  injectRpcProxy();

  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found');

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

init();
