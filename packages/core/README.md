# @chakra-docs/core

Framework-free document model and manifest helpers for Chakra Docs.

This package owns the document model, collection manifest shape, repository/source interfaces, and query helpers used by UI packages, framework adapters, and discovery tooling. It does not import React, Chakra, filesystem APIs, framework packages, search indexers, or Git helpers, so it is safe to use anywhere — server, client, or build scripts.

## Install

```bash
npm install @chakra-docs/core
```

No peer dependencies.

## Usage

Build a `DocsManifest` from one or more collections, then query it with the pure helpers:

```ts
import {
  createDocsManifest,
  getPageByRoute,
  getPageBySlug,
  getPublishedPages,
} from '@chakra-docs/core';

const manifest = createDocsManifest({
  collections: [
    {
      id: 'docs',
      basePath: '/docs',
      pages: [
        {
          id: 'docs:getting-started',
          collectionId: 'docs',
          slug: ['getting-started'],
          path: 'getting-started.mdx',
          route: '/docs/getting-started',
          title: 'Getting started',
          description: 'Install and configure docs.',
          frontmatter: { date: '2026-01-01', tags: ['docs', 'guide'] },
          headings: [{ id: 'install', title: 'Install', level: 2 }],
        },
      ],
      nav: [],
    },
  ],
  config: { siteUrl: 'https://example.com' },
});

const page = getPageByRoute(manifest, '/docs/getting-started');
const samePage = getPageBySlug(manifest, 'docs', ['getting-started']);
const published = getPublishedPages(manifest.pages, { includeDrafts: false });
```

`createDocsManifest` derives `byCollection`, `bySlug`, and `byRoute` indexes plus `search`, `sitemap`, and `feeds` records from the pages in each collection. Draft (`frontmatter.draft`) and hidden (`frontmatter.hidden`) pages are excluded from the derived search, sitemap, and feed outputs. Duplicate collection ids, page ids, slugs, or routes throw, as do pages whose `collectionId` does not match their containing collection.

## API

### Manifest helpers

- `createDocsManifest(options)` — build a `DocsManifest` (indexes, search, sitemap, feeds) from collections and optional `DocsConfig`.
- `getDocsCollection(manifest, collectionId)` — look up a collection by id.
- `getPageBySlug(manifest, collectionId, slug)` — look up a page by slug segments.
- `getPageByRoute(manifest, route)` — look up a page by normalized route.
- `getPagesByCollection(manifest, collectionId)` — all pages in a collection.
- `getPublishedPages(pages, { includeDrafts?, includeHidden? })` — filter out draft/hidden pages.
- `createCollectionOptions(collections)` — `{ id, label }` options for collection/version selectors.
- `createSearchRecords(pages)` — page- and heading-level `DocsSearchRecord[]`.
- `createSitemapEntries(pages, config)` / `createFeedEntries(pages, config)` — sitemap and feed inputs resolved against `config.siteUrl`.
- `createCollectionIndex(collections)` / `createSlugIndex(pages)` / `createRouteIndex(pages)` — lookup indexes (throw on duplicates).
- `stripMarkdown(value)` — strip basic Markdown syntax from a string.

### Slug and route helpers

- `slugToKey(slug)` — join slug segments into an index key.
- `normalizeRoute(route)` — ensure a leading slash and strip trailing slashes.
- `createHeadingId(title)` — slugify a heading title.
- `createHeadingIdGenerator()` — heading id generator that de-duplicates repeats (`install`, `install-2`, ...).

### Types

`DocsPage`, `DocsFrontmatter`, `DocsHeading`, `DocsNavItem`, `DocsCollection`, `DocsManifest`, `DocsSearchRecord`, `DocsSitemapEntry`, `DocsFeedEntry`, `DocsSource`, `DocsConfig`, `DocsRepository`, `DocsDiscoveryConfig`, `DocsCollectionConfig`, `DocsRepositoryConfig` (local, workspace, git, and custom variants), `CreateDocsManifestOptions`, and more.

## License

MIT
