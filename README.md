# Chakra Docs

**Add a beautiful documentation section to your existing Chakra UI app — without handing your whole site over to a docs framework.**

[Documentation](https://chakra-docs.dev) · [Getting started](https://chakra-docs.dev/docs/installation) · [Examples](https://chakra-docs.dev/showcase) · [Issues](https://github.com/chakra-docs/chakra-docs/issues)

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
| Next.js App Router    | [App Router guide](https://chakra-docs.dev/docs/app-router)                    |
| Next.js Pages Router  | [Pages Router guide](https://chakra-docs.dev/docs/pages-router)                |
| Astro                 | [Astro guide](https://chakra-docs.dev/docs/astro)                              |
| React Router or Remix | [React Router guide](https://chakra-docs.dev/docs/react-router)                |
| Custom framework      | [`@chakra-docs/core`](packages/core#usage) with your own routing and rendering |

Use [`@chakra-docs/chakra`](packages/chakra) when you want the ready-made Chakra UI documentation experience, or render the framework-free manifest with your own components.

## Quick start: render a docs page

Try the UI inside your existing React application before adding a filesystem
source or router adapter:

```bash
npm install @chakra-docs/core @chakra-docs/chakra @chakra-ui/react @emotion/react react react-dom
```

<!-- quickstart:start -->

```tsx
'use client';

import type { DocsPage } from '@chakra-docs/core';
import {
  DocsArticle,
  DocsLayout,
  DocsProvider,
  MarkdownContent,
} from '@chakra-docs/chakra';
import { chakraDocsThemeConfig } from '@chakra-docs/chakra/theme';
import { ChakraProvider, createSystem, defaultConfig } from '@chakra-ui/react';

const system = createSystem(defaultConfig, chakraDocsThemeConfig);
const page: DocsPage = {
  id: 'getting-started',
  collectionId: 'docs',
  slug: ['getting-started'],
  path: 'getting-started.md',
  route: '/docs/getting-started',
  title: 'Getting started',
  body: '## Welcome\n\nYour first documentation page is ready.',
  frontmatter: {},
  headings: [{ id: 'welcome', title: 'Welcome', level: 2 }],
};
const nav = [{ id: page.id, title: page.title, href: page.route }];

export default function DocumentationPage() {
  return (
    <ChakraProvider value={system}>
      <DocsProvider>
        <DocsLayout page={page} nav={nav} headings={page.headings}>
          <DocsArticle page={page} headings={page.headings}>
            <MarkdownContent source={page.body ?? ''} />
          </DocsArticle>
        </DocsLayout>
      </DocsProvider>
    </ChakraProvider>
  );
}
```

<!-- quickstart:end -->

Render `DocumentationPage` in your app. If you already use Chakra UI, merge
`chakraDocsThemeConfig` into your existing system instead of adding another
Chakra provider. React 18/19 and Chakra UI 3 are supported; the installed
framework's own peer requirements also apply. Packages are ESM-only and support
Node.js 22.22 or newer; Node.js 24 is recommended for new build environments.

Next, follow your [router guide](#choose-your-stack), connect a
[filesystem collection](https://chakra-docs.dev/docs/configuration) or
[CLI-generated manifest](https://chakra-docs.dev/docs/cli), and add
[server search](https://chakra-docs.dev/docs/search) if needed. Markdown/MDX
discovery produces content records, not an executable MDX compiler: choose a
trusted rendering pipeline for expressions or custom MDX components.

The [`apps/docs`](apps/docs) project is a complete Pages Router example.

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

Repository development uses the Node.js 24 version in `.nvmrc` and the pnpm
version in `packageManager`; the published package engine floor below is a
consumer compatibility range, not the contributor runtime pin.

The packages are ESM-only and require Node.js 22.22 or newer. Framework peer
ranges are deliberately bounded and are exercised in CI at both the minimum
supported versions and the workspace's current versions. Chakra consumers must
install `@emotion/react` alongside `@chakra-ui/react`.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run build
pnpm run test
pnpm run lint
pnpm run release:smoke
pnpm run yalc:publish
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
