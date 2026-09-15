import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default defineConfig(
  mergeConfig(viteConfig, {
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
