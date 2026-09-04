---
title: Search
description: Search on the server, in the browser, or with a static Pagefind index.
order: 5
tags: [search]
---

Every manifest includes a `search` array. The records are created from published pages and their headings. Page records link to the page route, and heading records link to the matching `#heading-id` anchor.

## Server search

This demo keeps the corpus on the server. `@chakra-docs/search` builds a reusable in-memory index, `@chakra-docs/next/search` exposes it through a Pages Router API route, and the browser loads only a bounded list of compact results.

```ts
// pages/api/docs/search.ts
import {
  type DocsSearchEngine,
  type DocsSearchProvider,
} from '@chakra-docs/search';
import { createPagesRouterSearchHandler } from '@chakra-docs/next/search';
import { createMiniSearchEngine } from '@chakra-docs/search/minisearch';

let enginePromise: Promise<DocsSearchEngine> | undefined;

const search: DocsSearchProvider = async (query) => {
  enginePromise ??= getDocsManifest().then((manifest) =>
    createMiniSearchEngine(manifest.search, {
      synonyms: [
        ['a11y', 'accessibility'],
        ['js', 'javascript'],
        ['ssr', 'server rendering', 'server-side rendering'],
      ],
    }),
  );
  return (await enginePromise).search(query);
};

export default createPagesRouterSearchHandler(search);
```

Create the browser provider once. Relative endpoints are resolved only when a search runs, so this is safe during server rendering.

```tsx
import { createHttpSearchProvider } from '@chakra-docs/search/client';

const searchProvider = createHttpSearchProvider('/api/docs/search');

<DocsSearch searchProvider={searchProvider} />;
```

The endpoint accepts `q`, repeated `collection` parameters, `limit`, and `popularLimit`. It validates and caps inputs before searching. Results omit the full searchable `text` and `headings`, which keeps API responses and hydrated client state small.

Create the engine once per warm Next process or as a singleton Nest provider. Rate limiting and authentication belong at the application or edge layer. For private documentation, apply authorization and collection scope before ranking and limiting results.

The MiniSearch adapter searches weighted title, section, tag, alias,
description, and body fields. It enables last-term prefix matching, guards
short terms from fuzzy expansion, favors exact titles, and limits repetitive
heading results from the same page. Importing it from the focused
`@chakra-docs/search/minisearch` entry point keeps the implementation out of
HTTP-only browser bundles.

Pages can add search-specific metadata without changing their visible title or
body:

```yaml
---
title: Accessibility
aliases: [a11y, inclusive UI]
searchPriority: 5
---
```

`searchPriority` is bounded by the engine. It adjusts otherwise relevant
results and the ordering of popular pages; it cannot make an unrelated record
match.

## Local search

Small or static-only sites can keep the existing browser mode. It uses the same engine and ranking behavior without an HTTP endpoint.

```tsx
<DocsSearch records={manifest.search} />
```

## Collection scoping

`DocsSearch` can scope records to one collection or a set of collections. This lets a version selector drive search when versions are represented as collections.

```tsx
<DocsVersionSelect
  includeAll
  labelHidden
  onValueChange={setCollectionId}
  options={collectionOptions}
  value={collectionId}
/>

<DocsSearch
  collectionId={collectionId || undefined}
  onNavigate={(href) => router.push(href)}
  searchProvider={searchProvider}
/>
```

## Keyboard shortcut

The demo search listens for `Command+K` and `Ctrl+K`. When the dialog opens, the input receives focus. Arrow keys move through results and Enter opens the active result.

Heading results use the same route contract as page results, so selecting one can deep-link directly to a section such as `/docs/components#docslayout`.

## Search record shape

Each source record has enough data to index a page or section without asking the renderer to parse the page again.

```ts
interface DocsSearchRecord {
  id: string;
  kind?: 'page' | 'heading';
  pageId?: string;
  collectionId?: string;
  sourceId?: string;
  route: string;
  title: string;
  pageTitle?: string;
  sectionTitle?: string;
  headingId?: string;
  headingLevel?: number;
  description?: string;
  headings: DocsHeading[];
  text: string;
  tags?: string[];
  aliases?: string[];
  searchPriority?: number;
}
```

Heading IDs are deduped as content is read, so repeated headings produce stable anchors such as `install`, `install-2`, and `install-3`.

The HTTP response uses `DocsSearchResult`, a compact projection containing navigation and display fields but not `text` or `headings`.

## Pagefind adapter

For production static search, `@chakra-docs/search-pagefind` converts manifest search records into Pagefind document records.

```ts
import { createPagefindDocumentRecords } from '@chakra-docs/search-pagefind';

const pagefindRecords = createPagefindDocumentRecords(manifest.search);
```

Those records can be written into whatever indexing pipeline the host app uses. The adapter appends tags and aliases to Pagefind's indexed content and preserves extended search metadata as strings. Chakra Docs does not force the site to use Pagefind; it provides a manifest-level search contract and an optional adapter.

## Drafts and hidden pages

Search records are built from published pages. Draft and hidden pages are excluded by default, matching static paths and navigation behavior.
