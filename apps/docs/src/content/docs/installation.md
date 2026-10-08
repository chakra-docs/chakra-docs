---
title: Installation
description: Add the packages needed for a Next Pages Router documentation section.
order: 1
tags: [setup]
---

Add Chakra Docs to an existing Next.js Pages Router application. Your application owns Next.js, React, React DOM, and Chakra UI; install the documentation packages for the features you use.

## Install

For a filesystem-backed documentation section with server search:

```bash
npm install @chakra-docs/core @chakra-docs/chakra @chakra-docs/next @chakra-docs/search @chakra-docs/source-filesystem @chakra-ui/react @emotion/react
```

For Pagefind indexing, add the optional search adapter too.

```bash
npm install @chakra-docs/search-pagefind
```

Using pnpm, Yarn, or Bun? Use that package manager's `add` command with the same package names. In a monorepo, run the command in the application workspace or select it with your package manager's workspace filter.

## App provider

Wrap the Pages Router app with Chakra and Chakra Docs providers in `_app.tsx`. Include the Chakra Docs theme configuration so its component recipes are available. The host app owns the Chakra system, theme, and link adapter.

```tsx
import type { AppProps } from 'next/app';
import { ChakraProvider, createSystem, defaultConfig } from '@chakra-ui/react';
import { DocsProvider } from '@chakra-docs/chakra';
import { chakraDocsThemeConfig } from '@chakra-docs/chakra/theme';
import { NextLink } from '@chakra-docs/next/link';

const system = createSystem(defaultConfig, chakraDocsThemeConfig);

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider value={system}>
      <DocsProvider config={{ linkComponent: NextLink }}>
        <Component {...pageProps} />
      </DocsProvider>
    </ChakraProvider>
  );
}
```

## Project structure

This repository keeps the documentation content near the Pages Router app:

```txt
apps/docs/
  src/content/docs/
    _meta.json
    index.md
    configuration.md
    pages-router.md
  src/pages/docs/[[...slug]].tsx
  src/pages/api/docs/search.ts
  src/docs/manifest.ts
```

That location is a choice made by the host app. Point Chakra Docs at your own content directory using the [discovery configuration](/docs/configuration), then connect the [Pages Router route](/docs/pages-router).
