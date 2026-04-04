import fs from 'node:fs/promises';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { PluginOption } from 'vite';

import { defineOpenZeppelinAdapterViteConfig } from '@openzeppelin/adapters-vite';

import { supportedAdapterEcosystems } from './adapter-ecosystems';

function copySafeManifest(): PluginOption {
  return {
    name: 'copy-safe-manifest',
    apply: 'build',
    async closeBundle() {
      const source = path.resolve(__dirname, 'public/manifest.json');
      const destination = path.resolve(__dirname, 'dist/manifest.json');

      try {
        await fs.copyFile(source, destination);
      } catch (error) {
        const { code } = error as NodeJS.ErrnoException;
        if (code !== 'ENOENT') {
          throw error;
        }
      }
    },
  };
}

export default defineOpenZeppelinAdapterViteConfig({
  ecosystems: supportedAdapterEcosystems,
  config: {
    plugins: [react(), tailwindcss(), copySafeManifest()],
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
