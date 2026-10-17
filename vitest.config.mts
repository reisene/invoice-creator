import react from '@vitejs/plugin-react';
import { coverageConfigDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
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
    },
  },
});
