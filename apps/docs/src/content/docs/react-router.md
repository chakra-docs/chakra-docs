---
title: React Router
description: Connect manifest pages to React Router or Remix-style applications.
order: 4
tags: [react-router, routing]
---

`@chakra-docs/react-router` turns manifest pages into route objects. Your app
continues to own router creation, loaders, rendering, and error boundaries.

## Install

```bash
npm install @chakra-docs/react-router react-router react react-dom
```

The adapter supports React Router 7 and 8. The router's own React requirements
also apply; check the installed router's peer requirements. Add
`@chakra-docs/core` when constructing a manifest directly, or use
[filesystem discovery](/docs/configuration) or [generated manifests](/docs/cli).

## Connect your manifest

After generating `.chakra-docs/generated/index.ts`, create routes in the app:

```tsx
import { createBrowserRouter, RouterProvider } from 'react-router';
import { createDocsRoutes } from '@chakra-docs/react-router';
import { docsManifest } from './.chakra-docs/generated';

const router = createBrowserRouter(
  createDocsRoutes(docsManifest).map((route) => {
    const page = docsManifest.byRoute[route.path];
    return {
      ...route,
      element: (
        <article>
          <h1>{page.title}</h1>
        </article>
      ),
    };
  }),
);

export function App() {
  return <RouterProvider router={router} />;
}
```

This example renders titles. Compose the [Chakra Docs UI](/docs/components) or
your own renderer for page bodies, navigation, and a table of contents. Create
the browser router once in client code; SSR and Remix loaders should keep their
framework's server routing conventions instead.

## Page identity and visibility

Every generated route has a stable `id`, `path`, and `handle.docsPageId`. Use
the handle when resolving page data in loaders or matched routes. Draft and
hidden pages are excluded unless you opt into them for a private preview.
Encoded manifest segments remain literal route segments rather than unintended
router parameters or wildcards.

See the [adapter API](https://github.com/chakra-docs/chakra-docs/tree/main/packages/react-router)
for filtering and route options.
