import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

const analysisPlugins =
  process.env.VITE_BUNDLE_ANALYSIS === 'true'
    ? [
        visualizer({
          filename: 'bundle-stats.html',
          gzipSize: true,
          brotliSize: true,
        }),
      ]
    : [];

export default defineConfig({
  plugins: [
    react(),
    ...analysisPlugins,
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
