# @chakra-docs/search

Reusable server-side search for Chakra Docs manifests. It keeps the full search
corpus in a warm Next or Nest process and returns only compact display and
navigation fields to the browser.

Created by [Ryan Hefner](https://www.ryanhefner.com) and [Commune Software](https://commune.software).

## Install

```sh
npm install @chakra-docs/search @chakra-docs/core
```

This package is ESM-only and requires Node.js 22.22 or newer.
Nest applications must emit ESM or bundle this package; a CommonJS `require()`
of the published entry point is not supported.

## Create an engine

Build the engine once per process from a generated manifest:

```ts
import { createDocsSearchEngine } from '@chakra-docs/search';
import manifest from './generated/docs-manifest.json' with { type: 'json' };

export const docsSearch = createDocsSearchEngine(manifest.search);

const response = docsSearch.search({
  query: 'installation',
  collectionIds: ['current'],
  limit: 8,
});
```

Results include IDs, labels, routes, descriptions, and tags. The searchable
`text` and `headings` fields never appear in the response.

An empty or whitespace-only query returns the first non-heading page records,
capped by `popularLimit` (six by default). Non-empty queries preserve manifest
order when records have the same score.

The built-in engine has no search dependency and supports normalized substring,
tag, alias, multi-term, and synonym matching. Pass synonym groups when creating
the engine:

```ts
const docsSearch = createDocsSearchEngine(manifest.search, {
  synonyms: [
    ['a11y', 'accessibility'],
    ['ssr', 'server rendering', 'server-side rendering'],
  ],
});
```

## Fuzzy and prefix search

Import the focused MiniSearch adapter when the corpus needs typo tolerance,
prefix matching, weighted fields, duplicate-page limiting, or suggestions.
The focused export keeps MiniSearch out of clients that only use the HTTP
provider.

```ts
import { createMiniSearchEngine } from '@chakra-docs/search/minisearch';

const docsSearch = createMiniSearchEngine(manifest.search, {
  fuzzy: { distance: 0.2, minTermLength: 4 },
  prefix: { enabled: true, lastTermOnly: true, minTermLength: 2 },
  fields: {
    title: 10,
    pageTitle: 7,
    sectionTitle: 7,
    tags: 6,
    aliases: 6,
    description: 3,
    text: 1,
  },
  synonyms: [
    ['js', 'javascript'],
    ['ts', 'typescript'],
  ],
});

docsSearch.search({ query: 'javscript config' });
docsSearch.suggest('instal', 5);
```

Fuzzy matching is disabled for short terms by default, exact titles receive a
ranking bonus, and no more than two results from one page are returned unless
`maxResultsPerPage` is changed. The public adapter types do not expose
MiniSearch implementation types.

## Fetch handler

`@chakra-docs/search/http` exposes a standard Fetch handler suitable for a Next
App Router route or any server with Fetch-compatible requests:

```ts
import { createFetchSearchHandler } from '@chakra-docs/search/http';
import { docsSearch } from './docs-search.js';

export const GET = createFetchSearchHandler(docsSearch, {
  cacheControl: 'public, max-age=60, stale-while-revalidate=300',
});
```

The endpoint accepts `q`, repeated `collection` values, `limit`, and
`popularLimit`. Defaults protect the endpoint with a 128-character query cap,
five collection IDs of up to 128 characters each, and at most 20 results.
Invalid requests return structured JSON errors; non-GET methods return 405.

## HTTP client

Create the provider at module scope. Relative URLs are resolved only when a
search runs, so this is safe during server rendering:

```ts
import { createHttpSearchProvider } from '@chakra-docs/search/client';

export const searchProvider = createHttpSearchProvider('/api/docs/search');

const response = await searchProvider(
  { query: 'theming', collectionIds: ['current'] },
  { signal: abortController.signal },
);
```

The provider forwards cancellation, rejects non-success HTTP responses with a
`DocsSearchHttpError`, and validates successful payloads before returning them.

## Nest

Keep the engine in a singleton provider and call it from a controller. No Nest
runtime dependency is required:

```ts
import { Injectable } from '@nestjs/common';
import {
  createDocsSearchEngine,
  type DocsSearchQuery,
} from '@chakra-docs/search';
import manifest from './generated/docs-manifest.json' with { type: 'json' };

@Injectable()
export class DocsSearchService {
  private readonly engine = createDocsSearchEngine(manifest.search);

  search(query: DocsSearchQuery) {
    return this.engine.search(query);
  }
}
```

Validate HTTP input in the Nest controller or adapt the service with
`createFetchSearchHandler` when the server exposes Fetch-standard routes.

## Help and contributing

See the [project README](https://github.com/chakra-docs/chakra-docs#readme), [open an issue](https://github.com/chakra-docs/chakra-docs/issues), or read the [contribution guidelines](https://github.com/chakra-docs/chakra-docs/blob/main/CONTRIBUTING.md). Report vulnerabilities privately through the [security policy](https://github.com/chakra-docs/chakra-docs/security/policy).

## License

MIT
