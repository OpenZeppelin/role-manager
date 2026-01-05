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
async function init(): Promise<void> {
  await appConfigService.initialize([
    { type: 'json', path: '/app.config.json' },
    { type: 'viteEnv', env: import.meta.env },
  ]);

  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found');

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

init();
