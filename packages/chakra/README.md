# @chakra-docs/chakra

Chakra UI component layer for Chakra Docs.

Created by [Ryan Hefner](https://www.ryanhefner.com) and [Commune Software](https://commune.software).

Chakra-based building blocks for composing documentation pages inside existing Chakra applications: docs layout primitives, sidebar navigation, table of contents, search, version/collection switching, pagination, callouts, Markdown rendering, and code block shells. React and Chakra stay as peer dependencies, and host apps own the Chakra provider, routing, and branding. All components are client components (the package ships with `'use client'`).

## Install

```bash
npm install @chakra-docs/chakra @chakra-ui/react @emotion/react react react-dom
```

Peer dependencies: `@chakra-ui/react` (>=3.36 <4), `@emotion/react` (>=11 <12),
`react` (>=18 <20), and `react-dom` (>=18 <20). Emotion is a direct peer
because Chakra UI requires the host application to provide it.

## Usage

Wrap your docs pages in your app's `ChakraProvider`, add a `DocsProvider` for shared configuration, and compose a page from `DocsLayout`, `DocsArticle`, and friends. Pages, nav, and headings come from a Chakra Docs manifest (built with `@chakra-docs/source-filesystem` or the `@chakra-docs/cli` generated output):

```tsx
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import {
  Callout,
  DocsArticle,
  DocsLayout,
  DocsPagination,
  DocsProvider,
  MarkdownContent,
} from '@chakra-docs/chakra';
import type { DocsManifest, DocsPage } from '@chakra-docs/core';

export function DocsRoutePage(props: {
  manifest: DocsManifest;
  page: DocsPage;
}) {
  const { manifest, page } = props;

  return (
    <ChakraProvider value={defaultSystem}>
      <DocsProvider config={{ labels: { search: 'Search docs' } }}>
        <DocsLayout headings={page.headings} nav={manifest.nav} page={page}>
          <DocsArticle headings={page.headings} page={page}>
            <Callout type="info" title="Note">
              This page is generated from Markdown.
            </Callout>
            <MarkdownContent source={page.body ?? ''} />
            <DocsPagination nav={manifest.nav} page={page} />
          </DocsArticle>
        </DocsLayout>
      </DocsProvider>
    </ChakraProvider>
  );
}
```

Add search and version switching to your site chrome:

```tsx
import { DocsSearch, DocsVersionSelect } from '@chakra-docs/chakra';

<DocsSearch
  records={manifest.search}
  collectionId="docs"
  onNavigate={(href) => router.push(href)}
/>

<DocsVersionSelect
  collections={manifest.collections}
  value={activeCollectionId}
  onValueChange={setActiveCollectionId}
  includeAll
/>
```

To keep the search corpus and ranking work off the client, pass a provider from
`@chakra-docs/search/client` instead of `records`. The component requests
popular results when it opens, debounces typed queries, cancels stale requests,
and sends collection scopes to the server:

```bash
npm install @chakra-docs/search
```

```tsx
import { DocsSearch } from '@chakra-docs/chakra';
import { createHttpSearchProvider } from '@chakra-docs/search/client';

const searchProvider = createHttpSearchProvider('/api/docs/search');

<DocsSearch
  searchProvider={searchProvider}
  collectionIds={['docs']}
  debounceMs={150}
  onNavigate={(href) => router.push(href)}
/>;
```

If both `searchProvider` and `records` are passed, remote search takes
precedence. Keep `records` mode for static deployments that do not have a
search endpoint.

### Configuration

`DocsProvider` accepts a `ChakraDocsConfig` (`config` prop) that is merged down the tree and read via `useDocsConfig()`:

- `linkComponent` — a `DocsLinkComponent` used for internal navigation, including Markdown, sidebar, pagination, and search-result links (for example `DocsLink` from `@chakra-docs/next/link`). External URLs continue to render as ordinary anchors.
- `labels` — `Partial<DocsLabels>` overrides for UI copy (`search`, `searchPlaceholder`, `searchLoading`, `searchError`, `previousPage`, `nextPage`, `onThisPage`, `copyCode`, ...).
- `analytics` — `DocsAnalyticsCallbacks` (`onSearchOpen`, `onSearch`, `onSearchResultSelect`, `onCodeCopy`, `onPackageCommandCopy`).
- `codeBlock.adapter` — a `ChakraDocsCodeBlockAdapter` for syntax highlighting, passed to Chakra's `CodeBlock.AdapterProvider`.
- `layout` — `ChakraDocsLayoutConfig` sticky offsets (`stickyTop`, `sidebarStickyTop`, `tocStickyTop`, `scrollMarginTop`), each accepting responsive Chakra values.

## API

### Components

- `DocsProvider` — merges and provides `ChakraDocsConfig` (labels, link component, analytics, code block adapter, layout offsets) to descendants.
- `DocsLayout` — responsive shell that renders `DocsSidebar` (when `nav` is passed), a content area, and `DocsTableOfContents` (when `headings` is passed). Its content wrapper is a `div` by default so it can safely sit inside an application's existing `main`; standalone pages can opt in with `contentSlotProps={{ as: 'main' }}`. Props: `page`, `nav`, `headings`, `stickyTop`, `scrollMarginTop`, `slotProps`, `contentSlotProps`, `sidebarSlotProps`, `tocSlotProps`, `children`.
- `DocsArticle` — article wrapper that renders the page title and description header. Props: `page`, `slotProps`, `children`.
- `DocsSidebar` — sticky nav list built from `DocsNavItem[]`, highlighting the active route. Props: `nav`, `page`, `stickyTop`, `slotProps`.
- `DocsTableOfContents` — sticky "On this page" list that tracks the active heading on scroll and smooth-scrolls on click. Props: `headings`, `stickyTop`, `scrollMarginTop`, `slotProps`.
- `DocsSearch` — Cmd/Ctrl+K search dialog with keyboard navigation, popular/default results, and collection scoping. Pass `records` for synchronous local search or `searchProvider` for remote search; the provider takes precedence when both are present. Remote mode sends `collectionId`/`collectionIds`, `limit`, and `popularLimit` to the server, loads popular results on open, debounces typed queries (`debounceMs`, default 150 ms), and aborts superseded requests. `onNavigate` handles both unmodified pointer selection and Enter-key activation; modified clicks retain normal browser behavior. Props: `records`, `searchProvider`, `debounceMs`, `collectionId`, `collectionIds`, `limit`, `popularLimit`, `placeholder`, `onNavigate`, `onResultSelect`, plus `slotProps`/`triggerSlotProps`/`inputSlotProps`/`resultSlotProps`.
- `DocsVersionSelect` — labeled native select for switching collections/versions. Props: `collections` or `options`, `value`/`defaultValue`, `onValueChange`, `includeAll`, `allValue`, `allLabel`, `label`, `labelHidden`, plus slot props.
- `DocsPagination` — previous/next links derived from the flattened nav and the current `page.route`. Props: `nav`, `page`.
- `MarkdownContent` — lightweight Markdown renderer (headings with manifest-consistent anchor ids, paragraphs, internal/external links, lists, quotes rendered as `Callout`, and backtick- or tilde-fenced code rendered as `CodeBlock`). Props: `source`, `slotProps`.
- `Callout` — bordered note box. Props: `type` (`'info' | 'warning' | 'success' | 'danger'`, default `'info'`), `title`, `slotProps`, `children`.
- `CodeBlock` — Chakra `CodeBlock`-based code shell with optional title/language header and copy button. Props: `code`, `language`, `title`, `slotProps`, `children`.

### Hooks and helpers

- `useDocsConfig()` — read the merged `ChakraDocsConfig` (with default labels applied).
- `createDocsVersionOptions(collections)` — map collections to `DocsVersionOption[]`.
- `filterSearchRecordsByCollections(records, collectionIds)` — scope search records to a set of collections.

### Types

`ChakraDocsConfig`, `DocsLabels`, `DocsAnalyticsCallbacks`, `DocsLinkProps`, `DocsLinkComponent`, `DocsComponentProps`, `DocsLayoutProps`, `DocsTableOfContentsProps`, `DocsSearchProps`, `DocsVersionSelectProps`, `DocsVersionOption`, `CalloutProps`, `CodeBlockProps`, `MarkdownContentProps`, `ChakraDocsLayoutConfig`, `ChakraDocsStickyTop`, `ChakraDocsCodeBlockConfig`, `ChakraDocsCodeBlockAdapter`, `ChakraDocsCodeBlockHighlighter`, and related code block types.

## Help and contributing

See the [project README](https://github.com/chakra-docs/chakra-docs#readme), [open an issue](https://github.com/chakra-docs/chakra-docs/issues), or read the [contribution guidelines](https://github.com/chakra-docs/chakra-docs/blob/main/CONTRIBUTING.md). Report vulnerabilities privately through the [security policy](https://github.com/chakra-docs/chakra-docs/security/policy).

## License

MIT
