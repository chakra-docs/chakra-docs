---
title: Configuration
description: Configure the documents directory, base route, metadata file, and manifest builder.
order: 2
tags: [configuration]
---

The documents directory is configured in `apps/docs/src/docs/manifest.ts`. This keeps source discovery server-only and lets Pages Router data functions build the manifest during static generation.

## Discovery config

`defineDocsDiscoveryConfig` describes where content lives and which route it should appear under.

```ts
import {
  buildFilesystemManifest,
  defineDocsDiscoveryConfig,
} from '@chakra-docs/source-filesystem';

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

export function getDocsManifest() {
  return buildFilesystemManifest({ config: docsDiscoveryConfig });
}
```

## Important options

- `rootDir` is the base directory used to resolve collection content paths.
- `collections` lists one or more documentation groups.
- `id` becomes the collection id used in page records and slug indexes.
- `name` is a display label for the collection. When collections represent docs versions, this is the label shown by `DocsVersionSelect`.
- `contentPath` points at the Markdown or MDX files for the collection.
- `basePath` is the public route prefix for the collection.
- `include` and `exclude` can narrow which files are discovered.
- `metaFileNames` can change the metadata file names checked by the filesystem source.
- `defaultDraft` can mark discovered pages as draft by default.

## Metadata file

The filesystem source reads `_meta.json` by default. This file controls nav labels, ordering, hidden pages, and badges.

```json
{
  "index": {
    "title": "Overview",
    "order": 0
  },
  "configuration": {
    "title": "Configuration",
    "order": 2,
    "badge": "Source"
  }
}
```

## Frontmatter

Each Markdown file can override metadata with frontmatter.

```md
---
title: Configuration
description: Configure the documents directory and manifest builder.
order: 2
hidden: false
draft: false
tags: [configuration]
---
```

## Manifest output

The built manifest includes:

- `pages` for all discovered pages.
- `nav` for sidebar navigation.
- `byRoute` for route lookups.
- `bySlug` for collection slug lookups.
- `search` for server search, local client search, or external indexing.
- `sitemap` and `feeds` records for site integrations.

The docs route consumes the manifest for static paths, page props, and navigation. The demo search API consumes the same process-cached manifest without serializing its search corpus into every page.
