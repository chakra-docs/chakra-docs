import path from 'node:path';
import type { DocsManifest } from '@chakra-docs/core';
import {
  buildFilesystemManifest,
  defineDocsDiscoveryConfig,
} from '@chakra-docs/source-filesystem';

const appRoot = getAppRoot();

export const docsDiscoveryConfig = defineDocsDiscoveryConfig({
  rootDir: appRoot,
  collections: [
    {
      id: 'docs',
      name: 'Latest',
      contentPath: 'src/content/docs',
      basePath: '/docs',
    },
  ],
});

let manifestPromise: Promise<DocsManifest> | undefined;

export function getDocsManifest() {
  manifestPromise ??= buildFilesystemManifest({ config: docsDiscoveryConfig });
  return manifestPromise;
}

function getAppRoot() {
  const cwd = process.cwd();
  const docsRoot = path.join('apps', 'docs');

  if (cwd.endsWith(docsRoot)) {
    return cwd;
  }

  return path.join(cwd, docsRoot);
}
