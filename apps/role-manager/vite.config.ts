import { createRequire } from 'node:module';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineOpenZeppelinAdapterViteConfig } from '@openzeppelin/adapters-vite';

import { supportedAdapterEcosystems } from './adapter-ecosystems';

// eventemitter3@5 ships an ESM wrapper that default-imports its own CJS build.
// Vite can serve that wrapper without CJS interop, so wallet deps fail with
// "does not provide an export named 'default'". Alias to the CJS entry and force
// pre-bundling so Vite synthesizes a proper default export.
//
// `debug` is intentionally NOT aliased: forcing its resolved entry bypasses the
// package's `browser` field and loads the Node build, which reads
// `process.stderr.fd` in the browser → "Cannot read properties of undefined
// (reading 'fd')". shamefullyHoist (pnpm-workspace.yaml) makes it resolvable so
// Vite honors the browser field natively.
const require = createRequire(import.meta.url);

function resolveWalletTransitiveEntry(specifier: string): string {
  try {
    return require.resolve(specifier);
  } catch {
    const viaWagmiCore = createRequire(require.resolve('@wagmi/core/package.json'));
    return viaWagmiCore.resolve(specifier);
  }
}

const eventemitter3CjsEntry = resolveWalletTransitiveEntry('eventemitter3');

export default defineOpenZeppelinAdapterViteConfig({
  ecosystems: supportedAdapterEcosystems,
  config: {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        eventemitter3: eventemitter3CjsEntry,
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
      // WalletConnect / wagmi transitive — see eventemitter3CjsEntry note above.
      include: ['eventemitter3'],
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      target: 'esnext',
    },
  },
});
