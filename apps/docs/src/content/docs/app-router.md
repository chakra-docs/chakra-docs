---
title: App Router
description: Compose a Next.js App Router docs route with server-only discovery and a client UI boundary.
order: 3
tags: [next, routing]
---

`@chakra-docs/next/app` looks up manifest pages and creates static parameters.
Your app owns providers, layout, metadata, and rendering. The following setup
assumes an existing Next.js App Router application with a root layout.

## Install

```bash
npm install @chakra-docs/core @chakra-docs/chakra @chakra-docs/next @chakra-docs/source-filesystem @chakra-ui/react @emotion/react
```

Keep Next.js on a maintained, patched release. The adapter's peer range describes
API compatibility; it is not a guarantee that every older release is secure.

## Load content on the server

Create `content/docs/index.md`, then add `src/docs/manifest.ts`:

```ts
import {
  buildFilesystemManifest,
  defineDocsDiscoveryConfig,
} from '@chakra-docs/source-filesystem';

const config = defineDocsDiscoveryConfig({
  rootDir: process.cwd(),
  collections: [
    {
      id: 'docs',
      contentPath: 'content/docs',
      basePath: '/docs',
    },
  ],
});

let manifest: ReturnType<typeof buildFilesystemManifest> | undefined;
export const getDocsManifest = () =>
  (manifest ??= buildFilesystemManifest({ config }));
```

Do not import filesystem discovery into client components. The cached promise
is useful for build-time or immutable production content; invalidate or reload
it if your application edits content while the process is running.

## Create the client UI boundary

Add `src/app/docs/docs-content.tsx`. If your app already has a Chakra provider,
compose `chakraDocsThemeConfig` into that existing system and reuse the provider
instead of adding another one.

```tsx
'use client';

import type { DocsNavItem, DocsPage } from '@chakra-docs/core';
import {
  DocsArticle,
  DocsLayout,
  DocsProvider,
  MarkdownContent,
} from '@chakra-docs/chakra';
import { chakraDocsThemeConfig } from '@chakra-docs/chakra/theme';
import { ChakraProvider, createSystem, defaultConfig } from '@chakra-ui/react';

const system = createSystem(defaultConfig, chakraDocsThemeConfig);

export function DocsContent({
  page,
  nav,
}: {
  page: DocsPage;
  nav: DocsNavItem[];
}) {
  return (
    <ChakraProvider value={system}>
      <DocsProvider>
        <DocsLayout nav={nav} page={page} headings={page.headings}>
          <DocsArticle page={page} headings={page.headings}>
            <MarkdownContent source={page.body ?? ''} />
          </DocsArticle>
        </DocsLayout>
      </DocsProvider>
    </ChakraProvider>
  );
}
```

The UI boundary receives only the selected page and navigation, not the full
manifest or search corpus. See [components](/docs/components) for link adapters,
page actions, and theme overrides.

## Add the server route

Create `src/app/docs/[[...slug]]/page.tsx`:

```tsx
import {
  createGenerateStaticParams,
  getAppRouterDoc,
} from '@chakra-docs/next/app';
import { notFound } from 'next/navigation';
import { getDocsManifest } from '../../../docs/manifest';
import { DocsContent } from '../docs-content';

export async function generateStaticParams() {
  return createGenerateStaticParams({ manifest: await getDocsManifest() })();
}

export default async function DocsPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const manifest = await getDocsManifest();
  const page = getAppRouterDoc({ manifest }, `/docs/${slug.join('/')}`);
  if (!page) notFound();
  return <DocsContent page={page} nav={manifest.nav} />;
}
```

Next.js 15 and newer supply route parameters as a promise. Draft and hidden
pages are excluded by default. Keep search server-side when the content corpus
is large; the [search guide](/docs/search) and
[Next adapter API](https://github.com/chakra-docs/chakra-docs/tree/main/packages/next)
show the App Router HTTP handler. Use Next's Metadata API for canonical and
social tags, and add [machine-readable resources](/docs/machine-readable)
separately. None of these helpers take over the rest of your application.
