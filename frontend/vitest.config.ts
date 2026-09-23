import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default defineConfig(
  mergeConfig(viteConfig, {
    /*
     * VITEST_API_BASE_URL_CONTRACT
     *
     * .env.local deja VITE_API_BASE_URL vacío a propósito para
     * desarrollo same-origin mediante proxy.
     *
     * Los unit tests conservan el contrato histórico de
     * http://localhost:3000.
     */
    define: {
      'import.meta.env.VITE_API_BASE_URL':
        JSON.stringify(
          'http://localhost:3000',
        ),
    },

    test: {
      include: ['src/**/*.test.{ts,tsx}'],
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      globals: true,
      css: true,
      // Evita que una máquina con muchos cores cree un JSDOM por fichero a la
      // vez y convierta tests asíncronos sanos en timeouts por saturación.
      maxWorkers: 4,
    },
  }),
);
