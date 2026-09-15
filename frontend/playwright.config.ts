import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  workers: 4,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    reducedMotion: 'reduce',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: [
    {
      command: 'NODE_ENV=test PORT=3100 DB_NAME=codegym_test FRONTEND_ORIGINS=http://127.0.0.1:4173 node --import tsx src/server.ts',
      cwd: '../codeGYM-Back',
      url: 'http://127.0.0.1:3100/health/db',
      reuseExistingServer: false,
    },
    {
      // La suite multiproyecto golpea el servidor con varios navegadores en
      // paralelo. Servir el build inmutable evita fallos transitorios al
      // transformar/importar módulos lazy que no pertenecen al producto.
      command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
      env: {
        VITE_API_BASE_URL: 'http://127.0.0.1:3100',
      },
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: false,
    },
  ],
});
