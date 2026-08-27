# @chakra-docs/next

Next.js App and Pages Router integration for Chakra Docs documentation sites.

Created by [Ryan Hefner](https://www.ryanhefner.com) and [Commune Software](https://commune.software).

Static params/path helpers, manifest lookups, and a docs-aware link component for both the App Router and the Pages Router. The package does not own your Chakra provider or rendering layer — pair it with `@chakra-docs/chakra` (or your own components) for the UI.

Entry points:

- `@chakra-docs/next/app` — App Router helpers.
- `@chakra-docs/next/pages` — Pages Router helpers.
- `@chakra-docs/next/link` — `next/link`-backed link component.
- `@chakra-docs/next/search` — server search handlers for both routers.
- `@chakra-docs/next/documents` — Markdown, metadata, and LLM discovery handlers.
- `@chakra-docs/next` — re-exports all integration helpers.

## Install

```bash
npm install @chakra-docs/next next react react-dom
```

Peer dependencies: `next` (>=15.5.18 <16 or >=16.2.6 <17), `react` (>=18 <20),
and `react-dom` (>=18 <20). The lower bounds intentionally follow maintained,
security-patched Next.js release lines rather than unsupported Next.js 14.

## Usage

### App Router

```tsx
// app/docs/[[...slug]]/page.tsx
import {
  createGenerateStaticParams,
  getAppRouterDoc,
} from '@chakra-docs/next/app';
import { notFound } from 'next/navigation';
import { getDocsManifest } from '../../../docs/manifest';

export async function generateStaticParams() {
  const manifest = await getDocsManifest();
  return createGenerateStaticParams({ manifest })();
}

export default async function DocsPage(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await props.params;
  const manifest = await getDocsManifest();
  const page = getAppRouterDoc({ manifest }, `/docs/${slug.join('/')}`);

  if (!page) {
    notFound();
  }

  return <h1>{page.title}</h1>;
}
```

### Pages Router

```tsx
// pages/docs/[[...slug]].tsx
import type { GetStaticPaths, GetStaticProps } from 'next';
import {
  createGetStaticPaths,
  createPagesRouterDocProps,
  serializeNextProps,
} from '@chakra-docs/next/pages';
import { getDocsManifest } from '../../docs/manifest';

export const getStaticPaths: GetStaticPaths = async () => {
  const manifest = await getDocsManifest();
  return createGetStaticPaths({ manifest })();
};

export const getStaticProps: GetStaticProps = async (context) => {
  const manifest = await getDocsManifest();
  const slug = Array.isArray(context.params?.slug) ? context.params.slug : [];
  const props = createPagesRouterDocProps(
    { manifest },
    `/docs/${slug.join('/')}`,
  );

  if (!props) {
    return { notFound: true };
  }

  return { props: serializeNextProps(props) };
};
```

`createPagesRouterDocProps` returns `search: []` by default. Embedding the full manifest search corpus in every statically generated page makes aggregate output grow quadratically. If the site intentionally uses client-side manifest search, opt in with `{ manifest, includeSearch: true }`. For larger sites, use `searchRecords: ({ page, manifest }) => ...` to return a page- or collection-scoped subset, or keep search in an external index such as Pagefind. `searchRecords` takes precedence over `includeSearch`.

### Server search

Create the search engine once outside the route handler so warm server processes
reuse its index. App Router handlers use the Fetch API directly:

```ts
// app/api/docs/search/route.ts
import { createDocsSearchEngine } from '@chakra-docs/search';
import { createAppRouterSearchHandler } from '@chakra-docs/next/search';
import { docsManifest } from '../../../../docs/manifest';

const engine = createDocsSearchEngine(docsManifest.search);

export const GET = createAppRouterSearchHandler(engine, {
  cacheControl: 'public, max-age=60, stale-while-revalidate=300',
});
```

The Pages Router adapter relays the same validated response through
`NextApiResponse` and preserves repeated `collection` query parameters:

```ts
// pages/api/docs/search.ts
import { createDocsSearchEngine } from '@chakra-docs/search';
import { createPagesRouterSearchHandler } from '@chakra-docs/next/search';
import { docsManifest } from '../../../docs/manifest';

const engine = createDocsSearchEngine(docsManifest.search);

export default createPagesRouterSearchHandler(engine);
```

For an asynchronously loaded manifest, pass a `DocsSearchProvider` that awaits
a module-scoped engine promise. Both adapters accept the shared query limits and
cache settings from `FetchSearchHandlerOptions`.

### Link component

The link exports are client components (`'use client'`) that wrap `next/link` behind the `DocsLinkComponent` contract, so client-side navigation works inside `@chakra-docs/chakra` components:

```tsx
import { DocsProvider } from '@chakra-docs/chakra';
import { DocsLink } from '@chakra-docs/next/link';

<DocsProvider config={{ linkComponent: DocsLink }}>{children}</DocsProvider>;
```

### Machine-readable documents

`@chakra-docs/next/documents` publishes clean Markdown responses for docs pages and `llms.txt` or `llms-full.txt` responses for a manifest. It also creates App Router metadata, Pages Router link descriptors, and HTTP Link headers that advertise those resources.

```ts
import {
  createAppRouterLlmsHandler,
  createAppRouterMarkdownHandler,
  createDocsPageMetadata,
} from '@chakra-docs/next/documents';

export const GET = createAppRouterMarkdownHandler({ manifest });
export const HEAD = GET;

export const getLlms = createAppRouterLlmsHandler({
  manifest,
  title: 'Example Docs',
  siteUrl: 'https://example.com',
});

export function generateMetadata() {
  return createDocsPageMetadata(page, {
    llmsUrl: '/llms.txt',
    siteUrl: 'https://example.com',
  });
}
```

Use a rewrite when the physical Next route differs from the public `/docs/page.md` URL. `appRoute` and `pagesRoute` can map rewritten requests back to the manifest route. Pages Router equivalents relay the same responses through `NextApiResponse`.

### Drafts and hidden pages

The static params/paths factories and the doc lookups (`getAppRouterDoc`, `getPagesRouterDoc`, `createPagesRouterDocProps`) exclude pages with `frontmatter.draft` or `frontmatter.hidden` unless you pass `includeDrafts: true` / `includeHidden: true` in the options, for example `getAppRouterDoc({ manifest, includeDrafts: true }, route)` for preview builds.

### Route base paths

Static params are relative to the common segment-level base path shared by all collections. A single `/docs` collection therefore keeps the existing `['getting-started']` params, while `/docs/v1` and `/docs/v2` collections produce `['v1', ...]` and `['v2', ...]` params without collisions. Pass `basePath` when the catch-all route starts somewhere else; for example, `basePath: '/'` retains the leading `docs` segment. Every published page must be inside an explicit base path or the factory throws an actionable error.

## API

### `@chakra-docs/next/app`

- `createGenerateStaticParams({ manifest, basePath?, includeDrafts?, includeHidden? })` — returns a `generateStaticParams` function producing `{ slug: string[] }` params for published pages.
- `getAppRouterDoc(options, route)` — look up a `DocsPage` by route; returns `null` for missing, draft, or hidden pages (unless included via options).
- `NextAppDocsOptions` — options type.

### `@chakra-docs/next/pages`

- `createGetStaticPaths({ manifest, basePath?, includeDrafts?, includeHidden? })` — returns a `getStaticPaths` function (`{ paths, fallback: false }`).
- `getPagesRouterDoc(options, route)` — look up a `DocsPage` by route with the same draft/hidden filtering.
- `createPagesRouterDocProps(options, route)` — bundle `{ collectionOptions, nav, page, search }` props for a docs page, or `null` when the page is unavailable. Search defaults to `[]`; pass `includeSearch: true` for the complete manifest corpus or a `searchRecords` resolver for a scoped corpus.
- `serializeNextProps(props)` — JSON round-trip props so they are safe to return from `getStaticProps`.
- `NextPagesDocsOptions`, `NextPagesRouterDocProps`, `NextPagesSearchRecordsContext`, `NextPagesSearchRecordsResolver` — option, prop, and resolver types.

### `@chakra-docs/next/link`

- `NextLink` (also exported as `DocsLink`) — client component wrapping `next/link`, compatible with `DocsLinkComponent` from `@chakra-docs/chakra`.
- `NextDocsLinkProps` — prop type.

### `@chakra-docs/next/search`

- `createAppRouterSearchHandler(search, options?)` — create a Fetch-compatible App Router route handler.
- `createPagesRouterSearchHandler(search, options?)` — create a Pages Router API handler with the same validation, result shape, and cache policy.
- `NextSearch`, `NextSearchHandlerOptions` — accepted engine/provider and handler option types.

### `@chakra-docs/next/documents`

- `createDocsPageMetadata(page, options?)` — create canonical and Markdown alternate Next metadata.
- `createDocsPageLinkDescriptors(page, options?)` — create descriptors suitable for `next/head`.
- `createDocsDiscoveryLinkHeader(page, options?)` — advertise Markdown and `llms.txt` through an HTTP Link header.
- `createAppRouterMarkdownHandler(options)` / `createPagesRouterMarkdownHandler(options)` — serve `.md` page representations.
- `createAppRouterLlmsHandler(options)` / `createPagesRouterLlmsHandler(options)` — serve concise or full LLM discovery documents.

## Help and contributing

See the [project README](https://github.com/chakra-docs/chakra-docs#readme), [open an issue](https://github.com/chakra-docs/chakra-docs/issues), or read the [contribution guidelines](https://github.com/chakra-docs/chakra-docs/blob/main/CONTRIBUTING.md). Report vulnerabilities privately through the [security policy](https://github.com/chakra-docs/chakra-docs/security/policy).

## License

MIT
