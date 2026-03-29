import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineOpenZeppelinAdapterVitestConfig } from '@openzeppelin/adapters-vite';

import { supportedAdapterEcosystems } from './adapter-ecosystems';

export default defineOpenZeppelinAdapterVitestConfig({
  ecosystems: supportedAdapterEcosystems,
  importMetaUrl: import.meta.url,
  config: {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      'process.env': {},
      global: 'globalThis',
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
      },
    },
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: ['../../test/setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      server: {
        deps: {
          inline: ['@openzeppelin/ui-components', '@uiw/react-textarea-code-editor'],
        },
      },
    },
  },
});
