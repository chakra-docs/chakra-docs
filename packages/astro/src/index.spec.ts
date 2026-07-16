import { describe, expect, it } from 'vitest';
import { createDocsManifest } from '@chakra-docs/core';
import type { DocsCollection, DocsPage } from '@chakra-docs/core';
import { createAstroStaticPaths } from './index.js';

const rootPage: DocsPage = {
  id: 'docs:index',
  collectionId: 'docs',
  slug: [],
  path: 'docs/index.mdx',
  route: '/docs',
  title: 'Documentation',
  frontmatter: {
    title: 'Documentation',
  },
};

const nestedPage: DocsPage = {
  id: 'docs:guides-install',
  collectionId: 'docs',
  slug: ['guides', 'install'],
  path: 'docs/guides/install.mdx',
  route: '/docs/guides/install',
  title: 'Install',
  frontmatter: {
    title: 'Install',
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
  pages: [rootPage, nestedPage, draftPage, hiddenPage],
  nav: [],
};

const manifest = createDocsManifest({ collections: [collection] });

const multiCollectionManifest = createDocsManifest({
  collections: [
    {
      id: 'v1',
      basePath: '/docs/v1',
      nav: [],
      pages: [
        {
          ...nestedPage,
          id: 'v1:intro',
          collectionId: 'v1',
          slug: ['intro'],
          route: '/docs/v1/intro',
        },
      ],
    },
    {
      id: 'v2',
      basePath: '/docs/v2',
      nav: [],
      pages: [
        {
          ...nestedPage,
          id: 'v2:intro',
          collectionId: 'v2',
          slug: ['intro'],
          route: '/docs/v2/intro',
        },
      ],
    },
  ],
});

describe('createAstroStaticPaths', () => {
  it('accepts a manifest directly and excludes draft and hidden pages', () => {
    expect(createAstroStaticPaths(manifest)).toEqual([
      { params: { slug: undefined } },
      { params: { slug: 'guides/install' } },
    ]);
  });

  it('accepts an options object with a manifest property', () => {
    expect(createAstroStaticPaths({ manifest })).toEqual([
      { params: { slug: undefined } },
      { params: { slug: 'guides/install' } },
    ]);
  });

  it('maps an empty slug to undefined params.slug', () => {
    const [rootPath] = createAstroStaticPaths(manifest);

    expect(rootPath.params.slug).toBeUndefined();
  });

  it('joins nested slug segments with a slash', () => {
    const paths = createAstroStaticPaths(manifest);

    expect(paths[1].params.slug).toBe('guides/install');
  });

  it('includes draft pages when includeDrafts is set', () => {
    expect(createAstroStaticPaths({ manifest, includeDrafts: true })).toEqual([
      { params: { slug: undefined } },
      { params: { slug: 'guides/install' } },
      { params: { slug: 'drafts/wip' } },
    ]);
  });

  it('includes hidden pages when includeHidden is set', () => {
    expect(createAstroStaticPaths({ manifest, includeHidden: true })).toEqual([
      { params: { slug: undefined } },
      { params: { slug: 'guides/install' } },
      { params: { slug: 'internal' } },
    ]);
  });

  it('preserves collection path segments for multi-collection routes', () => {
    expect(createAstroStaticPaths(multiCollectionManifest)).toEqual([
      { params: { slug: 'v1/intro' } },
      { params: { slug: 'v2/intro' } },
    ]);
  });

  it('supports an explicit route base path', () => {
    expect(
      createAstroStaticPaths({
        manifest: multiCollectionManifest,
        basePath: '/',
      }),
    ).toEqual([
      { params: { slug: 'docs/v1/intro' } },
      { params: { slug: 'docs/v2/intro' } },
    ]);
  });

  it('keeps full routes when collections have no common base path', () => {
    const disjointManifest = createDocsManifest({
      collections: [
        {
          id: 'guides',
          basePath: '/guides',
          nav: [],
          pages: [
            {
              ...nestedPage,
              id: 'guides:intro',
              collectionId: 'guides',
              slug: ['intro'],
              route: '/guides/intro',
            },
          ],
        },
        {
          id: 'api',
          basePath: '/api',
          nav: [],
          pages: [
            {
              ...nestedPage,
              id: 'api:reference',
              collectionId: 'api',
              slug: ['reference'],
              route: '/api/reference',
            },
          ],
        },
      ],
    });

    expect(createAstroStaticPaths(disjointManifest)).toEqual([
      { params: { slug: 'guides/intro' } },
      { params: { slug: 'api/reference' } },
    ]);
  });

  it('rejects routes outside an explicit base path', () => {
    expect(() =>
      createAstroStaticPaths({
        manifest: multiCollectionManifest,
        basePath: '/docs/v1',
      }),
    ).toThrow(
      'Docs route "/docs/v2/intro" is outside the configured base path "/docs/v1".',
    );
  });

  it('decodes encoded route segments into literal Astro parameter values', () => {
    const encodedManifest = createDocsManifest({
      collections: [
        {
          id: 'docs',
          basePath: '/docs',
          nav: [],
          pages: [
            {
              ...nestedPage,
              id: 'docs:special',
              slug: [':configuration', '*'],
              route: '/docs/%3Aconfiguration/%2A',
            },
          ],
        },
      ],
    });

    expect(createAstroStaticPaths(encodedManifest)).toEqual([
      { params: { slug: ':configuration/*' } },
    ]);
  });

  it('compares encoded base paths by their decoded segment values', () => {
    const encodedManifest = createDocsManifest({
      collections: [
        {
          id: 'docs',
          basePath: '/%64ocs',
          nav: [],
          pages: [
            {
              ...nestedPage,
              id: 'docs:encoded-base',
              route: '/docs/guides/%69nstall',
            },
          ],
        },
      ],
    });

    expect(createAstroStaticPaths(encodedManifest)).toEqual([
      { params: { slug: 'guides/install' } },
    ]);
  });

  it('rejects malformed encodings and encoded path separators', () => {
    function createRouteManifest(route: string) {
      return createDocsManifest({
        collections: [
          {
            id: 'docs',
            basePath: '/docs',
            nav: [],
            pages: [{ ...nestedPage, route }],
          },
        ],
      });
    }

    expect(() =>
      createAstroStaticPaths(createRouteManifest('/docs/bad%value')),
    ).toThrow('malformed percent-encoding');
    expect(() =>
      createAstroStaticPaths(createRouteManifest('/docs/a%2Fb')),
    ).toThrow('encoded path separator');
  });
});
