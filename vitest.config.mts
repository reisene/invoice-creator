import { compile } from '@mdx-js/mdx';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import { coverageConfigDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'test-mdx',
      async transform(source, id) {
        if (!id.endsWith('.mdx')) return;
        return {
          code: String(
            await compile(source, {
              remarkPlugins: [remarkFrontmatter, remarkGfm],
            }),
          ),
          map: null,
        };
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
      'server-only': fileURLToPath(
        new URL(
          './node_modules/next/dist/compiled/server-only/empty.js',
          import.meta.url,
        ),
      ),
    },
    tsconfigPaths: true,
  },
  build: {
    dynamicImportVarsOptions: {
      exclude: ['**/app/help/**'],
    },
  },
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['clover', 'html', 'json', 'cobertura', 'lcov', 'text'],
      include: ['{app,components,lib,utils,types}/**/*.{ts,tsx}'],
      exclude: [
        ...coverageConfigDefaults.exclude, // Zachowaj domyślnie wykluczone pliki
        '.next/**', // Wyklucz pliki kompilacji Next.js
        '*.config.{js,mjs,ts,tsx}',
        'sentry.{edge,server}.config.ts',
        'tsconfig*.json',
        'vercel.ts',
        '**/*.log',
      ],
      thresholds: {
        '**/*.{ts,tsx}': {
          statements: 95,
          lines: 95,
          functions: 95,
          branches: 90,
        },
      },
    },
  },
});
