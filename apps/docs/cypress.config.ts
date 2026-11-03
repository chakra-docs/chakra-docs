import { nxE2EPreset } from '@nx/cypress/plugins/cypress-preset';
import { defineConfig } from 'cypress';
import { createJiti } from 'jiti';

const preset = nxE2EPreset(__filename, {
  cypressDir: 'cypress',
  webServerCommands: {
    // `docs:e2e` builds first, so this timeout covers server startup only.
    default: 'nx run docs:start',
  },
  webServerConfig: {
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

export default defineConfig({
  allowCypressEnv: false,
  e2e: {
    ...preset,
    async setupNodeEvents(on, config) {
      on('task', {
        async publicDocsRoutes() {
          const { getDocsManifest } = await createJiti(__filename).import<{
            getDocsManifest: () => Promise<{
              sitemap: readonly { url: string }[];
            }>;
          }>('./src/docs/manifest.ts');
          const manifest = await getDocsManifest();
          return manifest.sitemap.map(({ url }) => url);
        },
      });
      return (await preset.setupNodeEvents?.(on, config)) ?? config;
    },
    baseUrl: 'http://localhost:3000',
    defaultCommandTimeout: 10_000,
    retries: {
      openMode: 0,
      runMode: 2,
    },
  },
});
