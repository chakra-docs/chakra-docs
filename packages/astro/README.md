# @chakra-docs/astro

Astro static path helpers for Chakra Docs manifests.

Created by [Ryan Hefner](https://www.ryanhefner.com) and [Commune Software](https://commune.software).

This package exposes `createAstroStaticPaths` for turning a Chakra Docs manifest into Astro static paths.

## Install

```bash
npm install @chakra-docs/astro astro react react-dom
```

Peer dependencies: `astro` (>=7.2.8 <8), `react` (>=18 <20), and `react-dom`
(>=18 <20). `@astrojs/react` (>=4 <6) is an optional peer for rendering
`@chakra-docs/chakra` components inside Astro.

## Usage

```astro
---
// src/pages/docs/[...slug].astro
import { createAstroStaticPaths } from '@chakra-docs/astro';
import { docsManifest } from '../../../.chakra-docs/generated';

export function getStaticPaths() {
  return createAstroStaticPaths(docsManifest);
}
---
```

Each path is `{ params: { slug } }`, where `slug` is the joined slug string (`'guides/install'`) or `undefined` for the collection index page. Encoded manifest segments are decoded into Astro parameter values, preventing Astro from double-encoding them; `:` and `*` are ordinary characters in these values, not route patterns. Malformed encodings and encoded path separators are rejected. Pass an options object to include draft or hidden pages in preview builds:

```ts
createAstroStaticPaths({ manifest: docsManifest, includeDrafts: true });
```

By default, slugs are relative to the segment-level base path shared by every collection. Collections at `/docs/v1` and `/docs/v2`, for example, produce `v1/...` and `v2/...` slugs. Pass `basePath` to match a catch-all route mounted elsewhere; every published page must be inside an explicit base path.

## API

- `createAstroStaticPaths(manifest | { manifest, basePath?, includeDrafts?, includeHidden? })` — map published pages to `AstroDocsPath[]` for `getStaticPaths`. Draft and hidden pages are excluded by default.
- `AstroDocsPath`, `AstroDocsPathOptions` — result and option types.

## Help and contributing

See the [project README](https://github.com/chakra-docs/chakra-docs#readme), [open an issue](https://github.com/chakra-docs/chakra-docs/issues), or read the [contribution guidelines](https://github.com/chakra-docs/chakra-docs/blob/main/CONTRIBUTING.md). Report vulnerabilities privately through the [security policy](https://github.com/chakra-docs/chakra-docs/security/policy).

## License

MIT
