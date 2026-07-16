import type { DocsFeedEntry } from '@chakra-docs/core';

export interface FeedArtifacts {
  entries: DocsFeedEntry[];
  rss: string;
  atom: string;
  json: string;
}

export interface CreateFeedArtifactsOptions {
  title: string;
  siteUrl: string;
  description?: string;
  feedUrl?: string;
  language?: string;
  /** Fallback Atom timestamp for undated entries and empty feeds. */
  updated?: string | Date;
}

export function createFeedArtifacts(
  entries: DocsFeedEntry[],
  options: CreateFeedArtifactsOptions,
): FeedArtifacts {
  validateEntryDates(entries);
  validateFallbackUpdated(options.updated);
  const normalizedEntries = [...entries].sort(compareEntries);

  return {
    entries: normalizedEntries,
    rss: createRssFeed(normalizedEntries, options),
    atom: createAtomFeed(normalizedEntries, options),
    json: createJsonFeed(normalizedEntries, options),
  };
}

function createRssFeed(
  entries: DocsFeedEntry[],
  options: CreateFeedArtifactsOptions,
): string {
  const items = entries.map((entry) =>
    xmlElement('', 'item', [
      `<guid>${escapeXml(entry.id)}</guid>`,
      `<title>${escapeXml(entry.title)}</title>`,
      `<link>${escapeXml(resolveUrl(entry.url, options.siteUrl))}</link>`,
      entry.description
        ? `<description>${escapeXml(entry.description)}</description>`
        : undefined,
      entry.date ? `<pubDate>${formatRfc822(entry.date)}</pubDate>` : undefined,
      entry.author ? `<author>${escapeXml(entry.author)}</author>` : undefined,
      ...(entry.tags ?? []).map(
        (tag) => `<category>${escapeXml(tag)}</category>`,
      ),
    ]),
  );

  const channel = xmlElement('  ', 'channel', [
    `<title>${escapeXml(options.title)}</title>`,
    `<link>${escapeXml(options.siteUrl)}</link>`,
    `<description>${escapeXml(options.description ?? options.title)}</description>`,
    options.language
      ? `<language>${escapeXml(options.language)}</language>`
      : undefined,
    ...items,
  ]);

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
${channel}
</rss>`;
}

function createAtomFeed(
  entries: DocsFeedEntry[],
  options: CreateFeedArtifactsOptions,
): string {
  const entryUpdatedDates = entries.map((entry) => {
    const updated = entry.date ?? options.updated;

    if (updated === undefined) {
      throw new Error(
        `Atom entries require an updated timestamp. Entry "${entry.id}" has no date; provide entry.date or options.updated.`,
      );
    }

    return updated;
  });
  const newestDate = entryUpdatedDates.reduce<string | Date | undefined>(
    (newest, date) =>
      newest === undefined || toDate(date).getTime() > toDate(newest).getTime()
        ? date
        : newest,
    undefined,
  );
  const updated = formatIso(newestDate ?? options.updated ?? new Date(0));
  const items = entries.map((entry, index) =>
    xmlElement('  ', 'entry', [
      `<id>${escapeXml(entry.id)}</id>`,
      `<title>${escapeXml(entry.title)}</title>`,
      `<link href="${escapeXml(resolveUrl(entry.url, options.siteUrl))}" />`,
      `<updated>${formatIso(entryUpdatedDates[index])}</updated>`,
      entry.description
        ? `<summary>${escapeXml(entry.description)}</summary>`
        : undefined,
      entry.author
        ? `<author><name>${escapeXml(entry.author)}</name></author>`
        : undefined,
      ...(entry.tags ?? []).map(
        (tag) => `<category term="${escapeXml(tag)}" />`,
      ),
    ]),
  );

  const body = [
    `  <id>${escapeXml(options.siteUrl)}</id>`,
    `  <title>${escapeXml(options.title)}</title>`,
    `  <updated>${updated}</updated>`,
    `  <link href="${escapeXml(options.siteUrl)}" />`,
    options.feedUrl
      ? `  <link rel="self" href="${escapeXml(options.feedUrl)}" />`
      : undefined,
    ...items,
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
${body}
</feed>`;
}

function createJsonFeed(
  entries: DocsFeedEntry[],
  options: CreateFeedArtifactsOptions,
): string {
  return JSON.stringify(
    {
      version: 'https://jsonfeed.org/version/1.1',
      title: options.title,
      home_page_url: options.siteUrl,
      feed_url: options.feedUrl,
      description: options.description,
      language: options.language,
      items: entries.map((entry) => {
        const author = entry.author ? { name: entry.author } : undefined;

        return {
          id: entry.id,
          url: resolveUrl(entry.url, options.siteUrl),
          title: entry.title,
          content_text: entry.description ?? entry.title,
          summary: entry.description,
          date_published: entry.date ? formatIso(entry.date) : undefined,
          authors: author ? [author] : undefined,
          // Retain JSON Feed 1.0 compatibility while consumers migrate to
          // the 1.1 `authors` field.
          author,
          tags: entry.tags,
        };
      }),
    },
    null,
    2,
  );
}

function xmlElement(
  indent: string,
  tag: string,
  children: Array<string | undefined>,
): string {
  const lines = children
    .filter((child): child is string => child !== undefined)
    .flatMap((child) => child.split('\n'))
    .map((line) => `${indent}  ${line}`);

  return `${indent}<${tag}>\n${lines.join('\n')}\n${indent}</${tag}>`;
}

function compareEntries(a: DocsFeedEntry, b: DocsFeedEntry): number {
  if (a.date === undefined) {
    return b.date === undefined ? 0 : 1;
  }

  if (b.date === undefined) {
    return -1;
  }

  return toDate(b.date).getTime() - toDate(a.date).getTime();
}

function validateEntryDates(entries: DocsFeedEntry[]): void {
  for (const entry of entries) {
    if (entry.date === undefined) {
      continue;
    }

    if (!(typeof entry.date === 'string' || entry.date instanceof Date)) {
      throw new Error(
        `Invalid feed date for entry "${entry.id}": received ${JSON.stringify(entry.date)}. Expected a valid date string or Date object.`,
      );
    }

    const date = toDate(entry.date);

    if (Number.isNaN(date.getTime())) {
      const received =
        entry.date instanceof Date
          ? 'an invalid Date object'
          : JSON.stringify(entry.date);
      throw new Error(
        `Invalid feed date for entry "${entry.id}": received ${received}. Expected a valid date string or Date object.`,
      );
    }
  }
}

function validateFallbackUpdated(value: string | Date | undefined): void {
  if (value === undefined) {
    return;
  }

  if (!(typeof value === 'string' || value instanceof Date)) {
    throw new Error(
      `Invalid feed options.updated: received ${JSON.stringify(value)}. Expected a valid date string or Date object.`,
    );
  }

  const date = toDate(value);

  if (Number.isNaN(date.getTime())) {
    const received =
      value instanceof Date ? 'an invalid Date object' : JSON.stringify(value);
    throw new Error(
      `Invalid feed options.updated: received ${received}. Expected a valid date string or Date object.`,
    );
  }
}

function resolveUrl(url: string, siteUrl: string): string {
  if (/^https?:\/\//.test(url)) {
    return url;
  }

  return `${siteUrl.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
}

function formatIso(value: string | Date): string {
  return toDate(value).toISOString();
}

function formatRfc822(value: string | Date): string {
  return toDate(value).toUTCString();
}

function toDate(value: string | Date | undefined): Date {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  return value === undefined ? new Date(0) : new Date(value);
}

function escapeXml(value: string): string {
  return stripInvalidXmlCharacters(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function stripInvalidXmlCharacters(value: string): string {
  return Array.from(value)
    .filter((character) => isValidXmlCodePoint(character.codePointAt(0)))
    .join('');
}

function isValidXmlCodePoint(codePoint: number | undefined): boolean {
  return (
    codePoint === 0x9 ||
    codePoint === 0xa ||
    codePoint === 0xd ||
    (codePoint !== undefined &&
      ((codePoint >= 0x20 && codePoint <= 0xd7ff) ||
        (codePoint >= 0xe000 && codePoint <= 0xfffd) ||
        (codePoint >= 0x10000 && codePoint <= 0x10ffff)))
  );
}
