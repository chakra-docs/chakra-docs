---
title: Feeds
description: Publish RSS, Atom, and JSON Feed artifacts from documentation records.
order: 7
tags: [feeds, discovery]
---

`@chakra-docs/feed` serializes manifest feed records without adding feed
dependencies to the document model or browser UI.

## Install

```bash
npm install @chakra-docs/feed
```

The package has no framework peer dependencies. Use it in a server route or a
build script, not in the client bundle.

## Create artifacts

This complete example generates strings without writing files:

```ts
import { createFeedArtifacts } from '@chakra-docs/feed';

const { rss, atom, json } = createFeedArtifacts(
  [
    {
      id: 'getting-started',
      title: 'Getting started',
      url: '/docs/getting-started',
      date: '2026-10-01',
      description: 'Install and configure the documentation.',
    },
  ],
  {
    title: 'Example documentation',
    siteUrl: 'https://example.com',
    feedUrl: 'https://example.com/feed.xml',
    updated: '2026-10-01T00:00:00.000Z',
  },
);
```

In a real app, pass `docsManifest.feeds` instead of the sample array. Write the
strings to your public directory during the build, or serve them with the
appropriate content types: `application/rss+xml`, `application/atom+xml`, and
`application/feed+json`.

## Dates and public URLs

Entries are sorted newest-first. Set dates on published content; Atom requires
an update time for each entry, so `updated` is the fallback for undated entries.
Malformed dates throw instead of producing invalid feeds. Use a canonical public
`siteUrl` to resolve relative entry URLs. Draft and hidden pages are excluded
from the manifest's derived feed records by default.

See [machine-readable documentation](/docs/machine-readable) for sitemaps,
Markdown, and LLM discovery files, and the
[feed API](https://github.com/chakra-docs/chakra-docs/tree/main/packages/feed)
for the complete serialization contract.
