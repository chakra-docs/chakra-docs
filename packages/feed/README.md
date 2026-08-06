# @chakra-docs/feed

RSS, Atom, and JSON Feed artifact helpers for Chakra Docs.

Created by [Ryan Hefner](https://www.ryanhefner.com) and [Commune Software](https://commune.software).

This package converts normalized `DocsFeedEntry` records (from a Chakra Docs manifest's `feeds` array) into RSS 2.0, Atom, and JSON Feed 1.1 artifacts while keeping feed serialization out of core runtime packages.

## Install

```bash
npm install @chakra-docs/feed
```

No peer dependencies.

## Usage

```ts
import { writeFile } from 'node:fs/promises';
import { createFeedArtifacts } from '@chakra-docs/feed';
import { docsManifest } from './.chakra-docs/generated';

const { rss, atom, json } = createFeedArtifacts(docsManifest.feeds, {
  title: 'Docs',
  siteUrl: 'https://example.com',
  description: 'Product documentation updates',
  feedUrl: 'https://example.com/feed.xml',
  language: 'en',
  // Used when a manifest entry has no date.
  updated: '2026-03-15T12:00:00.000Z',
});

await writeFile('public/feed.xml', rss, 'utf8');
await writeFile('public/atom.xml', atom, 'utf8');
await writeFile('public/feed.json', json, 'utf8');
```

Entries are sorted newest-first by date. Atom requires an `<updated>` value for every entry, so undated entries use `options.updated`; serialization throws with the entry id when neither timestamp exists. Invalid date strings or `Date` objects throw before any feed is serialized. Relative entry URLs are resolved against `siteUrl`, XML output is escaped, XML 1.0-forbidden control characters are removed, and entry `description`, `author`, and `tags` map to the matching feed fields (RSS `<category>`, Atom `<category term>`, JSON Feed `tags`). Every JSON Feed item includes the required `content_text`, using the entry description or falling back to its title. Authors use the JSON Feed 1.1 `authors` array and also include the legacy singular `author` field for JSON Feed 1.0 reader compatibility. Only `title` and `siteUrl` are required options; `description`, `feedUrl`, `language`, and `updated` are optional. An empty Atom feed without `updated` uses the Unix epoch for deterministic output.

## API

- `createFeedArtifacts(entries, options)` — build a `FeedArtifacts` object from `DocsFeedEntry[]`: the normalized (sorted) `entries` plus `rss`, `atom`, and `json` strings ready to write to disk or serve.
- `FeedArtifacts`, `CreateFeedArtifactsOptions` — result and option types.

## Help and contributing

See the [project README](https://github.com/chakra-docs/chakra-docs#readme), [open an issue](https://github.com/chakra-docs/chakra-docs/issues), or read the [contribution guidelines](https://github.com/chakra-docs/chakra-docs/blob/main/CONTRIBUTING.md). Report vulnerabilities privately through the [security policy](https://github.com/chakra-docs/chakra-docs/security/policy).

## License

MIT
