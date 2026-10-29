---
title: Git sources
description: Sync documentation from Git repositories before filesystem discovery.
order: 2
tags: [sources, git]
---

`@chakra-docs/source-git` syncs Git repositories into a managed local cache.
Pair it with `@chakra-docs/source-filesystem` to discover Markdown/MDX files
from those checkouts. Git must be installed in the build environment.

## Install

```bash
npm install @chakra-docs/source-git @chakra-docs/source-filesystem
```

Keep both packages in server or build-time code. The [CLI](/docs/cli) can run
the same sync as part of manifest generation.

## Configure and sync

```ts
import {
  buildFilesystemManifest,
  defineDocsDiscoveryConfig,
} from '@chakra-docs/source-filesystem';
import { syncGitRepositories } from '@chakra-docs/source-git';

const config = defineDocsDiscoveryConfig({
  rootDir: process.cwd(),
  repositories: [
    {
      id: 'chakra-ui',
      type: 'git',
      url: 'https://github.com/chakra-ui/chakra-ui.git',
      ref: 'v3.0.0',
    },
  ],
  collections: [
    {
      id: 'docs',
      repository: 'chakra-ui',
      contentPath: 'apps/www/content',
      basePath: '/docs',
    },
  ],
});

await syncGitRepositories(config);
const manifest = await buildFilesystemManifest({ config });
```

Replace the example URL, ref, and content path with your repository's values.
Use an immutable commit SHA or release tag for reproducible builds. A branch
ref intentionally follows the remote branch on each sync.

## Cache and credential safety

The default cache is `.chakra-docs/git/<repository-id>` under the configured
root. Use only dedicated cache directories: existing unmarked directories are
refused, and destructive Git operations are restricted to caches owned by this
tool. Do not point the cache at a working checkout or a directory containing
files you need to preserve.

Provide private repository credentials through your build environment's Git
authentication, not committed configuration or browser props. Sync before
building the manifest, not on every browser request. See the
[package API and safety contract](https://github.com/chakra-docs/chakra-docs/tree/main/packages/source-git)
for concurrency, path boundaries, and timeouts.
