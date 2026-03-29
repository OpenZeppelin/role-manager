import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineOpenZeppelinAdapterViteConfig } from '@openzeppelin/adapters-vite';

import { supportedAdapterEcosystems } from './adapter-ecosystems';

export default defineOpenZeppelinAdapterViteConfig({
  ecosystems: supportedAdapterEcosystems,
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
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      target: 'esnext',
    },
  },
});
