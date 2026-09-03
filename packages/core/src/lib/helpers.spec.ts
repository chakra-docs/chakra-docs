import { describe, expect, it } from 'vitest';
import {
  createDocsManifest,
  createCollectionOptions,
  createFeedEntries,
  createSearchRecords,
  createSitemapEntries,
  getDocsCollection,
  getPageByRoute,
  getPageBySlug,
  getPagesByCollection,
  getPublishedPages,
  sanitizeRepositoryId,
} from './helpers.js';
import type { DocsCollection, DocsManifest, DocsPage } from './types.js';

const jsPage: DocsPage = {
  id: 'js:getting-started',
  collectionId: 'js-node',
  slug: ['getting-started'],
  path: 'packages/node/docs/getting-started.mdx',
  route: '/docs/js-node/getting-started',
  title: 'Getting started',
  description: 'Install the JavaScript SDK.',
  frontmatter: {
    title: 'Getting started',
    date: '2026-01-01',
    tags: ['sdk'],
  },
  body: '## Install\nInstall and configure the JavaScript SDK.',
  headings: [{ id: 'install', title: 'Install', level: 2 }],
};

const phpPage: DocsPage = {
  id: 'php:getting-started',
  collectionId: 'php',
  slug: ['getting-started'],
  path: 'docs/getting-started.mdx',
  route: '/docs/php/getting-started',
  title: 'Getting started',
  frontmatter: {
    title: 'Getting started',
  },
};

const hiddenPage: DocsPage = {
  id: 'js:hidden',
  collectionId: 'js-node',
  slug: ['hidden'],
  path: 'packages/node/docs/hidden.mdx',
  route: '/docs/js-node/hidden',
  title: 'Hidden',
  frontmatter: {
    hidden: true,
  },
};

const collections: DocsCollection[] = [
  {
    id: 'js-node',
    name: 'JavaScript / Node.js',
    basePath: '/docs/js-node',
    pages: [jsPage, hiddenPage],
    nav: [
      {
        id: 'js:getting-started',
        title: 'Getting started',
        href: jsPage.route,
      },
    ],
  },
  {
    id: 'php',
    name: 'PHP',
    basePath: '/docs/php',
    pages: [phpPage],
    nav: [
      {
        id: 'php:getting-started',
        title: 'Getting started',
        href: phpPage.route,
      },
    ],
  },
];

describe('docs manifest helpers', () => {
  it('indexes pages by collection slug and route', () => {
    const manifest = createDocsManifest({ collections });

    expect(getPageBySlug(manifest, 'js-node', ['getting-started'])).toBe(
      jsPage,
    );
    expect(getPageBySlug(manifest, 'php', ['getting-started'])).toBe(phpPage);
    expect(getPageByRoute(manifest, 'docs/js-node/getting-started')).toBe(
      jsPage,
    );
    expect(getPagesByCollection(manifest, 'php')).toEqual([phpPage]);
  });

  it('filters draft and hidden pages by default', () => {
    expect(getPublishedPages([jsPage, hiddenPage])).toEqual([jsPage]);
    expect(
      getPublishedPages([jsPage, hiddenPage], { includeHidden: true }),
    ).toEqual([jsPage, hiddenPage]);
  });

  it('creates collection options from collection labels', () => {
    expect(createCollectionOptions(collections)).toEqual([
      { id: 'js-node', label: 'JavaScript / Node.js' },
      { id: 'php', label: 'PHP' },
    ]);
  });

  it('throws on duplicate collection ids, slugs, and routes', () => {
    expect(() =>
      createDocsManifest({
        collections: [
          { id: 'docs', basePath: '/docs', pages: [], nav: [] },
          { id: 'docs', basePath: '/reference', pages: [], nav: [] },
        ],
      }),
    ).toThrow('Duplicate docs collection id "docs".');

    expect(() =>
      createDocsManifest({
        collections: [
          {
            id: 'docs',
            basePath: '/docs',
            pages: [
              { ...jsPage, collectionId: 'docs', id: 'a' },
              { ...jsPage, collectionId: 'docs', id: 'b' },
            ],
            nav: [],
          },
        ],
      }),
    ).toThrow('Duplicate docs slug "getting-started" in collection "docs".');

    expect(() =>
      createDocsManifest({
        collections: [
          {
            id: 'docs',
            basePath: '/docs',
            pages: [
              { ...jsPage, collectionId: 'docs', slug: ['a'], id: 'a' },
              { ...jsPage, collectionId: 'docs', slug: ['b'], id: 'b' },
            ],
            nav: [],
          },
        ],
      }),
    ).toThrow('Duplicate docs route "/docs/js-node/getting-started".');
  });

  it('throws on duplicate page ids even when slugs and routes differ', () => {
    expect(() =>
      createDocsManifest({
        collections: [
          {
            id: 'docs',
            basePath: '/docs',
            pages: [
              {
                ...jsPage,
                collectionId: 'docs',
                id: 'same',
                slug: ['one'],
                route: '/one',
              },
              {
                ...phpPage,
                collectionId: 'docs',
                id: 'same',
                slug: ['two'],
                route: '/two',
              },
            ],
            nav: [],
          },
        ],
      }),
    ).toThrow('Duplicate docs page id "same".');
  });

  it('rejects pages placed in a different collection than their collectionId', () => {
    expect(() =>
      createDocsManifest({
        collections: [
          {
            id: 'docs',
            basePath: '/docs',
            pages: [jsPage],
            nav: [],
          },
        ],
      }),
    ).toThrow(
      'Docs page "js:getting-started" belongs to collection "js-node" but was provided in collection "docs".',
    );
  });

  it('sanitizes repository ids without allowing dot-directory escapes', () => {
    expect(sanitizeRepositoryId('my repo!')).toBe('my-repo-');
    expect(() => sanitizeRepositoryId('..')).toThrow(
      'Invalid docs repository id',
    );
  });

  it('keeps only credential-free, public repository metadata', () => {
    const repository = Object.assign(
      {
        id: 'remote',
        type: 'git' as const,
        url: 'https://build-user:s3cr3t@example.com/docs.git?token=hidden#private',
        ref: 'main',
        subdir: 'docs',
      },
      {
        rootDir: '/Users/example/private/docs',
        cacheDir: '/Users/example/private/cache',
      },
    );
    const manifest = createDocsManifest({
      repositories: [repository],
      collections,
    });
    const serialized = JSON.stringify(manifest);

    expect(manifest.repositories).toEqual([
      {
        id: 'remote',
        type: 'git',
        url: 'https://example.com/docs.git',
        ref: 'main',
        subdir: 'docs',
      },
    ]);
    expect(serialized).not.toContain('s3cr3t');
    expect(serialized).not.toContain('token=hidden');
    expect(serialized).not.toContain('/Users/example/private');
    expect(serialized).not.toContain('cacheDir');
    expect(serialized).not.toContain('rootDir');
  });

  it('safely indexes prototype-named collections and slugs', () => {
    const specialKeys = ['__proto__', 'constructor', 'toString'];
    const specialCollections: DocsCollection[] = specialKeys.map(
      (key, index) => {
        const page: DocsPage = {
          ...jsPage,
          id: `special:${index}`,
          collectionId: key,
          slug: [key],
          route: `/special/${index}`,
        };

        return {
          id: key,
          basePath: `/special/${index}`,
          pages: [page],
          nav: [],
        };
      },
    );
    const manifest = createDocsManifest({ collections: specialCollections });

    expect(Object.getPrototypeOf(manifest.byCollection)).toBeNull();
    expect(Object.getPrototypeOf(manifest.bySlug)).toBeNull();
    expect(Object.getPrototypeOf(manifest.byRoute)).toBeNull();

    for (const [index, key] of specialKeys.entries()) {
      expect(Object.getPrototypeOf(manifest.bySlug[key])).toBeNull();
      expect(getDocsCollection(manifest, key)).toBe(specialCollections[index]);
      expect(getPageBySlug(manifest, key, [key])).toBe(
        specialCollections[index].pages[0],
      );
    }

    const restored = JSON.parse(JSON.stringify(manifest)) as DocsManifest;

    for (const [index, key] of specialKeys.entries()) {
      expect(getDocsCollection(restored, key)?.id).toBe(key);
      expect(getPageBySlug(restored, key, [key])?.id).toBe(`special:${index}`);
    }

    expect(getDocsCollection(restored, 'hasOwnProperty')).toBeNull();
    expect(
      getPageBySlug(restored, 'hasOwnProperty', ['constructor']),
    ).toBeNull();
    expect(getPageByRoute(restored, 'toString')).toBeNull();
  });

  it('creates search, sitemap, and feed records from published pages', () => {
    expect(createSearchRecords([jsPage, hiddenPage])).toEqual([
      expect.objectContaining({
        id: jsPage.id,
        kind: 'page',
        collectionId: 'js-node',
        route: jsPage.route,
        text: expect.stringContaining('Install'),
      }),
      expect.objectContaining({
        id: `${jsPage.id}#install`,
        kind: 'heading',
        pageId: jsPage.id,
        route: `${jsPage.route}#install`,
        title: 'Install',
        pageTitle: 'Getting started',
        sectionTitle: 'Install',
        text: expect.stringContaining('JavaScript SDK'),
      }),
    ]);

    expect(
      createSitemapEntries([jsPage], { siteUrl: 'https://example.com' }),
    ).toEqual([
      {
        url: 'https://example.com/docs/js-node/getting-started',
        lastModified: '2026-01-01',
      },
    ]);

    expect(
      createFeedEntries([jsPage, phpPage], { siteUrl: 'https://example.com' }),
    ).toEqual([
      expect.objectContaining({
        id: jsPage.id,
        url: 'https://example.com/docs/js-node/getting-started',
      }),
    ]);
  });

  it('copies search aliases and priority into page and heading records', () => {
    const records = createSearchRecords([
      {
        ...jsPage,
        frontmatter: {
          ...jsPage.frontmatter,
          aliases: ['js sdk', 'node client'],
          searchPriority: 4,
        },
      },
    ]);

    expect(records).not.toHaveLength(0);
    expect(records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          aliases: ['js sdk', 'node client'],
          searchPriority: 4,
        }),
      ]),
    );
    expect(
      records.every(
        (record) =>
          record.searchPriority === 4 && record.aliases?.[0] === 'js sdk',
      ),
    ).toBe(true);
  });

  it('keeps section search text aligned when code fences use mixed markers', () => {
    const page: DocsPage = {
      ...jsPage,
      id: 'js:fences',
      slug: ['fences'],
      route: '/docs/js-node/fences',
      body: [
        '## Visible',
        'before',
        '```md',
        '~~~',
        '## Not a section',
        '```',
        'after',
      ].join('\n'),
      headings: [{ id: 'visible', title: 'Visible', level: 2 }],
    };

    const headingRecord = createSearchRecords([page]).find(
      (record) => record.kind === 'heading',
    );

    expect(headingRecord?.text).toContain('after');
  });
});
