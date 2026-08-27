---
title: Machine-readable docs
description: Publish Markdown pages and discovery files for people, agents, and LLM tools.
order: 6
tags: [next, markdown, llms]
---

`@chakra-docs/core` creates deterministic Markdown from a `DocsPage` and generates both concise `llms.txt` indexes and expanded `llms-full.txt` documents from a manifest. Draft and hidden pages are excluded by default.

```ts
import {
  createDocsLlmsFullText,
  createDocsLlmsText,
  createDocsMarkdown,
} from '@chakra-docs/core';

const markdown = createDocsMarkdown(page);
const index = createDocsLlmsText(manifest, {
  title: 'Example Docs',
  description: 'Documentation for Example.',
  siteUrl: 'https://example.com',
});
const complete = createDocsLlmsFullText(manifest, {
  title: 'Example Docs',
  siteUrl: 'https://example.com',
});
```

Use the `body` option when an MDX pipeline can provide a cleaner Markdown representation than the source stored on the page.

## Page metadata

`@chakra-docs/next/documents` creates canonical and Markdown alternate metadata for App Router pages. The link descriptor helper can be rendered through `next/head` in a Pages Router site.

```tsx
import {
  createDocsDiscoveryLinkHeader,
  createDocsPageLinkDescriptors,
  createDocsPageMetadata,
} from '@chakra-docs/next/documents';

export function generateMetadata() {
  return createDocsPageMetadata(page, {
    llmsUrl: '/llms.txt',
    siteUrl: 'https://example.com',
  });
}

const links = createDocsPageLinkDescriptors(page, {
  llmsUrl: '/llms.txt',
  siteUrl: 'https://example.com',
});

const linkHeader = createDocsDiscoveryLinkHeader(page, {
  llmsUrl: '/llms.txt',
});
```

The metadata advertises the page's `.md` representation using `rel="alternate"` and `type="text/markdown"`. When `llmsUrl` is provided, the HTTP Link header also advertises the discovery document with `rel="describedby"`.

## App Router handlers

Route handlers use Fetch `Request` and `Response` objects.

```ts
import {
  createAppRouterLlmsHandler,
  createAppRouterMarkdownHandler,
} from '@chakra-docs/next/documents';

export const GET = createAppRouterMarkdownHandler({ manifest });
export const HEAD = GET;

export const getLlms = createAppRouterLlmsHandler({
  manifest,
  title: 'Example Docs',
  siteUrl: 'https://example.com',
});
```

When the physical handler route differs from the public `.md` URL, use a Next rewrite and `appRoute` to map the rewritten request back to its docs route.

```ts
const markdownHandler = createAppRouterMarkdownHandler({
  manifest,
  appRoute: (request) =>
    new URL(request.url).pathname.replace('/docs-markdown/', '/docs/'),
});
```

## Pages Router handlers

Pages Router handlers relay the same status, content type, cache policy, and body through `NextApiResponse`.

```ts
import {
  createPagesRouterLlmsHandler,
  createPagesRouterMarkdownHandler,
} from '@chakra-docs/next/documents';

export default createPagesRouterMarkdownHandler({ manifest });

export const llmsHandler = createPagesRouterLlmsHandler({
  manifest,
  title: 'Example Docs',
  siteUrl: 'https://example.com',
});
```

The Markdown handler reads `route` or `slug` query values by default, which makes it suitable for a rewrite from `/docs/:path*.md` to an API route. Supply `pagesRoute` for a different routing contract. Pass `full: true` to either LLM handler factory for `llms-full.txt` output.
