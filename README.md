# Chakra Docs

**Add a beautiful documentation section to your existing Chakra UI app — without handing your whole site over to a docs framework.**

Created by [Ryan Hefner](https://www.ryanhefner.com) and [Commune Software](https://commune.software).

Most documentation tools want to own your entire site. Chakra Docs takes the opposite approach: a framework-free document model at the core, Chakra UI components on top, and small adapters for your router and content source. You compose exactly the pieces you need, and your app stays yours.

[![CI](https://github.com/chakra-docs/chakra-docs/actions/workflows/ci.yml/badge.svg)](https://github.com/chakra-docs/chakra-docs/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Why Chakra Docs?

- **Composable, not monolithic** — mount docs at `/docs` (or anywhere) inside the app you already have. No site takeover, no separate build.
- **Native Chakra UI** — layout, sidebar, table of contents, search dialog, callouts, and code blocks built from Chakra primitives, themed by your existing system.
- **Bring your own framework** — first-class helpers for Next.js (App and Pages Router), Astro, and React Router / Remix.
- **Content from anywhere** — local Markdown/MDX with frontmatter and `_meta.json` ordering, or content synced from remote Git repositories.
- **Batteries optional** — server search, static Pagefind search, RSS/Atom/JSON feeds, sitemaps, and a CLI for generated manifests. Use them or don't.
- **Typed end to end** — one `DocsManifest` document model shared by every package.

## Choose your stack

The document model and content sources are framework-independent. Add the UI and router adapter that match the application you already have:

| Stack                 | Start here                                                                     |
| --------------------- | ------------------------------------------------------------------------------ |
| Next.js App Router    | [`@chakra-docs/next` App Router guide](packages/next#app-router)               |
| Next.js Pages Router  | [`@chakra-docs/next` Pages Router guide](packages/next#pages-router)           |
| Astro                 | [`@chakra-docs/astro`](packages/astro#usage)                                   |
| React Router or Remix | [`@chakra-docs/react-router`](packages/react-router#usage)                     |
| Custom framework      | [`@chakra-docs/core`](packages/core#usage) with your own routing and rendering |

Use [`@chakra-docs/chakra`](packages/chakra) when you want the ready-made Chakra UI documentation experience, or render the framework-free manifest with your own components.

## Quick start: Next.js Pages Router

This example assumes an existing Chakra UI application with `@chakra-ui/react`, `@emotion/react`, React, and Next.js already installed. The repository's [`apps/docs`](apps/docs) project is a complete working implementation; App Router users can follow the package's [App Router guide](packages/next#app-router) with the same manifest and UI packages.

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
| [`@chakra-docs/core`](packages/core)                           | Framework-agnostic Markdown/MDX document model, manifest builders, and query helpers.    |
| [`@chakra-docs/chakra`](packages/chakra)                       | Chakra UI documentation components: layout, sidebar, TOC, search, callouts, code blocks. |
| [`@chakra-docs/source-filesystem`](packages/source-filesystem) | Server-side filesystem Markdown/MDX source with frontmatter and `_meta.json`.            |
| [`@chakra-docs/source-git`](packages/source-git)               | Sync documentation content from remote Git repositories at pinned refs.                  |
| [`@chakra-docs/cli`](packages/cli)                             | Generate, validate, inspect, sync, and watch Markdown/MDX documentation manifests.       |
| [`@chakra-docs/next`](packages/next)                           | Next.js App and Pages Router integration plus a docs-aware `Link`.                       |
| [`@chakra-docs/astro`](packages/astro)                         | Astro `getStaticPaths` helpers.                                                          |
| [`@chakra-docs/react-router`](packages/react-router)           | React Router / Remix route object helpers.                                               |
| [`@chakra-docs/search`](packages/search)                       | Framework-neutral server search, HTTP handlers, and a lightweight remote client.         |
| [`@chakra-docs/search-pagefind`](packages/search-pagefind)     | Pagefind record generation for static search.                                            |
| [`@chakra-docs/feed`](packages/feed)                           | RSS, Atom, and JSON Feed generation.                                                     |
| [`@chakra-docs/shiki`](packages/shiki)                         | Optional, lazy Shiki syntax highlighting with light/dark themes; no Postkit dependency.  |

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

## Agent skill

The repository publishes a portable [`compose-chakra-docs`](skills/compose-chakra-docs) skill for agents that are integrating, composing, theming, or troubleshooting a Chakra Docs instance. Install it from this repository with a compatible Agent Skills client, or ask Codex's `$skill-installer` to install the skill from its GitHub directory.

## Help and contributing

- [Report a bug or request a feature](https://github.com/chakra-docs/chakra-docs/issues)
- [Read the contribution guidelines](CONTRIBUTING.md)
- [Report a vulnerability privately](SECURITY.md)
- [Review release notes](CHANGELOG.md)

## Support development

If Chakra Docs is useful to you, consider supporting its development:

- [GitHub Sponsors](https://github.com/sponsors/ryanhefner)
- [Patreon](https://www.patreon.com/ryanhefner)
- [Open Collective](https://opencollective.com/ryanhefner)

## License

[MIT](LICENSE) — Chakra Docs is a community project and is not affiliated with or endorsed by [Chakra UI](https://chakra-ui.com).
