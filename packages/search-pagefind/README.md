# @chakra-docs/search-pagefind

Pagefind document record helpers for Chakra Docs search manifests.

Created by [Ryan Hefner](https://www.ryanhefner.com) and [Commune Software](https://commune.software).

This package maps generated `DocsSearchRecord` data (from a Chakra Docs manifest's `search` array) into Pagefind-friendly document records with `url`, `title`, `content`, and `meta` fields.

## Install

```bash
npm install @chakra-docs/search-pagefind pagefind
```

Optional peer dependency: `pagefind` (>=1 <2) — only needed if you index the
records with Pagefind's Node API.

## Usage

```ts
import { createPagefindDocumentRecords } from '@chakra-docs/search-pagefind';
import * as pagefind from 'pagefind';
import { docsManifest } from './.chakra-docs/generated';

const records = createPagefindDocumentRecords(docsManifest.search);

const { index } = await pagefind.createIndex();

for (const record of records) {
  await index.addCustomRecord({
    url: record.url,
    content: record.content,
    language: 'en',
    meta: { title: record.title, ...record.meta },
  });
}

await index.writeFiles({ outputPath: 'public/pagefind' });
```

Page-level records map to the page route and heading-level records map to `route#heading-id`, so results can deep-link into sections. Canonically encoded route segments are preserved as-is in Pagefind URLs. Tags and aliases are appended to the indexed content so they participate in matching. Each record's `meta` carries the available document identity, display, source, tag, alias, and search-priority fields as strings (empty when absent).

## API

- `createPagefindDocumentRecords(records)` — map `DocsSearchRecord[]` to `PagefindDocumentRecord[]` (`url`, `title`, `content`, `meta`).
- `PagefindDocumentRecord` — result type.

## Help and contributing

See the [project README](https://github.com/chakra-docs/chakra-docs#readme), [open an issue](https://github.com/chakra-docs/chakra-docs/issues), or read the [contribution guidelines](https://github.com/chakra-docs/chakra-docs/blob/main/CONTRIBUTING.md). Report vulnerabilities privately through the [security policy](https://github.com/chakra-docs/chakra-docs/security/policy).

## License

MIT
