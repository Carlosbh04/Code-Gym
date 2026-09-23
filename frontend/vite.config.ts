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

const backendProxy = {
  target: 'http://192.168.0.10:3000',
  changeOrigin: true,
};

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

  server: {
    proxy: {
      '/auth': backendProxy,
      '/content': backendProxy,
      '/dashboard': backendProxy,
      '/history': backendProxy,
      '/training': backendProxy,
      '/learning': backendProxy,
    },
  },

  /*
   * `vite preview` debe servir las rutas de la SPA.
   *
   * Las pruebas E2E ya compilan el frontend con
   * VITE_API_BASE_URL=http://127.0.0.1:3100, por lo
   * que no necesitan heredar los proxies del servidor
   * de desarrollo.
   *
   * Sin esta anulación, /dashboard puede ser tratado
   * como endpoint proxy en lugar de deep-link de
   * React Router.
   */
  preview: {
    proxy: {},
  },
});
