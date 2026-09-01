import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default defineConfig(
  mergeConfig(viteConfig, {
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      globals: true,
      css: true,
    },
  }),
);
