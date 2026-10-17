import eslint from '@eslint/js';
import nextVitals from 'eslint-config-next/core-web-vitals';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'node_modules/**',
    '.agents/**',
    'generated/**',
  ]),

  eslint.configs.recommended,

  ...nextVitals,

  ...tseslint.configs.recommended,

  prettier,
]);
