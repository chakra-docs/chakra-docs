# @chakra-docs/react-router

React Router route helpers for Chakra Docs manifests.

This package exposes `createDocsRoutes` for turning a Chakra Docs manifest into route objects with stable `handle.docsPageId` values, suited to React Router and Remix-style apps.

## Install

```bash
npm install @chakra-docs/react-router react-router react react-dom
```

Peer dependencies: `react-router` (>=7 <9), `react` (>=18 <20), and
`react-dom` (>=18 <20). React Router's own peer constraints still apply (for
example, React Router 8 requires a newer React 19 release).

## Usage

```tsx
import { createDocsRoutes } from '@chakra-docs/react-router';
import { docsManifest } from './.chakra-docs/generated';
import { DocsPage } from './docs-page';

const routes = createDocsRoutes(docsManifest).map((route) => ({
  ...route,
  Component: DocsPage,
}));
```

Each route is `{ id, path, handle: { docsPageId } }` — `path` is the page's route (for example `/docs/getting-started`) and `handle.docsPageId` lets loaders and components look the page up in the manifest (for example via `docsManifest.byRoute` or `useMatches()`). Route segments are canonically percent-encoded, so filenames beginning with `:` or equal to `*` remain literal instead of becoming React Router parameters or splats. Already-encoded segments are not double-encoded; malformed encodings and encoded path separators are rejected. Pass an options object to include draft or hidden pages in preview builds:

```ts
createDocsRoutes({ manifest: docsManifest, includeDrafts: true });
```

## API

- `createDocsRoutes(manifest | { manifest, includeDrafts?, includeHidden? })` — map published pages to `DocsRouteObject[]`. Draft and hidden pages are excluded by default.
- `DocsRouteObject`, `DocsRoutesOptions` — result and option types.

## License

MIT
