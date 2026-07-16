import { describe, expect, it } from 'vitest';
import type { DocsFeedEntry } from '@chakra-docs/core';
import { createFeedArtifacts } from './index.js';
import type { CreateFeedArtifactsOptions } from './index.js';

const oldestEntry: DocsFeedEntry = {
  id: 'docs:alpha',
  url: '/docs/alpha',
  title: 'Alpha & Omega',
  description: 'Covers <angle> "quoted" & \'apostrophe\' cases.',
  date: '2026-01-01T00:00:00.000Z',
  author: 'Ada Lovelace',
  tags: ['news', 'release'],
};

const newestEntry: DocsFeedEntry = {
  id: 'docs:beta',
  url: 'https://external.example.org/beta',
  title: 'Beta',
  date: '2026-03-15T12:00:00.000Z',
};

const undatedEntry: DocsFeedEntry = {
  id: 'docs:gamma',
  url: '/docs/gamma',
  title: 'Gamma',
};

const entries = [undatedEntry, oldestEntry, newestEntry];

const options: CreateFeedArtifactsOptions = {
  title: 'Docs & Updates',
  siteUrl: 'https://example.com/',
  description: 'Latest documentation updates.',
  feedUrl: 'https://example.com/feed.xml',
  language: 'en',
  updated: '2025-12-31T00:00:00.000Z',
};

function extractItem(feed: string, marker: string): string {
  const items = feed.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const item = items.find((candidate) => candidate.includes(marker));

  expect(item).toBeDefined();
  return item as string;
}

describe('createFeedArtifacts entries', () => {
  it('sorts entries newest-first with undated entries last', () => {
    const artifacts = createFeedArtifacts(entries, options);

    expect(artifacts.entries.map((entry) => entry.id)).toEqual([
      'docs:beta',
      'docs:alpha',
      'docs:gamma',
    ]);
  });

  it('keeps undated entries after dates before the Unix epoch', () => {
    const artifacts = createFeedArtifacts(
      [undatedEntry, { ...oldestEntry, date: '1960-01-01T00:00:00.000Z' }],
      options,
    );

    expect(artifacts.entries.map((entry) => entry.id)).toEqual([
      'docs:alpha',
      'docs:gamma',
    ]);
  });

  it('does not mutate the input array', () => {
    const input = [undatedEntry, oldestEntry, newestEntry];
    createFeedArtifacts(input, options);

    expect(input.map((entry) => entry.id)).toEqual([
      'docs:gamma',
      'docs:alpha',
      'docs:beta',
    ]);
  });

  it('rejects invalid date strings with the entry id', () => {
    expect(() =>
      createFeedArtifacts(
        [{ ...oldestEntry, id: 'docs:bad-date', date: 'not-a-date' }],
        options,
      ),
    ).toThrow(
      'Invalid feed date for entry "docs:bad-date": received "not-a-date"',
    );
  });

  it('rejects invalid Date objects with a useful error', () => {
    expect(() =>
      createFeedArtifacts(
        [{ ...oldestEntry, id: 'docs:bad-object', date: new Date('invalid') }],
        options,
      ),
    ).toThrow('received an invalid Date object');
  });

  it('rejects empty strings and runtime values outside the public date type', () => {
    expect(() =>
      createFeedArtifacts(
        [{ ...oldestEntry, id: 'docs:empty-date', date: '' }],
        options,
      ),
    ).toThrow('Invalid feed date for entry "docs:empty-date"');
    expect(() =>
      createFeedArtifacts(
        [
          {
            ...oldestEntry,
            id: 'docs:number-date',
            date: 123 as unknown as string,
          },
        ],
        options,
      ),
    ).toThrow('Invalid feed date for entry "docs:number-date"');
  });

  it('rejects undated Atom entries unless a fallback timestamp is provided', () => {
    expect(() =>
      createFeedArtifacts([undatedEntry], {
        title: 'Docs',
        siteUrl: 'https://example.com',
      }),
    ).toThrow(
      'Atom entries require an updated timestamp. Entry "docs:gamma" has no date',
    );
  });

  it('rejects invalid fallback timestamps before serialization', () => {
    expect(() =>
      createFeedArtifacts([undatedEntry], {
        ...options,
        updated: 'not-a-date',
      }),
    ).toThrow('Invalid feed options.updated: received "not-a-date"');
  });
});

describe('createFeedArtifacts rss', () => {
  it('produces an rss 2.0 document with channel metadata', () => {
    const { rss } = createFeedArtifacts(entries, options);

    expect(rss).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(rss).toContain('<rss version="2.0">');
    expect(rss).toContain('<title>Docs &amp; Updates</title>');
    expect(rss).toContain('<link>https://example.com/</link>');
    expect(rss).toContain(
      '<description>Latest documentation updates.</description>',
    );
    expect(rss).toContain('<language>en</language>');
  });

  it('falls back to the title as channel description and omits language when not provided', () => {
    const { rss } = createFeedArtifacts(entries, {
      title: 'Docs',
      siteUrl: 'https://example.com',
      updated: '2025-12-31T00:00:00.000Z',
    });

    expect(rss).toContain('<description>Docs</description>');
    expect(rss).not.toContain('<language>');
  });

  it('renders guid, title and link for every item', () => {
    const { rss } = createFeedArtifacts(entries, options);

    const alpha = extractItem(rss, '<guid>docs:alpha</guid>');
    expect(alpha).toContain('<title>Alpha &amp; Omega</title>');
    expect(alpha).toContain('<link>https://example.com/docs/alpha</link>');

    const beta = extractItem(rss, '<guid>docs:beta</guid>');
    expect(beta).toContain('<link>https://external.example.org/beta</link>');
  });

  it('renders optional item fields only when present', () => {
    const { rss } = createFeedArtifacts(entries, options);

    const alpha = extractItem(rss, '<guid>docs:alpha</guid>');
    expect(alpha).toContain(
      `<pubDate>${new Date('2026-01-01T00:00:00.000Z').toUTCString()}</pubDate>`,
    );
    expect(alpha).toContain('<author>Ada Lovelace</author>');
    expect(alpha).toContain('<category>news</category>');
    expect(alpha).toContain('<category>release</category>');
    expect(alpha).toContain('<description>');

    const gamma = extractItem(rss, '<guid>docs:gamma</guid>');
    expect(gamma).not.toContain('<pubDate>');
    expect(gamma).not.toContain('<author>');
    expect(gamma).not.toContain('<category>');
    expect(gamma).not.toContain('<description>');
  });

  it('orders items newest-first', () => {
    const { rss } = createFeedArtifacts(entries, options);

    const betaIndex = rss.indexOf('<guid>docs:beta</guid>');
    const alphaIndex = rss.indexOf('<guid>docs:alpha</guid>');
    const gammaIndex = rss.indexOf('<guid>docs:gamma</guid>');

    expect(betaIndex).toBeGreaterThan(-1);
    expect(betaIndex).toBeLessThan(alphaIndex);
    expect(alphaIndex).toBeLessThan(gammaIndex);
  });

  it('contains no blank or whitespace-only lines', () => {
    const { rss } = createFeedArtifacts(entries, options);

    for (const line of rss.split('\n')) {
      expect(line.trim()).not.toBe('');
    }
  });
});

describe('createFeedArtifacts atom', () => {
  it('produces an atom document with feed metadata', () => {
    const { atom } = createFeedArtifacts(entries, options);

    expect(atom).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
    expect(atom).toContain('<id>https://example.com/</id>');
    expect(atom).toContain('<title>Docs &amp; Updates</title>');
    expect(atom).toContain('<link href="https://example.com/" />');
  });

  it('sets feed-level updated to the newest dated entry timestamp', () => {
    const { atom } = createFeedArtifacts(entries, options);

    expect(atom).toContain('<updated>2026-03-15T12:00:00.000Z</updated>');
  });

  it('uses the newest dated entry even when an undated entry is first in the input', () => {
    const { atom } = createFeedArtifacts([undatedEntry, oldestEntry], options);

    expect(atom).toContain('<updated>2026-01-01T00:00:00.000Z</updated>');
    expect(atom).not.toContain('<updated>1970-01-01T00:00:00.000Z</updated>');
  });

  it('uses options.updated for undated entries', () => {
    const { atom } = createFeedArtifacts([undatedEntry], options);

    expect(atom).toContain('<updated>2025-12-31T00:00:00.000Z</updated>');
  });

  it('uses the epoch for an empty feed without an explicit timestamp', () => {
    const { atom } = createFeedArtifacts([], {
      title: 'Docs',
      siteUrl: 'https://example.com',
    });

    expect(atom).toContain('<updated>1970-01-01T00:00:00.000Z</updated>');
  });

  it('includes a self link only when feedUrl is provided', () => {
    const withSelf = createFeedArtifacts(entries, options).atom;
    const withoutSelf = createFeedArtifacts(entries, {
      title: 'Docs',
      siteUrl: 'https://example.com',
      updated: '2025-12-31T00:00:00.000Z',
    }).atom;

    expect(withSelf).toContain(
      '<link rel="self" href="https://example.com/feed.xml" />',
    );
    expect(withoutSelf).not.toContain('rel="self"');
  });

  it('renders required and optional entry fields', () => {
    const { atom } = createFeedArtifacts(entries, options);

    expect(atom).toContain('<id>docs:alpha</id>');
    expect(atom).toContain('<link href="https://example.com/docs/alpha" />');
    expect(atom).toContain('<updated>2026-01-01T00:00:00.000Z</updated>');
    expect(atom).toContain('<author><name>Ada Lovelace</name></author>');
    expect(atom).toContain('<category term="news" />');

    const gammaEntry = atom.match(
      /<entry>(?:(?!<entry>)[\s\S])*docs:gamma[\s\S]*?<\/entry>/,
    );
    expect(gammaEntry).not.toBeNull();
    expect(gammaEntry?.[0]).toContain(
      '<updated>2025-12-31T00:00:00.000Z</updated>',
    );
    expect(gammaEntry?.[0]).not.toContain('<summary>');
    expect(gammaEntry?.[0]).not.toContain('<author>');
  });

  it('contains no blank or whitespace-only lines', () => {
    const { atom } = createFeedArtifacts(entries, options);

    for (const line of atom.split('\n')) {
      expect(line.trim()).not.toBe('');
    }
  });
});

describe('createFeedArtifacts json', () => {
  it('produces a json feed 1.1 document with resolved item urls', () => {
    const { json } = createFeedArtifacts(entries, options);
    const parsed = JSON.parse(json) as {
      version: string;
      title: string;
      home_page_url: string;
      feed_url: string;
      items: Array<{ id: string; url: string; title: string }>;
    };

    expect(parsed.version).toBe('https://jsonfeed.org/version/1.1');
    expect(parsed.title).toBe('Docs & Updates');
    expect(parsed.home_page_url).toBe('https://example.com/');
    expect(parsed.feed_url).toBe('https://example.com/feed.xml');
    expect(parsed.items.map((item) => item.id)).toEqual([
      'docs:beta',
      'docs:alpha',
      'docs:gamma',
    ]);
    expect(parsed.items.map((item) => item.url)).toEqual([
      'https://external.example.org/beta',
      'https://example.com/docs/alpha',
      'https://example.com/docs/gamma',
    ]);
  });
});

describe('url resolution', () => {
  it('passes absolute http(s) urls through unchanged', () => {
    const { json } = createFeedArtifacts([newestEntry], options);
    const parsed = JSON.parse(json) as { items: Array<{ url: string }> };

    expect(parsed.items[0].url).toBe('https://external.example.org/beta');
  });

  it('joins relative urls to siteUrl without duplicate slashes', () => {
    const { json } = createFeedArtifacts([oldestEntry], {
      title: 'Docs',
      siteUrl: 'https://example.com///',
    });
    const parsed = JSON.parse(json) as { items: Array<{ url: string }> };

    expect(parsed.items[0].url).toBe('https://example.com/docs/alpha');
  });
});

describe('xml escaping', () => {
  it('escapes &, <, >, " and \' in titles and descriptions', () => {
    const { rss, atom } = createFeedArtifacts([oldestEntry], options);

    expect(rss).toContain('<title>Alpha &amp; Omega</title>');
    expect(rss).toContain(
      '<description>Covers &lt;angle&gt; &quot;quoted&quot; &amp; &apos;apostrophe&apos; cases.</description>',
    );
    expect(atom).toContain(
      '<summary>Covers &lt;angle&gt; &quot;quoted&quot; &amp; &apos;apostrophe&apos; cases.</summary>',
    );
    expect(rss).not.toContain('Alpha & Omega</title>');
  });

  it('strips XML-forbidden controls while preserving valid whitespace and Unicode', () => {
    const invalidCharacters =
      '\u0000\u0001\u0008\u000b\u000c\u001f\ud800\ufffe\uffff';
    const entry = {
      ...oldestEntry,
      id: `docs:${invalidCharacters}rocket-🚀`,
      title: `Before${invalidCharacters}\tAfter 🚀`,
      description: `Line one\nLine two${invalidCharacters}`,
    };
    const { atom, rss } = createFeedArtifacts([entry], {
      ...options,
      title: `Docs${invalidCharacters} 🚀`,
    });

    for (const xml of [atom, rss]) {
      expect(Array.from(xml).some(isForbiddenXmlCharacter)).toBe(false);
      expect(xml).toContain('🚀');
      expect(xml).toContain('\t');
      expect(xml).toContain('\n');
    }
  });
});

function isForbiddenXmlCharacter(character: string): boolean {
  const codePoint = character.codePointAt(0);

  return !(
    codePoint === 0x9 ||
    codePoint === 0xa ||
    codePoint === 0xd ||
    (codePoint !== undefined &&
      ((codePoint >= 0x20 && codePoint <= 0xd7ff) ||
        (codePoint >= 0xe000 && codePoint <= 0xfffd) ||
        (codePoint >= 0x10000 && codePoint <= 0x10ffff)))
  );
}
