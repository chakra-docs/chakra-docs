import { defineConfig } from 'vitest/config';
export default defineConfig({
  root: __dirname,
  test: {
    name: '@chakra-docs/shiki',
    watch: false,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './test-output/vitest/coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts'],
      thresholds: { lines: 90, statements: 90, functions: 90, branches: 80 },
    },
  },
});
