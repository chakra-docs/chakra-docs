import { describe, expect, it } from 'vitest';
import { createDocsManifest } from '@chakra-docs/core';
import type { DocsCollection, DocsPage } from '@chakra-docs/core';
import { createDocsRoutes } from './index.js';

const publishedPage: DocsPage = {
  id: 'docs:getting-started',
  collectionId: 'docs',
  slug: ['getting-started'],
  path: 'docs/getting-started.mdx',
  route: '/docs/getting-started',
  title: 'Getting started',
  frontmatter: {
    title: 'Getting started',
  },
};

const draftPage: DocsPage = {
  id: 'docs:drafts-wip',
  collectionId: 'docs',
  slug: ['drafts', 'wip'],
  path: 'docs/drafts/wip.mdx',
  route: '/docs/drafts/wip',
  title: 'Work in progress',
  frontmatter: {
    draft: true,
  },
};

const hiddenPage: DocsPage = {
  id: 'docs:internal',
  collectionId: 'docs',
  slug: ['internal'],
  path: 'docs/internal.mdx',
  route: '/docs/internal',
  title: 'Internal notes',
  frontmatter: {
    hidden: true,
  },
};

const collection: DocsCollection = {
  id: 'docs',
  name: 'Documentation',
  basePath: '/docs',
  pages: [publishedPage, draftPage, hiddenPage],
  nav: [],
};

const manifest = createDocsManifest({ collections: [collection] });

describe('createDocsRoutes', () => {
  it('accepts a manifest directly and returns route objects for published pages', () => {
    expect(createDocsRoutes(manifest)).toEqual([
      {
        id: 'docs:getting-started',
        path: '/docs/getting-started',
        handle: {
          docsPageId: 'docs:getting-started',
        },
      },
    ]);
  });

  it('accepts an options object with a manifest property', () => {
    expect(createDocsRoutes({ manifest })).toEqual(createDocsRoutes(manifest));
  });

  it('excludes draft and hidden pages by default', () => {
    const ids = createDocsRoutes(manifest).map((route) => route.id);

    expect(ids).not.toContain('docs:drafts-wip');
    expect(ids).not.toContain('docs:internal');
  });

  it('includes draft pages when includeDrafts is set', () => {
    expect(createDocsRoutes({ manifest, includeDrafts: true })).toEqual([
      {
        id: 'docs:getting-started',
        path: '/docs/getting-started',
        handle: { docsPageId: 'docs:getting-started' },
      },
      {
        id: 'docs:drafts-wip',
        path: '/docs/drafts/wip',
        handle: { docsPageId: 'docs:drafts-wip' },
      },
    ]);
  });

  it('includes hidden pages when includeHidden is set', () => {
    expect(createDocsRoutes({ manifest, includeHidden: true })).toEqual([
      {
        id: 'docs:getting-started',
        path: '/docs/getting-started',
        handle: { docsPageId: 'docs:getting-started' },
      },
      {
        id: 'docs:internal',
        path: '/docs/internal',
        handle: { docsPageId: 'docs:internal' },
      },
    ]);
  });

  it('preserves distinct collection base paths for matching slugs', () => {
    const v1Page = {
      ...publishedPage,
      id: 'v1:getting-started',
      collectionId: 'v1',
      route: '/docs/v1/getting-started',
    };
    const v2Page = {
      ...publishedPage,
      id: 'v2:getting-started',
      collectionId: 'v2',
      route: '/docs/v2/getting-started',
    };
    const versionedManifest = createDocsManifest({
      collections: [
        { id: 'v1', basePath: '/docs/v1', nav: [], pages: [v1Page] },
        { id: 'v2', basePath: '/docs/v2', nav: [], pages: [v2Page] },
      ],
    });

    expect(
      createDocsRoutes(versionedManifest).map((route) => route.path),
    ).toEqual(['/docs/v1/getting-started', '/docs/v2/getting-started']);
  });

  it('encodes literal route segments that React Router would treat as patterns', () => {
    const specialPage = {
      ...publishedPage,
      id: 'docs:special',
      slug: [':configuration', '*'],
      route: '/docs/:configuration/*',
    };
    const specialManifest = createDocsManifest({
      collections: [
        {
          id: 'docs',
          basePath: '/docs',
          nav: [],
          pages: [specialPage],
        },
      ],
    });

    expect(createDocsRoutes(specialManifest)[0].path).toBe(
      '/docs/%3Aconfiguration/%2A',
    );
  });

  it('preserves canonical encoding without double-encoding segments', () => {
    const encodedPage = {
      ...publishedPage,
      id: 'docs:encoded',
      slug: [':configuration', '*'],
      route: '/docs/%3Aconfiguration/%2A',
    };
    const encodedManifest = createDocsManifest({
      collections: [
        {
          id: 'docs',
          basePath: '/docs',
          nav: [],
          pages: [encodedPage],
        },
      ],
    });

    expect(createDocsRoutes(encodedManifest)[0].path).toBe(
      '/docs/%3Aconfiguration/%2A',
    );
  });

  it('preserves encoded dot segments instead of creating traversal syntax', () => {
    const encodedPage = {
      ...publishedPage,
      id: 'docs:dots',
      slug: ['.', '..'],
      route: '/docs/%2E/%2E%2E',
    };
    const encodedManifest = createDocsManifest({
      collections: [
        {
          id: 'docs',
          basePath: '/docs',
          nav: [],
          pages: [encodedPage],
        },
      ],
    });

    expect(createDocsRoutes(encodedManifest)[0].path).toBe('/docs/%2E/%2E%2E');
  });

  it('rejects malformed encodings and encoded path separators', () => {
    function createRouteManifest(route: string) {
      return createDocsManifest({
        collections: [
          {
            id: 'docs',
            basePath: '/docs',
            nav: [],
            pages: [{ ...publishedPage, route }],
          },
        ],
      });
    }

    expect(() =>
      createDocsRoutes(createRouteManifest('/docs/bad%value')),
    ).toThrow('malformed percent-encoding');
    expect(() => createDocsRoutes(createRouteManifest('/docs/a%2Fb'))).toThrow(
      'encoded path separator',
    );
  });
});
