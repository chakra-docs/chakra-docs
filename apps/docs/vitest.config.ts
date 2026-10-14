import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: __dirname,
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    name: 'docs-analytics',
    server: { deps: { inline: ['next-meta'] } },
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'https://chakra-docs.dev' } },
    include: [
      'src/components/analytics.spec.ts',
      'src/components/mobile-navigation.spec.tsx',
      'src/components/site-metadata.spec.tsx',
    ],
  },
});
