import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: __dirname,
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    name: 'docs-analytics',
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'https://chakra-docs.dev' } },
    include: ['src/components/analytics.spec.ts'],
  },
});
