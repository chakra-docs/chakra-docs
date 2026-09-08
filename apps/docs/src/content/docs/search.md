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

## Curated opening results

Supply lightweight `DocsSearchResult` objects prepared by your server, build,
or application to recommend pages before someone types:

```tsx
<DocsSearch
  searchProvider={searchProvider}
  defaultResults={featuredPages}
  defaultResultsLabel="New this week"
  popularLimit={6}
/>
```

Curated results appear immediately for an empty query, preserve the supplied
order, and return when the query is cleared. They override the provider's
empty-query response, including when `defaultResults` is an explicit empty
array. Typing uses `searchProvider` or the local `records` normally; curated
metadata is not added to the search index.

The heading defaults to “Recommended.” `popularLimit` defaults to six. Collection
and version scopes filter the list before limiting it; scoped suggestions must
include a matching `collectionId`. Unsafe routes and duplicate IDs are omitted.
Only serialize suggestions the visitor may access—client-side filtering is not
authorization. Your application owns editorial ordering, newest-page selection,
and popularity analytics.

## Prefetching default results

When the provider decides which pages are popular or newly published, warm its
empty-query response before opening the dialog:

```tsx
<DocsSearch
  searchProvider={searchProvider}
  prefetch="mount"
  prefetchStaleTimeMs={60_000}
/>
```

- `prefetch={false}` (the default) keeps the existing fetch-on-open behavior.
- `prefetch="intent"` warms results on trigger hover or keyboard focus.
- `prefetch="mount"` warms results after client mount, including for people
  who open search directly with Command+K or Ctrl+K.

Fresh results and in-flight requests are reused. Stale results remain visible
while refreshing in the background; the refreshed ordering is used the next
time search opens or its query is cleared. This avoids moving the highlighted
result during keyboard navigation. A failed refresh retains usable cached
results; a failed initial prefetch can retry when search opens.

`prefetchStaleTimeMs` defaults to 60,000 milliseconds. Zero makes cached data
immediately stale. Prefetching caches only one empty-query response per
component, does no network work during server rendering, and does not fire
search-open or search analytics. Changing the provider, collection/version
scope, or result limits invalidates the cache and cancels obsolete work;
unmounting aborts pending prefetches. Typed requests retain normal debouncing
and cancellation.

Curated `defaultResults` take precedence and disable empty-query prefetching.
Keep provider function references stable. If authentication or tenant context
changes without changing the provider or collection scope, remount `DocsSearch`
with a context-specific React `key` to discard its cached results. Server-side
authorization must still govern every response.

## Keyboard access

Open search with **Command+K** on macOS or **Ctrl+K** on other platforms, or
focus the Search button and press Enter or Space. The search field receives
focus automatically.

- **Up/Down arrows** highlight results and scroll the active row into view.
- **Enter** opens the highlighted result.
- **Escape** closes search and returns focus to the control used to open it.
- **Tab/Shift+Tab** remain inside the modal; individual results are not extra
  tab stops. Screen readers follow selection through the field's combobox and
  listbox relationships while typing focus stays in the field.
- Text-editing shortcuts, Home/End, and input-method composition retain their
  normal behavior. Loading, error, and empty states have no selectable result.

The dialog fits the available viewport height. Its results pane scrolls
independently, including on short screens. Customize its appearance through
the existing `chakraDocsSearch` slot recipe or per-instance slot props; preserve
the component's roles, IDs, focus handlers, and scroll container when composing
overrides.

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

## Analytics integration

Use `DocsProvider.config.analytics` to connect your own analytics service. No
SDK, network transport, cookies, or analytics storage are installed by Chakra Docs.

```tsx
<DocsProvider
  config={{
    analytics: {
      onSearchOpen: () => track('docs_search_open'),
      onSearchClose: ({ reason }) => track('docs_search_close', { reason }),
      onSearch: (query) => track('docs_search_query', { query }),
      onSearchResults: (event) => track('docs_search_results', { ...event }),
      onSearchError: (event) => track('docs_search_error', { ...event }),
      onSearchResultSelect: (result, context) =>
        track('docs_search_select', { id: result.id, ...context }),
    },
  }}
>
  <DocsSearch
    searchProvider={searchProvider}
    defaultResults={featuredPages}
    analyticsDebounceMs={250}
  />
</DocsProvider>
```

`track` is your application's consent-aware analytics adapter. Existing
one-argument `onSearchResultSelect(result)` handlers remain compatible.

- `onSearchOpen` fires once per opening, including trigger and keyboard activation.
  Repeating Command/Ctrl+K while open does not emit another event.
- `onSearchClose` distinguishes `selection` from `dismiss` (Escape, outside
  interaction, or a close control). Unmount alone is not a dismissal event.
- `onSearchResults` reports the displayed list, including empty results. It
  includes ordered `resultIds`, `resultCount`, trimmed `query`, `collectionIds`,
  `source` (`curated`, `local`, or `remote`), and `mode` (`default` or `query`).
  This is list exposure, **not a claim that every row was visible in the viewport**.
  Arrow movement and equivalent rerenders do not emit duplicate lists; reopening
  does. Cached defaults are reported only when displayed in the open dialog.
- `onSearchResultSelect` adds the same context plus one-based `position` and
  `interaction` (`keyboard` for combobox Enter, `pointer` for handled link clicks).
  Modified/new-tab clicks retain native behavior and do not count as selection
  of the current dialog. Prevented clicks also do not count.
- `onSearchError` reports foreground failure without exposing provider error
  messages. It is separate from a successful empty result set. Aborted requests,
  background prefetches, and background refresh failures emit no events.
- `onSearch` retains lowercase, trimmed query-change reporting. Optional
  `analyticsDebounceMs` coalesces typing independently of request `debounceMs`;
  the default is `0` for compatibility. Clearing, closing, or unmounting cancels
  pending query events. Use `onSearchResults` for settled-result metrics.

Analytics callback failures cannot break navigation or the UI. Catch/report SDK
failures within your adapter if needed. Queries may contain sensitive information;
omit or redact them as appropriate rather than forwarding every field by default.
Callbacks do not fire during SSR or merely because a provider prefetch ran.

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
