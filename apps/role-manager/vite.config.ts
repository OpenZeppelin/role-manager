import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type PluginOption } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()] as PluginOption[],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
