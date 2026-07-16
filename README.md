# Chakra Docs

**Add a beautiful documentation section to your existing Chakra UI app — without handing your whole site over to a docs framework.**

Most documentation tools want to own your entire site. Chakra Docs takes the opposite approach: a framework-free document model at the core, Chakra UI components on top, and small adapters for your router and content source. You compose exactly the pieces you need, and your app stays yours.

[![CI](https://github.com/ryanhefner/chakra-docs/actions/workflows/ci.yml/badge.svg)](https://github.com/ryanhefner/chakra-docs/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Why Chakra Docs?

- **Composable, not monolithic** — mount docs at `/docs` (or anywhere) inside the app you already have. No site takeover, no separate build.
- **Native Chakra UI** — layout, sidebar, table of contents, search dialog, callouts, and code blocks built from Chakra primitives, themed by your existing system.
- **Bring your own framework** — first-class helpers for Next.js (App and Pages Router), Astro, and React Router / Remix.
- **Content from anywhere** — local Markdown/MDX with frontmatter and `_meta.json` ordering, or content synced from remote Git repositories.
- **Batteries optional** — server search, static Pagefind search, RSS/Atom/JSON feeds, sitemaps, and a CLI for generated manifests. Use them or don't.
- **Typed end to end** — one `DocsManifest` document model shared by every package.

## Quick start (Next.js Pages Router)

```bash
npm install @chakra-docs/core @chakra-docs/source-filesystem @chakra-docs/chakra @chakra-docs/next
```

Describe where your content lives:

```ts
// docs/manifest.ts
import {
  buildFilesystemManifest,
  defineDocsDiscoveryConfig,
} from '@chakra-docs/source-filesystem';

const config = defineDocsDiscoveryConfig({
  rootDir: process.cwd(),
  collections: [
    {
      id: 'docs',
      name: 'Docs',
      contentPath: 'content/docs',
      basePath: '/docs',
    },
  ],
});

export const getDocsManifest = () => buildFilesystemManifest({ config });
```

Render it with a catch-all route:

```tsx
// pages/docs/[[...slug]].tsx
import { DocsArticle, DocsLayout, MarkdownContent } from '@chakra-docs/chakra';
import {
  createGetStaticPaths,
  createPagesRouterDocProps,
  serializeNextProps,
} from '@chakra-docs/next/pages';
import { getDocsManifest } from '../../docs/manifest';

export default function DocsPage({ page, nav }) {
  return (
    <DocsLayout headings={page.headings} nav={nav} page={page}>
      <DocsArticle headings={page.headings} page={page}>
        <MarkdownContent source={page.body ?? ''} />
      </DocsArticle>
    </DocsLayout>
  );
}

export const getStaticPaths = async () =>
  createGetStaticPaths({ manifest: await getDocsManifest() })();

export const getStaticProps = async ({ params }) => {
  const manifest = await getDocsManifest();
  const route = `/docs/${(params?.slug ?? []).join('/')}`;
  const props = createPagesRouterDocProps({ manifest }, route);

  return props ? { props: serializeNextProps(props) } : { notFound: true };
};
```

Drop Markdown or MDX files in `content/docs/` and you have a docs section. The [`apps/docs`](apps/docs) app in this repo is a complete working example.

## Packages

| Package                                                        | Description                                                                              |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [`@chakra-docs/core`](packages/core)                           | Framework-free document model, manifest builders, and query helpers.                     |
| [`@chakra-docs/chakra`](packages/chakra)                       | Chakra UI documentation components: layout, sidebar, TOC, search, callouts, code blocks. |
| [`@chakra-docs/source-filesystem`](packages/source-filesystem) | Server-side filesystem Markdown/MDX source with frontmatter and `_meta.json`.            |
| [`@chakra-docs/source-git`](packages/source-git)               | Sync documentation content from remote Git repositories at pinned refs.                  |
| [`@chakra-docs/cli`](packages/cli)                             | `chakra-docs` CLI: build, dev watch, validate, inspect, and sync.                        |
| [`@chakra-docs/next`](packages/next)                           | Next.js App Router and Pages Router helpers plus a docs-aware `Link`.                    |
| [`@chakra-docs/astro`](packages/astro)                         | Astro `getStaticPaths` helpers.                                                          |
| [`@chakra-docs/react-router`](packages/react-router)           | React Router / Remix route object helpers.                                               |
| [`@chakra-docs/search`](packages/search)                       | Framework-neutral server search, HTTP handlers, and a lightweight remote client.         |
| [`@chakra-docs/search-pagefind`](packages/search-pagefind)     | Pagefind record generation for static search.                                            |
| [`@chakra-docs/feed`](packages/feed)                           | RSS, Atom, and JSON Feed generation.                                                     |

## Development

This repo uses Nx for package orchestration.

The packages are ESM-only and require Node.js 22.22 or newer. Framework peer
ranges are deliberately bounded and are exercised in CI at both the minimum
supported versions and the workspace's current versions. Chakra consumers must
install `@emotion/react` alongside `@chakra-ui/react`.

```bash
npm install
npm run build
npm run test
npm run lint
npm run release:smoke
npm run yalc:publish
```

The project spec lives at [docs/specs/chakra-docs-package-spec.md](docs/specs/chakra-docs-package-spec.md).

## Support

If Chakra Docs is useful to you, consider supporting its development:

- [GitHub Sponsors](https://github.com/sponsors/ryanhefner)
- [Patreon](https://www.patreon.com/ryanhefner)
- [Open Collective](https://opencollective.com/ryanhefner)

## License

[MIT](LICENSE) — Chakra Docs is a community project and is not affiliated with or endorsed by [Chakra UI](https://chakra-ui.com).
