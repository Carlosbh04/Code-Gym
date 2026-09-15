import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'src/generated/prisma/**',
      '.manual-backup-*/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='$queryRawUnsafe']",
          message: 'Use a parameterized Prisma tagged template; raw unsafe queries are prohibited.',
        },
        {
          selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='$executeRawUnsafe']",
          message: 'Use a parameterized Prisma tagged template; raw unsafe executions are prohibited.',
        },
      ],
    },
  },
  {
    files: ['**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },
);
