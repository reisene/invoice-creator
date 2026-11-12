// Side-effect CSS import placeholder for Vitest tests.
// Vitest resolves .ts before .css, so this file shadows globals.css
// and prevents "Cannot find package" errors in tests that import
// app/layout.tsx or app/global-error.tsx.
