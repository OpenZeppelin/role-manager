import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  // Disable DTS generation for this placeholder package to avoid build hanging
  // Re-enable when actual exports are added
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
});
