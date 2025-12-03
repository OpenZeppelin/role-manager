import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type PluginOption } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()] as PluginOption[],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Polyfills for Node.js globals used by wallet SDKs (e.g., @hot-wallet/sdk, @near-js/crypto)
  // These libraries expect Node.js environment but run in browser
  define: {
    'process.env': {},
    // Map Node's `global` to browser's `globalThis`
    global: 'globalThis',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
