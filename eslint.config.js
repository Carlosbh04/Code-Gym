import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

/**
 * Configuración mínima y profesional para React + TypeScript + Vite.
 *
 * Se apoya en los conjuntos oficiales recomendados en lugar de acumular reglas
 * sueltas: JS recomendado, typescript-eslint recomendado, las reglas de hooks
 * de React y la detección de problemas de Fast Refresh de Vite.
 *
 * El tipado fuerte ya lo cubre `tsc -b` con strict + noUnusedLocals +
 * noUnusedParameters, así que aquí no se duplican reglas con coste de
 * type-checking.
 */
export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'playwright-report/**'],
  },

  // Código de la aplicación (navegador)
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.browser,
    },
  },

  // Configuración de build y herramientas (Node)
  {
    files: ['*.config.js', '*.config.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node,
    },
  },
);
