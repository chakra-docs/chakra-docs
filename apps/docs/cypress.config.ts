import { nxE2EPreset } from '@nx/cypress/plugins/cypress-preset';
import { defineConfig } from 'cypress';
export default defineConfig({
  allowCypressEnv: false,
  e2e: {
    ...nxE2EPreset(__filename, {
      cypressDir: 'cypress',
      webServerCommands: {
        // `docs:e2e` builds first, so this timeout covers server startup only.
        default: 'nx run docs:start',
      },
      webServerConfig: {
        reuseExistingServer: false,
        timeout: 120_000,
      },
    }),
    baseUrl: 'http://localhost:3000',
    defaultCommandTimeout: 10_000,
    retries: {
      openMode: 0,
      runMode: 2,
    },
  },
});
