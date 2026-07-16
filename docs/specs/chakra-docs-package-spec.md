# Chakra Docs Package Spec

## Status

Draft.

This spec defines the target shape for `chakra-docs`: a Chakra UI based documentation toolkit that can be composed into existing sites. The early `react-fathom/docs` implementation should be treated as a working prototype and behavior fixture, not code to migrate wholesale.

## Background

The `react-fathom/docs` site proves several useful documentation patterns:

- File-backed MDX pages with frontmatter.
- `_meta` files for navigation ordering and labels.
- Generated side navigation, breadcrumbs, table of contents, and previous/next links.
- Chakra UI components for docs pages, callouts, cards, steps, tabs, file trees, package install commands, and code blocks.
- Optional search using Pagefind.
- Next.js static rendering.

The prototype is intentionally app-specific. It owns the whole site shell, hard-codes `/docs`, uses Next-specific primitives in shared components, includes Fathom analytics in generic UI, and assumes content lives at `process.cwd()/content`.

The package should preserve the proven user experience while replacing app assumptions with explicit configuration, adapter contracts, and composable components.

## Product Goal

`chakra-docs` should make it easy to add high-quality documentation pages or sections to a site that already uses Chakra UI.

It should support:

- Full documentation sites.
- Documentation sections embedded inside product, marketing, or app sites.
- MDX-heavy content.
- Framework-specific routing helpers without making the main package depend on one framework.
- App-owned branding, layout shell, analytics, search, and routing.

## Design Principles

1. Components, not a site generator.
2. Chakra first, but framework agnostic at the core.
3. Framework adapters should be thin and replaceable.
4. Routing, links, analytics, search, edit URLs, and content sources are app concerns.
5. The default path should be simple, but every hidden assumption must have a config escape hatch.
6. Server-only content code must stay separate from browser-safe React components.
7. The package should be useful without MDX, but excellent with MDX.

## Non-Goals

- Do not provide a hosted docs platform.
- Do not require Next.js.
- Do not require Pagefind.
- Do not require a specific analytics provider.
- Do not own the app root, Chakra provider, color mode provider, metadata defaults, or marketing homepage.
- Do not hard-code `/docs`, GitHub URLs, copyright text, package names, or brand labels.
- Do not execute arbitrary TypeScript config files with `new Function`.

## Package Layout

The initial package set should be:

- `@chakra-docs/core`: content model, source interfaces, nav utilities, slug/path utilities, TOC utilities, breadcrumbs, adjacent page helpers, metadata helpers.
- `@chakra-docs/chakra`: Chakra UI React components and MDX component map helpers.
- `@chakra-docs/source-filesystem`: server-only filesystem, MDX, frontmatter, and `_meta` discovery source.
- `@chakra-docs/source-git`: optional build-time source for syncing documentation from remote Git repositories.
- `@chakra-docs/cli`: optional content discovery, watch mode, validation, and generated manifest tooling.
- `@chakra-docs/next`: Next.js helpers with App Router and Pages Router entrypoints.
- `@chakra-docs/search`: framework-neutral search engine, Fetch handler, and lightweight HTTP client.
- `@chakra-docs/search-pagefind`: optional Pagefind search adapter and UI hooks.
- `@chakra-docs/astro`: Astro integration helpers.
- `@chakra-docs/react-router`: React Router and Remix integration helpers.
- `chakra-docs`: convenience package that re-exports the core and Chakra packages once the API is stable.

Initial implementation can start with `@chakra-docs/core`, `@chakra-docs/source-filesystem`, `@chakra-docs/chakra`, `@chakra-docs/cli`, and `@chakra-docs/next`. Other adapters should be shaped in the spec now but can ship later.

## Dependency Boundaries

`@chakra-docs/core`:

- Runtime: framework-neutral TypeScript.
- May depend on small parsing utilities if needed.
- Must not import React, Chakra, Next, Astro, Remix, filesystem APIs in browser entrypoints, or Node-only APIs from universal modules.

`@chakra-docs/search`:

- Runtime: framework-neutral TypeScript with separate engine, HTTP, and client entrypoints.
- May depend on `@chakra-docs/core`; must not depend on React, Chakra, Next, or Nest.
- Must return compact result projections rather than source text or heading arrays over HTTP.
- Must validate and cap public query, collection, and result-limit inputs.

`@chakra-docs/chakra`:

- Runtime: React and Chakra UI.
- Must not import Next, Astro, Remix, React Router, Pagefind, or analytics libraries.
- Must accept link and navigation primitives through props/context.

`@chakra-docs/next`:

- Runtime: Next-specific helpers.
- May provide App Router and Pages Router entrypoints.
- May depend on `@chakra-docs/core` and optionally `@chakra-docs/chakra`.

`@chakra-docs/source-filesystem`:

- Runtime: server-only Node.js utilities.
- May import filesystem, path, Markdown, MDX, and frontmatter tooling.
- Must not be imported by browser-safe packages.

`@chakra-docs/source-git`:

- Runtime: build-time Node.js utilities.
- May clone, fetch, or checkout configured remote repositories into a cache directory.
- Must not run during browser rendering or request handling.
- Must require explicit repository URLs and refs so builds are reproducible.

`@chakra-docs/cli`:

- Runtime: Node.js build and development tooling.
- May depend on filesystem source packages, globbing, file watching, schema validation integration, and code generation utilities.
- Must emit framework-agnostic manifests that adapters can consume.

Search packages:

- Must be optional.
- Must not be required by core layout or content utilities.

## Dependency Policy

Dependencies should be chosen to preserve the package boundaries above. A dependency is acceptable only when it is widely used, maintained, tree-shakeable enough for its package boundary, and difficult to replace correctly with local code.

### Peer Dependencies

`@chakra-docs/chakra` should declare these as peer dependencies:

- `react`
- `react-dom`
- `@chakra-ui/react`

It should not force a specific Chakra provider setup. Apps that already use Chakra should be able to install the package without a second provider or theme fork.

Framework packages should declare their framework as a peer dependency:

- `@chakra-docs/next`: `next`, `react`, `react-dom`
- `@chakra-docs/astro`: `astro`, `react`, `react-dom`, `@astrojs/react` when needed by examples or helpers
- `@chakra-docs/react-router`: `react-router` or `react-router-dom`, depending on the adapter target
- Remix support should either live behind a Remix-specific entrypoint or document the React Router adapter path if Remix's current routing APIs are enough

MDX compiler packages should not be required peer dependencies of `@chakra-docs/chakra`. Framework adapters may document supported compiler stacks and can expose optional helpers for specific stacks.

### Core Runtime Dependencies

`@chakra-docs/core` should start with no heavy runtime dependencies in its root entrypoint.

Acceptable root dependencies:

- A slugging helper such as `github-slugger`, if local heading ID generation starts to diverge from GitHub-style behavior.
- Tiny utility packages only when they remove meaningful correctness risk.

Avoid in the root entrypoint:

- React.
- Chakra.
- Framework packages.
- Filesystem packages.
- Markdown parser stacks.
- Search libraries.
- Git wrappers or command execution helpers.

### Server and Parser Dependencies

Markdown, MDX, filesystem, and git behavior should live in explicit server-only or adapter packages/subpaths.

Recommended parser stack for Markdown/MDX-aware utilities:

- `unified`
- `remark-parse`
- `remark-mdx` when MDX syntax needs to be preserved
- `unist-util-visit`
- `mdast-util-to-string`

Recommended frontmatter handling:

- Use `gray-matter` or `vfile-matter` in the filesystem source package/subpath, not in browser-safe UI code.

Recommended syntax highlighting integration:

- Treat `rehype-pretty-code` and Shiki as recommended app/compiler dependencies, not required core dependencies.
- Keep rendered code block components compatible with the attributes produced by `rehype-pretty-code`.

Recommended search integration:

- Use `@chakra-docs/search` for server-hosted or local in-memory search with shared ranking behavior.
- Keep Next-specific HTTP adapters under `@chakra-docs/next/search`; Nest apps should wrap the generic engine in a singleton provider.
- Treat `pagefind` as an app build dependency or optional peer of `@chakra-docs/search-pagefind`.
- Do not bundle the Pagefind indexer into shared UI packages.

Recommended discovery and watch tooling:

- Use `tinyglobby` or `fast-glob` in filesystem/CLI packages for file discovery.
- Use `chokidar` only in the CLI or dev-server integration, not in runtime packages.
- Use generated JSON and TypeScript modules for runtime document access instead of scanning the filesystem inside request handlers.
- Accept Standard Schema-compatible validators for frontmatter validation where possible. Zod can be documented as a recommended validator, but core should not require Zod.

### Dependency Verification

Before adding a dependency:

- Confirm it belongs to the smallest package boundary that needs it.
- Confirm it does not pull framework-specific code into framework-agnostic entrypoints.
- Confirm it works in ESM-first packages.
- Confirm it is compatible with the supported Node and TypeScript versions.
- Add an alternative considered note to the implementing PR when the dependency is foundational.

## Recommended Document Mapping Stack

The package should not depend on Contentlayer directly. Contentlayer is useful prior art for generated document imports, generated types, and collection manifests, but `chakra-docs` needs a narrower, framework-portable pipeline that integrates with Chakra docs components and multi-repository collections.

Use this package stack for the Contentlayer-style documents-to-package mapping:

| Concern                   | Package                                                 | Package Boundary                                                                         | Notes                                                                                                                                         |
| ------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Config loading            | `c12`                                                   | `@chakra-docs/cli`                                                                       | Loads TS, ESM, CJS, JSON, YAML, TOML, rc files, package fields, and supports config watching.                                                 |
| File globbing             | `tinyglobby`                                            | `@chakra-docs/source-filesystem`, `@chakra-docs/cli`                                     | Small dependency surface and good enough glob behavior for content discovery.                                                                 |
| Watch mode                | `chokidar`                                              | `@chakra-docs/cli` only                                                                  | Use explicit directories and filters; v4 intentionally removed glob support.                                                                  |
| Markdown pipeline         | `unified`, `remark-parse`                               | `@chakra-docs/source-filesystem`                                                         | Base Markdown AST pipeline for discovery and extraction.                                                                                      |
| MDX parsing               | `remark-mdx`                                            | `@chakra-docs/source-filesystem`                                                         | Parse MDX syntax for metadata/heading/text extraction without compiling in core.                                                              |
| Frontmatter syntax        | `remark-frontmatter`                                    | `@chakra-docs/source-filesystem`                                                         | Recognize YAML/TOML frontmatter in Markdown and MDX files.                                                                                    |
| Frontmatter data          | `vfile-matter`                                          | `@chakra-docs/source-filesystem`                                                         | Parse YAML frontmatter into structured file data.                                                                                             |
| AST traversal             | `unist-util-visit`                                      | `@chakra-docs/source-filesystem`, possibly `@chakra-docs/core` if AST helpers move there | Walk Markdown/MDX trees for headings, links, and text extraction.                                                                             |
| Text extraction           | `mdast-util-to-string`                                  | `@chakra-docs/source-filesystem`                                                         | Convert headings and content nodes to plain text.                                                                                             |
| Heading slugs             | `github-slugger`                                        | `@chakra-docs/core`                                                                      | Generate deterministic, duplicate-safe GitHub-style heading IDs from plain text.                                                              |
| Schema contract           | `@standard-schema/spec` or copied Standard Schema types | `@chakra-docs/core` or `@chakra-docs/cli`                                                | Accept Zod, Valibot, ArkType, and other compatible validators without binding to one validator.                                               |
| Optional schema example   | `zod`                                                   | app dependency or docs examples                                                          | Good first documented validator, but not required by core packages.                                                                           |
| Generated virtual modules | `unplugin`                                              | optional `@chakra-docs/plugin` later                                                     | Useful for Vite/Rollup/Webpack/esbuild virtual modules; generated files remain the baseline because Next/Turbopack support is less universal. |
| MDX compilation           | `@mdx-js/mdx`                                           | optional adapter/helper package                                                          | Only needed if `chakra-docs` compiles MDX to code. Baseline should store raw MDX and let framework adapters render it.                        |
| Remote Git source         | `simple-git`                                            | `@chakra-docs/source-git` or `@chakra-docs/cli`                                          | Wraps the local Git binary. Keep it build-time only and require pinned refs.                                                                  |
| Feed generation           | `feed`                                                  | optional `@chakra-docs/feed`                                                             | Convert normalized `DocsFeedEntry` records into RSS, Atom, and JSON feeds.                                                                    |

Baseline generated files should be plain TypeScript and JSON written to `outDir`. This gives every framework a stable import path without requiring a bundler plugin.

Recommended generated file shape:

```text
.chakra-docs/generated/
  index.ts
  manifest.json
  manifest.d.ts
  collections/
    js-node.json
    php.json
  documents/
    js-node/
      getting-started.json
    php/
      getting-started.json
```

`index.ts` should export data and query helpers:

```ts
export { docsManifest } from './manifest.js';
export const allDocs = docsManifest.pages;
export const docsNav = docsManifest.nav;
export const docsSearch = docsManifest.search;
export const docsSitemap = docsManifest.sitemap;
export const docsFeeds = docsManifest.feeds;

export function getDocByRoute(route: string) {
  return docsManifest.byRoute[route] ?? null;
}

export function getDocBySlug(collectionId: string, slug: string[]) {
  const slugKey = slug.join('/');
  return docsManifest.bySlug[collectionId]?.[slugKey] ?? null;
}
```

`unplugin` can be added later to expose virtual imports such as `virtual:chakra-docs` for Vite/Astro-style apps. It should be an enhancement over generated files, not the only integration path.

Do not use these as baseline dependencies:

- `contentlayer`: use as prior art, not a dependency.
- `contentlayer2`: avoid tying the project to a fork while the package goals are still being defined.
- `ts-morph`: too heavy for initial codegen; start with deterministic string generation and JSON.
- Runtime search libraries in core: search records should be generated by discovery and consumed by optional search packages.

## Core Concepts

### Docs Page

```ts
export interface DocsPage {
  id: string;
  collectionId?: string;
  sourceId?: string;
  slug: string[];
  path: string;
  route: string;
  title: string;
  description?: string;
  frontmatter: DocsFrontmatter;
  body?: string;
  headings?: DocsHeading[];
  data?: unknown;
}

export interface DocsFrontmatter {
  title?: string;
  description?: string;
  order?: number;
  draft?: boolean;
  hidden?: boolean;
  navTitle?: string;
  toc?: boolean;
  [key: string]: unknown;
}
```

### Navigation Item

```ts
export interface DocsNavItem {
  id: string;
  title: string;
  href?: string;
  slug?: string[];
  hidden?: boolean;
  badge?: string;
  children?: DocsNavItem[];
}
```

### Heading

```ts
export interface DocsHeading {
  id: string;
  title: string;
  level: number;
  children?: DocsHeading[];
}
```

### Source

Content should enter the system through a source abstraction.

```ts
export interface DocsSource {
  getPage(args: {
    collectionId?: string;
    slug: string[];
  }): MaybePromise<DocsPage | null>;
  getPages(args?: { collectionId?: string }): MaybePromise<DocsPage[]>;
  getCollections?(): MaybePromise<DocsCollection[]>;
  getManifest?(): MaybePromise<DocsManifest>;
  getNav?(args?: { collectionId?: string }): MaybePromise<DocsNavItem[]>;
}

type MaybePromise<T> = T | Promise<T>;
```

The source abstraction lets Next, Astro, Remix, static manifests, filesystem MDX, and app-owned data loaders share the same rendering components.

### Document Repository

A repository is a place documents are read from. It can be a local folder, a workspace package, a remote Git repository, or a custom source implemented by the app.

```ts
export type DocsRepositoryType = 'local' | 'workspace' | 'git' | 'custom';

export interface DocsRepository {
  id: string;
  type: DocsRepositoryType;
  rootDir?: string;
  packageName?: string;
  url?: string;
  ref?: string;
  subdir?: string;
  cacheDir?: string;
}

export interface DocsRepositoryRef {
  repositoryId: string;
  contentPath?: string;
}
```

Repository config should be resolved at build time. Runtime rendering should consume a `DocsSource` or generated manifest, not clone or scan repositories.

### Document Collection

```ts
export interface DocsCollection {
  id: string;
  name?: string;
  sourceId?: string;
  repository?: DocsRepositoryRef;
  basePath: string;
  pages: DocsPage[];
  nav: DocsNavItem[];
}
```

Collections let apps define more than one documentation area, such as `/docs`, `/guides`, `/api`, `/docs/js-node`, `/docs/php`, or product-specific help sections.

### Manifest

```ts
export interface DocsManifest {
  repositories?: DocsRepository[];
  collections: DocsCollection[];
  pages: DocsPage[];
  nav: DocsNavItem[];
  byCollection: Record<string, DocsCollection>;
  bySlug: Record<string, Record<string, DocsPage>>;
  byRoute: Record<string, DocsPage>;
  search: DocsSearchRecord[];
  sitemap: DocsSitemapEntry[];
  feeds: DocsFeedEntry[];
}

export interface DocsSearchRecord {
  id: string;
  route: string;
  title: string;
  description?: string;
  headings: DocsHeading[];
  text: string;
  tags?: string[];
}

export interface DocsSitemapEntry {
  url: string;
  lastModified?: string | Date;
  changeFrequency?: string;
  priority?: number;
}

export interface DocsFeedEntry {
  id: string;
  url: string;
  title: string;
  description?: string;
  date?: string | Date;
  author?: string;
  tags?: string[];
}
```

The manifest is the primary output for framework adapters, search indexing, sitemap generation, RSS/Atom feeds, and custom app queries.

## Configuration

```ts
export interface DocsConfig {
  basePath?: string;
  siteUrl?: string;
  title?: string;
  source?: DocsSource;
  nav?: DocsNavItem[];
  editUrl?: DocsEditUrlResolver;
}

export type DocsEditUrlResolver = (page: DocsPage) => string | undefined;
```

Core config must stay React-free. UI and framework packages can layer React-specific options on top:

```ts
export interface DocsLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  [key: string]: unknown;
}

export type DocsLinkComponent = React.ComponentType<DocsLinkProps>;

export interface ChakraDocsConfig extends DocsConfig {
  linkComponent?: DocsLinkComponent;
  labels?: Partial<DocsLabels>;
  analytics?: DocsAnalyticsCallbacks;
}

export interface DocsLabels {
  search: string;
  searchPlaceholder: string;
  searchNoResults: string;
  previousPage: string;
  nextPage: string;
  editPage: string;
  onThisPage: string;
  openNavigation: string;
  closeNavigation: string;
  copyCode: string;
  copiedCode: string;
}

export interface DocsAnalyticsCallbacks {
  onSearchOpen?: () => void;
  onSearch?: (query: string) => void;
  onSearchResultSelect?: (result: unknown) => void;
  onCodeCopy?: (event: {
    code: string;
    language?: string;
    title?: string;
  }) => void;
  onPackageCommandCopy?: (event: { command: string; manager: string }) => void;
}
```

`basePath` defaults to `/docs`, but all helpers must accept another value.

## Content Source Behavior

The first source implementation should support filesystem MDX because it matches the prototype and common docs workflows.

Required behavior:

- Resolve `index.mdx` as the page for the current directory.
- Resolve `foo.mdx` as `/foo`.
- Resolve `foo/index.mdx` as `/foo`.
- Read frontmatter from MDX files.
- Support `_meta.json` and `_meta.ts` ordering.
- Prefer safe loading for `_meta.ts`, using dynamic import in server-only contexts rather than evaluating strings.
- Allow apps to provide nav manually instead of using file discovery.
- Exclude hidden and draft pages by config.

Prototype behavior to keep:

- `_meta` controls order and display labels.
- Root index appears first when present.
- Directory pages can have children.
- Previous and next links use flattened nav order.

Prototype behavior to improve:

- Do not hard-code `process.cwd()/content`.
- Do not hard-code `/docs`.
- Do not use regex-only TOC extraction when a parser is available.
- Do not evaluate `_meta.ts` with `new Function`.
- Do not shell out to git from core utilities.

## Document Discovery and Generated Data Layer

The package should provide Contentlayer-style document discovery without requiring a specific framework or runtime filesystem access.

Discovery has two modes:

- Runtime source mode: adapters call a `DocsSource` directly, useful for simple server-rendered apps and tests.
- Generated manifest mode: the CLI scans content at build/dev time and writes typed modules and JSON artifacts that apps import.

Generated manifest mode should be the recommended path for production apps because it is fast, framework-portable, and works for static exports.

### Discovery Configuration

```ts
export interface DocsDiscoveryConfig {
  rootDir: string;
  outDir?: string;
  repositories?: DocsRepositoryConfig[];
  collections: DocsCollectionConfig[];
}

export type DocsRepositoryConfig =
  | DocsLocalRepositoryConfig
  | DocsWorkspaceRepositoryConfig
  | DocsGitRepositoryConfig
  | DocsCustomRepositoryConfig;

export interface DocsLocalRepositoryConfig {
  id: string;
  type: 'local';
  rootDir: string;
}

export interface DocsWorkspaceRepositoryConfig {
  id: string;
  type: 'workspace';
  packageName: string;
  rootDir?: string;
}

export interface DocsGitRepositoryConfig {
  id: string;
  type: 'git';
  url: string;
  ref: string;
  subdir?: string;
  cacheDir?: string;
}

export interface DocsCustomRepositoryConfig {
  id: string;
  type: 'custom';
  source: DocsSource;
}

export interface DocsCollectionConfig {
  id: string;
  name?: string;
  repository?: string;
  contentDir?: string;
  contentPath?: string;
  basePath?: string;
  include?: string[];
  exclude?: string[];
  schema?: unknown;
  metaFileNames?: string[];
  defaultDraft?: boolean;
}
```

Default values:

- `outDir`: `.chakra-docs/generated`
- `repositories`: a default local repository rooted at `rootDir`
- `include`: `['**/*.md', '**/*.mdx']`
- `exclude`: `['**/_*.md', '**/_*.mdx']`
- `metaFileNames`: `['_meta.json', '_meta.ts', '_meta.mjs']`

The exact config file name can be decided during implementation, but likely candidates are `chakra-docs.config.ts` or `docs.config.ts`.

Example multi-repository configuration:

```ts
export default {
  rootDir: process.cwd(),
  outDir: 'src/docs/generated',
  repositories: [
    {
      id: 'workspace',
      type: 'local',
      rootDir: '.',
    },
    {
      id: 'php-sdk',
      type: 'git',
      url: 'https://github.com/acme/php-sdk.git',
      ref: 'v2.4.0',
      subdir: 'docs',
    },
  ],
  collections: [
    {
      id: 'js-node',
      name: 'JavaScript / Node.js',
      repository: 'workspace',
      contentPath: 'packages/node/docs',
      basePath: '/docs/js-node',
    },
    {
      id: 'php',
      name: 'PHP',
      repository: 'php-sdk',
      contentPath: '.',
      basePath: '/docs/php',
    },
  ],
};
```

`contentDir` is a convenience for simple local projects. `repository` plus `contentPath` should be the preferred shape for monorepos and external document repositories.

### Repository Resolution

Repository resolution should happen before document discovery.

Resolution rules:

- `local` repositories resolve relative to `rootDir` unless `rootDir` is absolute.
- `workspace` repositories resolve by package name when package manager workspace metadata is available; `rootDir` can be used as an explicit fallback.
- `git` repositories sync to a deterministic cache directory and checkout the configured `ref`.
- `custom` repositories delegate all loading to an app-provided `DocsSource`.

Remote Git sources must be pinned to a branch, tag, or commit through `ref`. For reproducible builds, examples should prefer tags or commit SHAs over floating branches.

Monorepo use cases should support:

- Multiple packages each contributing a docs collection.
- Multiple language or SDK docs sections on one site.
- One source repository producing multiple collections.
- One collection assembled from a single repository subdirectory.
- Generated route prefixes per collection.

### Generated Outputs

The CLI should be able to generate:

- A TypeScript module exporting `allDocs`, `docsBySlug`, `docsByRoute`, `docsNav`, and collection-specific exports.
- A JSON manifest for framework-agnostic tooling.
- Repository and collection metadata for debugging source provenance.
- Search records with plain text content and headings.
- Sitemap entries.
- Feed entries.
- Type declarations for page frontmatter when a schema is provided.

Example generated module API:

```ts
import {
  allDocs,
  docsManifest,
  docsNav,
  docsSearch,
  getDocBySlug,
  getDocByRoute,
  getDocsCollection,
} from '@/docs/generated';
```

The import path is app-owned. The CLI writes files to `outDir`; apps can import them by relative path or configure a path alias such as `@/docs/generated`.

`docsBySlug` should be keyed by collection id first, then normalized slug key, because multiple collections can contain the same slug. `docsByRoute` can be globally keyed because routes include each collection's `basePath`.

Collection-specific exports should be generated when multiple collections exist:

```ts
import {
  allApiDocs,
  apiDocsNav,
  allGuideDocs,
  guideDocsNav,
} from '@/docs/generated';
```

### Query Helpers

Core should provide pure helper functions over arrays and manifests:

```ts
export function getPageBySlug(
  manifest: DocsManifest,
  collectionId: string,
  slug: string[],
): DocsPage | null;
export function getPageByRoute(
  manifest: DocsManifest,
  route: string,
): DocsPage | null;
export function getPagesByCollection(
  manifest: DocsManifest,
  collectionId: string,
): DocsPage[];
export function getPublishedPages(
  pages: DocsPage[],
  options?: { includeDrafts?: boolean },
): DocsPage[];
export function createSearchRecords(pages: DocsPage[]): DocsSearchRecord[];
export function createSitemapEntries(
  pages: DocsPage[],
  config: DocsConfig,
): DocsSitemapEntry[];
export function createFeedEntries(
  pages: DocsPage[],
  config: DocsConfig,
): DocsFeedEntry[];
```

These helpers should not know about Next, Astro, Remix, Pagefind, RSS XML, or a specific feed library.

### Tooling Commands

The CLI should expose commands like:

```bash
chakra-docs build
chakra-docs dev
chakra-docs sync
chakra-docs validate
chakra-docs inspect
```

Command behavior:

- `build`: discover content, validate frontmatter, extract headings/text, build nav, and write generated artifacts.
- `dev`: run `build` once, watch files, and regenerate on changes.
- `sync`: resolve and cache remote repositories without generating the manifest.
- `validate`: run discovery and schema checks without writing artifacts by default.
- `inspect`: print pages, routes, collections, nav, or manifest stats for debugging.

The watch mode should be optional and live only in the CLI package.

### Validation

Validation should support app-provided frontmatter schemas.

Requirements:

- Validate required fields such as `title`, `description`, `draft`, `hidden`, `order`, and custom frontmatter.
- Report file path, field path, and useful error messages.
- Allow warnings for unknown fields when configured.
- Allow collection-specific schemas.
- Produce TypeScript types for generated document data when possible.

Schema integration should be adapter-friendly. Zod can be the first documented example, but the public contract should not make every app install Zod if a Standard Schema-compatible shape can cover validation.

### Search Data

Discovery should extract search-ready records separately from rendered MDX.

Search records should include:

- Page id, collection id, source id, route, title, description.
- Plain text body content.
- Headings.
- Optional tags or categories.
- Optional section-level records later if needed.

Pagefind integration can consume generated HTML or generated search records, depending on what proves most reliable. Core should only produce normalized search data.

### Sitemap and Feed Data

Discovery should make it easy to build sitemaps, RSS feeds, Atom feeds, and JSON feeds.

Core should output normalized data, not own all response formats:

- `DocsSitemapEntry` for sitemap adapters.
- `DocsFeedEntry` for feed adapters.
- Stable sorted page lists for custom app logic.

Framework packages can provide helpers that convert these records into framework response shapes, such as Next metadata route objects.

### Dev Experience Requirements

- Discovery errors should fail builds by default.
- Watch mode should be fast enough for documentation authoring.
- Generated modules should be ignored by default in examples, unless a fixture intentionally commits them.
- The generated module path should be configurable.
- Apps should be able to run without code generation by using a `DocsSource` directly.
- The manifest should be stable and deterministic for cleaner diffs.

## TOC and Slugging

TOC generation should be deterministic and shared with MDX heading rendering.

Requirements:

- Generate heading IDs with one slugifier.
- De-dupe repeated heading IDs.
- Ignore headings inside code blocks.
- Support configurable heading levels, defaulting to `h2` and `h3`.
- Return a flat list and optionally a nested list.
- Allow custom heading IDs from MDX/HTML where present.

## Chakra Components

`@chakra-docs/chakra` should provide composable building blocks:

- `DocsProvider`
- `DocsLayout`
- `DocsArticle`
- `DocsHeader`
- `DocsSidebar`
- `DocsMobileNav`
- `DocsTopNav`
- `DocsBreadcrumbs`
- `DocsTableOfContents`
- `DocsPagination`
- `DocsEditLink`
- `DocsKeyboardShortcuts`
- `DocsFooter`
- `Accordion`
- `AccordionItem`
- `Collapsible`
- `AnnouncementBanner`
- `Callout`
- `Cards`
- `Card`
- `Steps`
- `Step`
- `Tabs`
- `TabList`
- `TabTrigger`
- `TabPanel`
- `Tab`
- `CodeBlock`
- `PackageInstall`
- `CommandSwitch`
- `FileTree`
- `FileTreeFolder`
- `FileTreeFile`
- `Changelog`
- `ChangelogEntry`

Components should:

- Use Chakra props and theme tokens.
- Accept composition props for links and actions.
- Be usable independently outside `DocsLayout`.
- Avoid framework-specific imports.
- Avoid analytics imports.
- Expose controlled and uncontrolled variants where useful.

## Component API Conventions

Every UI component should be flexible through predictable extension points rather than one-off props.

Use these conventions:

- `children` for primary content.
- `as` and Chakra style props where Chakra supports them.
- `slots` or `slotProps` for multi-part components.
- `LinkComponent` or provider-level `linkComponent` for internal links.
- Callback props for analytics or custom app behavior.
- Controlled props plus default props for interactive components.
- `ids` or `idPrefix` props where generated IDs affect accessibility.
- `aria-label` props for icon-only controls.
- `variant`, `size`, and `colorPalette` only where they map cleanly to Chakra conventions.

Do not add props that encode one app's copy, URL, or behavior when a render prop or slot would keep the component generic.

### Slot Prop Pattern

Multi-part components should expose stable slot names.

```ts
export type ChakraSlotProps = Record<string, unknown>;

export interface DocsSidebarSlotProps {
  root?: ChakraSlotProps;
  section?: ChakraSlotProps;
  item?: ChakraSlotProps;
  link?: ChakraSlotProps;
  activeIndicator?: ChakraSlotProps;
}
```

Slot names should be documented and treated as public API once released.

### Link Pattern

Components that render navigation should accept docs links as data and route rendering through the configured link component.

```tsx
<DocsSidebar nav={nav} activePath={pathname} LinkComponent={AppLink} />
```

The component should never infer framework routing from imports.

### Analytics Pattern

Analytics must be modeled as callbacks.

```tsx
<CodeBlock onCopy={(event) => analytics.track('docs.code.copy', event)} />
```

No UI component should import an analytics provider directly.

## Component Inventory

The initial component set should cover the prototype behavior plus the expected needs of embedded docs sections.

| Component               | Purpose                                                               | Key Flexibility Points                                                |
| ----------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `DocsProvider`          | Shares docs config, link component, labels, and optional callbacks.   | `config`, `LinkComponent`, labels, analytics callbacks.               |
| `DocsLayout`            | Composes sidebar, article, TOC, pagination, and optional page chrome. | Slots for sidebar/top/footer/article/toc; hide/show regions.          |
| `DocsArticle`           | Width-constrained content wrapper for MDX or custom content.          | `maxW`, `prose` styling, `slotProps`.                                 |
| `DocsHeader`            | Page title, description, badges, metadata, and optional actions.      | Custom action slot, title override, metadata renderer.                |
| `DocsSidebar`           | Desktop navigation tree.                                              | Controlled active path, collapsible groups, custom item rendering.    |
| `DocsMobileNav`         | Mobile navigation drawer/dialog.                                      | Controlled open state, trigger slot, focus behavior, close callbacks. |
| `DocsTopNav`            | Optional docs-local top navigation.                                   | Brand slot, nav slot, actions slot, search slot.                      |
| `DocsBreadcrumbs`       | Current page path.                                                    | Custom root label, item renderer, separator.                          |
| `DocsTableOfContents`   | On-page heading navigation.                                           | Heading levels, active ID, item renderer, sticky behavior.            |
| `DocsPagination`        | Previous and next page links.                                         | Labels, layout, custom link/card renderer.                            |
| `DocsEditLink`          | Optional edit-on-host link.                                           | App-provided URL resolver, label, icon slot.                          |
| `DocsKeyboardShortcuts` | Optional keyboard navigation between docs pages and search.           | Shortcut map, enabled state, callback hooks.                          |
| `DocsFooter`            | Optional footer region.                                               | Children-only by default; no built-in copyright.                      |
| `Accordion`             | Groups collapsible content.                                           | Single/multiple mode, controlled values, item renderer.               |
| `AccordionItem`         | One collapsible item.                                                 | Title slot, icon slot, controlled open state.                         |
| `Collapsible`           | MDX-friendly single disclosure.                                       | Title slot, default open, icon slot.                                  |
| `AnnouncementBanner`    | Optional site/docs section announcement.                              | Variant, action slot, dismiss behavior, storage key.                  |
| `Callout`               | Inline note, warning, tip, or error.                                  | `type`, icon slot, title slot, variants.                              |
| `Cards`                 | Grid wrapper for related links or feature cards.                      | Responsive columns, gap, card renderer.                               |
| `Card`                  | Linkable or static card.                                              | Link component, icon/media slot, title/body slots.                    |
| `Steps`                 | Ordered procedural content.                                           | Numbering style, orientation, marker slot.                            |
| `Step`                  | Single procedural step.                                               | Title, marker, status, content.                                       |
| `Tabs`                  | Interactive tab group.                                                | Controlled value, default value, orientation, activation mode.        |
| `TabList`               | Accessible tab trigger container.                                     | Orientation, fitted layout, slot props.                               |
| `TabTrigger`            | Accessible tab button.                                                | Value, disabled state, icon slot.                                     |
| `TabPanel`              | Accessible tab content panel.                                         | Value, lazy mount behavior.                                           |
| `Tab`                   | Simple MDX-friendly tab item.                                         | Label, value, disabled state.                                         |
| `CodeBlock`             | Rendered code with optional title and copy button.                    | Syntax renderer compatibility, copy behavior, title slot.             |
| `PackageInstall`        | Package manager command switcher.                                     | Managers, command builder, default manager, copy callback.            |
| `CommandSwitch`         | Generic command variant switcher.                                     | Option labels, selected option, copy callback.                        |
| `FileTree`              | Directory/file visualization.                                         | Controlled folder open state, icons, item renderer.                   |
| `FileTreeFolder`        | Folder row for `FileTree`.                                            | Icon slot, default open, depth styling.                               |
| `FileTreeFile`          | File row for `FileTree`.                                              | Icon slot, status, highlight, href.                                   |
| `Changelog`             | Renders release entries from app-provided data.                       | Entry renderer, repo URL resolver, empty state.                       |
| `ChangelogEntry`        | One release/version entry.                                            | Commit link resolver, author visibility, date formatter.              |
| `SearchButton`          | Opens a configured search UI.                                         | Shortcut labels, callbacks, render trigger.                           |
| `SearchDialog`          | Search modal/dialog shell.                                            | Controlled open state, result renderer, empty/loading states.         |
| `SearchResults`         | Search result list.                                                   | Result item renderer, keyboard navigation.                            |

Search components may live in `@chakra-docs/search-pagefind` if they are Pagefind-specific. Generic search shells may live in `@chakra-docs/chakra` only if they accept provider-agnostic result data.

## Component Consistency Rules

- Shared components should use one spacing scale for docs surfaces.
- Cards and framed controls should default to small radii and restrained borders.
- Components should expose labels for copy, previous, next, search, edit, and mobile nav actions.
- Icons should be replaceable. Built-in defaults may use simple text/icon slots, but apps should not need to fork components to use an icon library.
- Layout components should reserve stable dimensions for sidebars, TOC, and icon buttons to avoid content shift.
- Components should avoid in-app instructional copy unless the component is specifically an empty, loading, or error state.
- Components should support light and dark mode through Chakra tokens, not hard-coded theme checks.

## Layout Composition

The layout should be assembled from parts rather than requiring a single all-in-one app shell.

Example target API:

```tsx
<DocsProvider config={docsConfig}>
  <DocsLayout
    nav={nav}
    toc={toc}
    page={page}
    breadcrumbs={breadcrumbs}
    pagination={pagination}
  >
    <DocsArticle>
      <MDXContent />
    </DocsArticle>
  </DocsLayout>
</DocsProvider>
```

Apps should be able to omit top nav, sidebar, TOC, pagination, edit links, or footer.

## Link Integration

Shared Chakra components must not import `next/link` or React Router links directly.

Link behavior should be provided by:

- `DocsProvider` config.
- Component-level `LinkComponent` prop.
- Framework adapters that preconfigure the provider.

Fallback behavior can use a normal anchor element.

## MDX Support

The package should provide a Chakra MDX component map.

```ts
export function createChakraDocsMdxComponents(
  options?: ChakraDocsMdxOptions,
): MDXComponents;
```

Default mappings should include:

- Headings with anchor links.
- Paragraphs, inline code, lists, tables, blockquotes, and horizontal rules.
- `pre`, `code`, `figure`, and `figcaption` support for syntax highlighters.
- Custom docs components: `Callout`, `Cards`, `Card`, `Steps`, `Step`, `Tabs`, `Tab`, `PackageInstall`, `FileTree`.

MDX support should not require one compiler. Framework packages can document recommended setups:

- Next: `next-mdx-remote`, MDX files imported through bundler, or generated manifests.
- Astro: content collections plus React components.
- Remix/React Router: app loader or prebuilt manifest.

## Syntax Highlighting

The prototype uses `rehype-pretty-code`, which is a good default recommendation.

The package should:

- Provide components compatible with `rehype-pretty-code`.
- Not require `rehype-pretty-code` in core.
- Allow apps to bring Shiki, Expressive Code, plain code blocks, or a custom renderer.
- Provide copy-to-clipboard behavior as an optional client component.

## Search

Search should be optional and adapter-driven.

Initial Pagefind package:

```ts
export interface PagefindSearchOptions {
  basePath?: string;
  maxResults?: number;
  onOpen?: () => void;
  onSearch?: (query: string) => void;
  onResultSelect?: (result: SearchResult) => void;
}
```

Requirements:

- No core dependency on Pagefind.
- Search UI can be used in top nav or independently.
- Analytics hooks are callback props, not provider-specific imports.
- Excerpts from search indexes must be treated as trusted only when the indexer guarantees sanitized HTML. Otherwise render plain text or sanitize before `dangerouslySetInnerHTML`.

## Framework Adapters

### Next App Router

Target capabilities:

- Generate static params from a source.
- Resolve page metadata.
- Provide server helpers for page loading.
- Consume generated manifests without requiring filesystem access during route rendering.
- Provide client-safe link configuration.
- Provide sitemap and robots helpers.

Possible entrypoint:

```ts
import {
  createAppRouterDocs,
  generateDocsStaticParams,
  generateDocsMetadata,
} from '@chakra-docs/next/app';
```

### Next Pages Router

Target capabilities:

- `getStaticPaths` helper.
- `getStaticProps` helper.
- Generated manifest support for static builds.
- Link provider using `next/link`.
- Example page component wrapper.

Possible entrypoint:

```ts
import {
  getDocsStaticPaths,
  getDocsStaticProps,
} from '@chakra-docs/next/pages';
```

### Astro

Target capabilities:

- Content collection helpers.
- Generated manifest support when apps do not want to use Astro collections directly.
- Nav generation from Astro collection entries.
- React component usage guidance for Chakra docs islands.
- Static route generation examples.

### React Router and Remix

Target capabilities:

- Loader helpers for docs pages and nav.
- Link adapter using React Router `Link`.
- Route module examples for nested docs pages.
- Static manifest option for non-filesystem deployments.
- Feed and sitemap examples using generated manifest data.

## Metadata, Sitemap, and Edit URLs

Metadata helpers should be pure functions over `DocsPage` and config.

```ts
export function createDocsMetadata(
  page: DocsPage,
  config: DocsConfig,
): DocsMetadata;
export function createDocsSitemap(
  pages: DocsPage[],
  config: DocsConfig,
): DocsSitemapEntry[];
```

Edit URLs must be app configured:

```ts
editUrl: (page) =>
  `https://github.com/acme/project/edit/main/docs/${page.path}`;
```

Core should not shell out to git. If last-updated data is needed, provide one of:

- Frontmatter field.
- Build-time manifest field.
- Optional server-only git utility package.

## Accessibility Requirements

- Navigation landmarks should be explicit.
- Mobile navigation must trap or manage focus when displayed as an overlay or dialog.
- Search modal must support Escape, focus restore, labels, and keyboard navigation.
- Tabs should use appropriate tab semantics.
- Accordions should expose button state with `aria-expanded`.
- Heading anchor links should be keyboard reachable without disrupting heading semantics.
- Color choices must satisfy contrast expectations through Chakra theme tokens.

## Security Requirements

- Never evaluate content config strings with `new Function`.
- Do not render raw HTML from search or MDX without an explicit trust boundary.
- Keep filesystem access in server-only packages.
- Keep remote Git syncing in build-time tooling only.
- Require explicit `ref` values for remote Git repositories.
- Avoid command execution in core packages.
- Treat content paths and slugs as untrusted input until normalized.

## Theming Requirements

- Components should use semantic Chakra tokens where possible.
- Apps must be able to override all styling through Chakra theme recipes, component props, or slot props.
- Do not require a custom Chakra provider.
- Do not require a color mode provider.
- Provide sensible defaults for light and dark modes.

## Example Apps

The repo should include examples as the package APIs stabilize:

- `examples/next-app-router`
- `examples/next-pages-router`
- `examples/astro`
- `examples/react-router`
- `examples/remix`

The first example should use the `react-fathom/docs/content` structure as a fixture, with product-specific pieces moved into app config.

## Migration Guidance From Prototype

Keep as reference:

- `lib/docs.ts` behavior for nav, page lookup, breadcrumbs, adjacent pages.
- `components/docs/MDXComponents.tsx` for Chakra MDX mappings.
- `components/docs/DocsLayout.tsx` for layout composition.
- `components/docs/Search.tsx` for Pagefind interaction model.
- `components/docs/PackageInstall.tsx`, `FileTree.tsx`, `Callout.tsx`, `Cards.tsx`, `Steps.tsx`, `Tabs.tsx`.

Do not port as-is:

- Fathom analytics imports in generic components.
- `EventStream`.
- Hard-coded nav links and brand labels.
- Hard-coded GitHub repo and docs content path.
- `process.cwd()/content` as an implicit source.
- `new Function` metadata loading.
- Git command execution in core docs utilities.
- Next-only link imports inside shared Chakra components.

## Milestones

### Milestone 1: Repository Reset

- Remove legacy `@org/*` packages.
- Rename root package metadata away from `@org/source`.
- Add package folders for `core`, `source-filesystem`, `chakra`, `cli`, and `next`.
- Add this spec to docs.
- Add initial README describing the real project.

### Milestone 2: Core Model and Utilities

- Implement `DocsPage`, `DocsNavItem`, `DocsHeading`, and `DocsSource` types.
- Implement `DocsRepository` and repository reference types.
- Implement `DocsCollection`, `DocsManifest`, `DocsSearchRecord`, `DocsSitemapEntry`, and `DocsFeedEntry` types.
- Implement slug, route, nav flattening, breadcrumbs, adjacent page helpers.
- Implement manifest query helpers.
- Implement sitemap, feed, and search record mappers.
- Implement safe TOC extraction.
- Add focused unit tests.

### Milestone 3: Filesystem MDX Source

- Implement server-only filesystem source.
- Support frontmatter, `index.mdx`, directory index pages, and `_meta` ordering.
- Support multi-collection discovery.
- Support local and workspace repository roots.
- Add tests using fixture content.

### Milestone 4: Discovery CLI

- Implement `chakra-docs build`.
- Implement repository resolution for local, workspace, and cached Git repositories.
- Implement `chakra-docs validate`.
- Implement `chakra-docs sync`.
- Implement generated TypeScript and JSON manifest outputs.
- Implement deterministic output ordering.
- Add fixture tests for generated data.

### Milestone 5: Chakra Components

- Implement docs layout primitives.
- Implement MDX component map.
- Port generic docs components from the prototype after removing app-specific dependencies.
- Add component-level tests or examples.

### Milestone 6: Next Adapter

- Implement App Router helpers.
- Implement Pages Router helpers.
- Support both `DocsSource` and generated manifest consumption.
- Build a Next example using fixture content.

### Milestone 7: Search and Additional Frameworks

- Implement Pagefind adapter.
- Implement or finalize `@chakra-docs/source-git` if not completed with the CLI.
- Add Astro helpers.
- Add React Router and Remix helpers.
- Add RSS/feed examples using generated `DocsFeedEntry` records.

## Acceptance Criteria

The first usable release should satisfy these checks:

- A Next App Router site can add docs under any base path with less than one page of setup code.
- A Next Pages Router site can render the same source using adapter helpers.
- Shared Chakra components work without importing Next.
- Search is optional.
- Analytics are optional callbacks, not package dependencies.
- The docs layout can be embedded inside an existing site shell.
- The same content source can produce nav, page data, breadcrumbs, TOC, previous/next links, metadata, and sitemap entries.
- Generated manifest tooling can expose all docs, collection docs, route lookup, slug lookup, search records, sitemap records, and feed records.
- A monorepo can define separate `/docs/js-node` and `/docs/php` collections from separate package folders or repositories.
- A docs site can build from a pinned remote Git repository without runtime repository access.
- Framework adapters can consume the generated manifest without runtime filesystem access.
- The prototype `react-fathom/docs` experience can be rebuilt using package APIs plus app-owned config.

## Open Questions

- Should `chakra-docs` be the primary package name or only a convenience meta package?
- Should filesystem MDX live in `@chakra-docs/core/server` or a dedicated `@chakra-docs/source-filesystem` package?
- Should remote Git syncing be part of `@chakra-docs/cli`, `@chakra-docs/source-git`, or both?
- Should workspace package discovery inspect package manager metadata, Nx project metadata, or only explicit config?
- Should generated outputs be committed in examples or always generated during setup/build?
- Should feed XML helpers live in core, framework adapters, or a small `@chakra-docs/feed` package?
- Should `@chakra-docs/chakra` expose slot components, recipes, or both?
- Should search UI live in `@chakra-docs/chakra` with adapters feeding data, or in each search adapter package?
- Should the package support non-MDX content renderers in v1 or document the extension path only?
