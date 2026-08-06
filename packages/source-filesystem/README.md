# @chakra-docs/source-filesystem

Filesystem Markdown and MDX content source for Chakra Docs.

Created by [Ryan Hefner](https://www.ryanhefner.com) and [Commune Software](https://commune.software).

This package owns file discovery, frontmatter extraction, `_meta.json` ordering, heading extraction, and generated manifest inputs. It is server-only: it depends on `@chakra-docs/core` for contracts and stays out of browser-facing bundles.

## Install

```bash
npm install @chakra-docs/source-filesystem
```

No peer dependencies (runs in Node.js >= 22.22).

## Usage

Describe your content with a discovery config, then build a `DocsManifest` from the files on disk:

```ts
import type { DocsManifest } from '@chakra-docs/core';
import {
  buildFilesystemManifest,
  defineDocsDiscoveryConfig,
} from '@chakra-docs/source-filesystem';

export const docsDiscoveryConfig = defineDocsDiscoveryConfig({
  rootDir: process.cwd(),
  collections: [
    {
      id: 'docs',
      name: 'Latest',
      contentPath: 'src/content/docs',
      basePath: '/docs',
    },
  ],
});

let manifestPromise: Promise<DocsManifest> | undefined;

export function getDocsManifest() {
  manifestPromise ??= buildFilesystemManifest({ config: docsDiscoveryConfig });
  return manifestPromise;
}
```

Each collection discovers `**/*.{md,mdx}` under its content directory (configurable via `include`/`exclude`), parses YAML frontmatter (`title`, `description`, `order`, `draft`, `hidden`, `navTitle`, `date`, `tags`, ...), extracts `h2`–`h6` headings with stable anchor ids, and derives titles and descriptions from the document body when frontmatter omits them. Known fields are validated at runtime, malformed or unterminated YAML fails with the file path, and draft pages are excluded from navigation. An optional `_meta.json` in the content root controls nav titles, ordering, hidden entries, and badges:

```json
{
  "getting-started": "Getting started",
  "advanced": { "title": "Advanced", "badge": "New" },
  "internal": { "hidden": true }
}
```

## Content limits

Filesystem discovery has fail-closed input budgets. Counts and byte sizes are checked across all filesystem-backed collections before metadata JSON, Markdown, frontmatter, or collection schemas are parsed. `maxFiles` counts content files selected by `include`/`exclude`; the one metadata JSON file selected for each collection is excluded from content discovery and does not increment that count, even when an `include` pattern matches it. Selected metadata counts once toward `maxFileBytes` and `maxTotalBytes`.

| Limit           | Default      | Meaning                                                |
| --------------- | ------------ | ------------------------------------------------------ |
| `maxFiles`      | `5_000`      | Maximum content files selected by `include`/`exclude`. |
| `maxFileBytes`  | `1_048_576`  | Maximum bytes in one content or metadata file (1 MiB). |
| `maxTotalBytes` | `52_428_800` | Maximum combined content and metadata bytes (50 MiB).  |

Override any limit per manifest build or lazy filesystem source; omitted limits retain their defaults:

```ts
const limits = {
  maxFiles: 2_000,
  maxFileBytes: 512 * 1024,
  maxTotalBytes: 20 * 1024 * 1024,
};

const manifest = await buildFilesystemManifest({
  config: docsDiscoveryConfig,
  limits,
});

const source = createFilesystemSource({
  config: docsDiscoveryConfig,
  limits,
});
```

Configured limits must be positive safe integers. `DEFAULT_FILESYSTEM_CONTENT_LIMITS` exports the frozen defaults for tooling and diagnostics. Custom `DocsSource` repositories manage their own input budgets because they do not read through this package's filesystem discovery.

If you prefer the `DocsSource` interface (for custom repositories or lazy loading), use `createFilesystemSource`:

```ts
import { createFilesystemSource } from '@chakra-docs/source-filesystem';

const source = createFilesystemSource({ config: docsDiscoveryConfig });
const page = await source.getPage({
  collectionId: 'docs',
  slug: ['getting-started'],
});
const nav = await source.getNav({ collectionId: 'docs' });
```

Collections can also point at `git` repositories synced by `@chakra-docs/source-git` (resolved from the repository cache directory) or at `custom` repositories that supply their own `DocsSource`.

Set a collection's `schema` to a [Standard Schema v1](https://standardschema.dev/) compatible validator to validate or transform frontmatter before page creation. Local, workspace-package, and Git repository roots are resolved explicitly; missing content roots, unknown repository ids, and paths that escape their configured roots are errors.

## API

- `defineDocsDiscoveryConfig(config)` — identity helper that preserves your config type while giving `DocsDiscoveryConfig` checking.
- `buildFilesystemManifest({ config, limits? })` — discover files for every collection and return a complete `DocsManifest` (pages, nav, indexes, search, sitemap, feeds).
- `createFilesystemSource({ config, manifest?, limits? })` — a lazy `DocsSource` (`getPage`, `getPages`, `getCollections`, `getManifest`, `getNav`) backed by the filesystem manifest; pass `manifest` to reuse a prebuilt one.
- `DEFAULT_FILESYSTEM_CONTENT_LIMITS` — frozen default values for all three content budgets.
- `FilesystemContentLimits`, `FilesystemSourceOptions`, `BuildFilesystemManifestOptions` — option types.

## Help and contributing

See the [project README](https://github.com/chakra-docs/chakra-docs#readme), [open an issue](https://github.com/chakra-docs/chakra-docs/issues), or read the [contribution guidelines](https://github.com/chakra-docs/chakra-docs/blob/main/CONTRIBUTING.md). Report vulnerabilities privately through the [security policy](https://github.com/chakra-docs/chakra-docs/security/policy).

## License

MIT
