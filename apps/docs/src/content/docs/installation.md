---
title: Installation
description: Add the packages needed for a Next Pages Router documentation section.
order: 1
tags: [setup]
---

The demo app is an npm workspace package named `docs`. It declares the local Chakra Docs packages it imports and keeps Next, React, and Chakra UI as application dependencies.

## Workspace dependencies

Use the package manager to link local packages into the app workspace.

```bash
npm install @chakra-docs/core @chakra-docs/chakra @chakra-docs/next @chakra-docs/search @chakra-docs/source-filesystem @chakra-ui/react --workspace docs
```

For Pagefind indexing, add the optional search adapter too.

```bash
npm install @chakra-docs/search-pagefind --workspace docs
```

## App provider

Wrap the Pages Router app with Chakra and Chakra Docs providers in `_app.tsx`. The host app owns the Chakra system, theme, and link adapter.

```tsx
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { DocsProvider } from '@chakra-docs/chakra';
import { NextLink } from '@chakra-docs/next';

export default function App({ Component, pageProps }) {
  return (
    <ChakraProvider value={defaultSystem}>
      <DocsProvider config={{ linkComponent: NextLink }}>
        <Component {...pageProps} />
      </DocsProvider>
    </ChakraProvider>
  );
}
```

## Project structure

This app keeps the documentation content near the Pages Router app:

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

That location is a choice made by the host app. A real product site can point Chakra Docs at a package docs folder, a generated directory, or a repository-backed source.
