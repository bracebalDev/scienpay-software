import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import { defineConfig, globalIgnores } from 'eslint/config';

/**
 * Configuración ESLint (flat config) del monorepo Scienpay.
 *
 * Decisión (ADR-008): se usa `typescript-eslint` con el preset `recommended`
 * (sin type-checking explícito) para mantener el lint rápido y estable en CI,
 * y se delega el rigor de tipos a `npm run typecheck`.
 */
export default defineConfig(
  globalIgnores([
    '**/dist/**',
    '**/build/**',
    '**/node_modules/**',
    '**/coverage/**',
    '**/playwright-report/**',
    '**/test-results/**',
    '**/*.d.ts',
  ]),

  js.configs.recommended,
  tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx,js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      // Los nombres con prefijo _ documentan intención de no uso.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      // Permitido en bordes de framework (Nest/Express) donde el tipo es opaco.
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'off',
      eqeqeq: ['error', 'smart'],
    },
  },

  // Backend y contratos: entorno Node.
  {
    files: ['apps/api/**/*.ts', 'packages/**/*.ts', '**/scripts/**/*.{mjs,js,cjs}'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Frontend: entorno navegador + reglas de React Hooks.
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // Solo las reglas clásicas: el preset `recommended` de la v7 incluye las
      // reglas del React Compiler, que exigirían refactorizar la SPA entera y
      // no aportan al criterio de aceptación (ver ADR-008).
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // Tests: Node + globals de test runner.
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'apps/web/e2e/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Prettier al final: desactiva reglas de estilo en conflicto.
  prettier,
);
