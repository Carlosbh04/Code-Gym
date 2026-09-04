import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default defineConfig(
  mergeConfig(viteConfig, {
    test: {
      include: ['src/**/*.test.{ts,tsx}'],
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      globals: true,
      css: true,
    },
  }),
);
