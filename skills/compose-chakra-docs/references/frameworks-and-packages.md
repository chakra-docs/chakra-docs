# Frameworks and packages

Choose the smallest package set that matches the host. Check the installed version's exports before using an API.

## Package roles

- `@chakra-docs/core`: framework-neutral documents, manifests, navigation, and machine-readable document helpers.
- `@chakra-docs/chakra`: Chakra UI layout, navigation, search UI, article controls, feedback, and content primitives.
- `@chakra-docs/source-filesystem`: server-only Markdown/MDX discovery and manifest construction.
- `@chakra-docs/source-git`: remote Git content synchronization.
- `@chakra-docs/next`: App Router, Pages Router, link, search-handler, and machine-readable route adapters.
- `@chakra-docs/astro`: Astro static-path integration.
- `@chakra-docs/react-router`: React Router and Remix route helpers.
- `@chakra-docs/search`: framework-neutral search engine, provider contract, and HTTP client.
- `@chakra-docs/search-pagefind`: Pagefind record generation for static deployments.
- `@chakra-docs/feed`: RSS, Atom, and JSON Feed output.

## Filesystem manifest

Keep this module on the server. Cache the promise so one warm process does not repeatedly parse the content tree.

```ts
import type { DocsManifest } from '@chakra-docs/core';
import {
  buildFilesystemManifest,
  defineDocsDiscoveryConfig,
} from '@chakra-docs/source-filesystem';

const config = defineDocsDiscoveryConfig({
  rootDir: process.cwd(),
  collections: [
    {
      id: 'docs',
      name: 'Latest',
      contentPath: 'content/docs',
      basePath: '/docs',
    },
  ],
});

let manifestPromise: Promise<DocsManifest> | undefined;

export function getDocsManifest() {
  manifestPromise ??= buildFilesystemManifest({ config });
  return manifestPromise;
}
```

Use `_meta.json` for navigation ordering, labels, hidden entries, and badges. Use frontmatter for page title, description, order, draft/hidden state, date, and tags.

## Next.js

For App Router, use `createGenerateStaticParams` and `getAppRouterDoc` from `@chakra-docs/next/app`. For Pages Router, use `createGetStaticPaths`, `createPagesRouterDocProps`, and `serializeNextProps` from `@chakra-docs/next/pages`.

Provide `DocsLink` from `@chakra-docs/next/link` to `DocsProvider` so internal docs links retain client navigation.

Do not serialize the complete search corpus into every page by default. Use a server search handler for larger sites, or explicitly opt into scoped/local search for small sites.

## Search and machine-readable routes

- Build one `createDocsSearchEngine(manifest.search)` and adapt it with the router-specific search handler.
- Add clean page Markdown responses when copy/share or agent consumption matters.
- Publish `llms.txt` and optionally `llms-full.txt` from the same manifest.
- Advertise Markdown and discovery resources with the provided metadata or link-header helpers.
- Map rewrites with the handler's route-mapping option when the physical endpoint differs from the public `.md` URL.

## Other routers

Use the dedicated Astro or React Router adapter when its installed API covers the route. Otherwise, consume `DocsManifest` directly: resolve a route to a page, pass its collection navigation and headings into the Chakra layer, and let the host router render not-found states and links.
