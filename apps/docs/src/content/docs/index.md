---
title: Overview
description: Compose Chakra Docs into an existing Next site without giving up normal pages.
order: 0
tags: [overview]
---

Chakra Docs is built for teams that already have a product site. It gives the documentation section a shared document model, navigation, headings, pagination, search records, and Chakra UI primitives while the host app keeps ownership of the rest of the experience.

## What this example includes

- A standard Next Pages Router landing page at `/`.
- A standard placeholder page at `/showcase`.
- A documentation section mounted at `/docs`.
- Filesystem Markdown discovery configured in the app.
- Static path and page lookup helpers from `@chakra-docs/next/pages`.
- Chakra Docs layout primitives composed inside the host site shell.
- Server-hosted manifest search with compact HTTP results.

## How the pieces fit

The host app owns routing, providers, shell navigation, theme decisions, metadata, and non-docs pages. Chakra Docs owns the documentation contracts: pages, collections, nav items, headings, search records, sitemap records, and feed records.

The docs route is just another Pages Router file:

```tsx
// apps/docs/src/pages/docs/[[...slug]].tsx
<SiteShell
  collectionOptions={collectionOptions}
  initialCollectionId={page.collectionId}
>
  <DocsLayout nav={nav} page={page} headings={page.headings}>
    <DocsArticle page={page}>
      <MarkdownContent source={page.body ?? ''} />
      <DocsPagination nav={nav} page={page} />
    </DocsArticle>
  </DocsLayout>
</SiteShell>
```

## Package roles

- `@chakra-docs/core` defines the manifest shape, page contracts, nav contracts, and route helpers.
- `@chakra-docs/source-filesystem` turns a configured Markdown directory into a docs manifest.
- `@chakra-docs/next` provides Pages Router and App Router helpers for static generation.
- `@chakra-docs/chakra` provides composable Chakra UI documentation primitives.
- `@chakra-docs/search` provides shared local/server ranking plus HTTP and client helpers.
- `@chakra-docs/search-pagefind` converts search records into Pagefind document records when a production search index is needed.

## Start here

Read Configuration next if you want to see how the documents directory is selected. Read Pages Router if you want to see the route-level static generation wiring.
