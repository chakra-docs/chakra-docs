import { describe, expect, it } from 'vitest';
import { createDocsManifest } from '@chakra-docs/core';
import type { DocsCollection, DocsPage } from '@chakra-docs/core';
import {
  createGetStaticPaths,
  createPagesRouterDocProps,
  getPagesRouterDoc,
  serializeNextProps,
} from './pages.js';

const publishedPage: DocsPage = {
  id: 'docs:getting-started',
  collectionId: 'docs',
  slug: ['getting-started'],
  path: 'docs/getting-started.mdx',
  route: '/docs/getting-started',
  title: 'Getting started',
  description: 'How to get started.',
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
  nav: [
    {
      id: 'nav:getting-started',
      title: 'Getting started',
      slug: ['getting-started'],
    },
  ],
};

const manifest = createDocsManifest({ collections: [collection] });

const versionOnePage: DocsPage = {
  ...publishedPage,
  id: 'v1:intro',
  collectionId: 'v1',
  slug: ['intro'],
  route: '/docs/v1/intro',
};
const versionTwoPage: DocsPage = {
  ...publishedPage,
  id: 'v2:intro',
  collectionId: 'v2',
  slug: ['intro'],
  route: '/docs/v2/intro',
};
const multiCollectionManifest = createDocsManifest({
  collections: [
    {
      id: 'v1',
      basePath: '/docs/v1',
      pages: [versionOnePage],
      nav: [],
    },
    {
      id: 'v2',
      basePath: '/docs/v2',
      pages: [versionTwoPage],
      nav: [],
    },
  ],
});

const specialCharacterPages: DocsPage[] = [
  {
    ...publishedPage,
    id: 'docs:space-name',
    slug: ['space name'],
    route: '/docs/space%20name',
  },
  {
    ...publishedPage,
    id: 'docs:reserved',
    slug: ['hash#query?'],
    route: '/docs/hash%23query%3F',
  },
  {
    ...publishedPage,
    id: 'docs:literal-percent',
    slug: ['literal%20text'],
    route: '/docs/literal%2520text',
  },
  {
    ...publishedPage,
    id: 'docs:unicode',
    slug: ['café'],
    route: '/docs/caf%C3%A9',
  },
  {
    ...publishedPage,
    id: 'docs:malformed-percent',
    slug: ['invalid%ZZ'],
    route: '/docs/invalid%ZZ',
  },
];
const specialCharacterManifest = createDocsManifest({
  collections: [
    {
      id: 'docs',
      basePath: '/docs',
      pages: specialCharacterPages,
      nav: [],
    },
  ],
});

describe('createGetStaticPaths', () => {
  it('returns published slug params and fallback false', () => {
    const getStaticPaths = createGetStaticPaths({ manifest });

    expect(getStaticPaths()).toEqual({
      paths: [{ params: { slug: ['getting-started'] } }],
      fallback: false,
    });
  });

  it('includes draft and hidden pages when both options are set', () => {
    const getStaticPaths = createGetStaticPaths({
      manifest,
      includeDrafts: true,
      includeHidden: true,
    });

    expect(getStaticPaths()).toEqual({
      paths: [
        { params: { slug: ['getting-started'] } },
        { params: { slug: ['drafts', 'wip'] } },
        { params: { slug: ['internal'] } },
      ],
      fallback: false,
    });
  });

  it('emits unique params for pages with the same slug in different collections', () => {
    const getStaticPaths = createGetStaticPaths({
      manifest: multiCollectionManifest,
    });

    expect(getStaticPaths()).toEqual({
      paths: [
        { params: { slug: ['v1', 'intro'] } },
        { params: { slug: ['v2', 'intro'] } },
      ],
      fallback: false,
    });
  });

  it('returns decoded special-character paths without double-decoding percent text', () => {
    const getStaticPaths = createGetStaticPaths({
      manifest: specialCharacterManifest,
    });

    expect(getStaticPaths()).toEqual({
      paths: [
        { params: { slug: ['space name'] } },
        { params: { slug: ['hash#query?'] } },
        { params: { slug: ['literal%20text'] } },
        { params: { slug: ['café'] } },
        { params: { slug: ['invalid%ZZ'] } },
      ],
      fallback: false,
    });
  });
});

describe('getPagesRouterDoc', () => {
  it('returns the page for a published route', () => {
    expect(getPagesRouterDoc({ manifest }, '/docs/getting-started')).toBe(
      publishedPage,
    );
  });

  it('returns null for draft and hidden pages by default', () => {
    expect(getPagesRouterDoc({ manifest }, '/docs/drafts/wip')).toBeNull();
    expect(getPagesRouterDoc({ manifest }, '/docs/internal')).toBeNull();
  });

  it('returns draft and hidden pages when the matching option is set', () => {
    expect(
      getPagesRouterDoc({ manifest, includeDrafts: true }, '/docs/drafts/wip'),
    ).toBe(draftPage);
    expect(
      getPagesRouterDoc({ manifest, includeHidden: true }, '/docs/internal'),
    ).toBe(hiddenPage);
  });

  it('returns null for an unknown route', () => {
    expect(getPagesRouterDoc({ manifest }, '/docs/does-not-exist')).toBeNull();
  });

  it.each([
    ['/docs/space name', specialCharacterPages[0]],
    ['/docs/hash#query?', specialCharacterPages[1]],
    ['/docs/literal%20text', specialCharacterPages[2]],
    ['/docs/café', specialCharacterPages[3]],
    ['/docs/invalid%ZZ', specialCharacterPages[4]],
  ])('looks up the decoded Next route %s', (route, page) => {
    expect(
      getPagesRouterDoc({ manifest: specialCharacterManifest }, route),
    ).toBe(page);
  });

  it('continues to accept a canonical encoded route', () => {
    expect(
      getPagesRouterDoc(
        { manifest: specialCharacterManifest },
        '/docs/space%20name',
      ),
    ).toBe(specialCharacterPages[0]);
  });
});

describe('createPagesRouterDocProps', () => {
  it('returns null when the page is missing', () => {
    expect(
      createPagesRouterDocProps({ manifest }, '/docs/does-not-exist'),
    ).toBeNull();
  });

  it('returns null for a draft page by default', () => {
    expect(
      createPagesRouterDocProps({ manifest }, '/docs/drafts/wip'),
    ).toBeNull();
  });

  it('returns collection options, nav and page without duplicating search by default', () => {
    const props = createPagesRouterDocProps(
      { manifest },
      '/docs/getting-started',
    );

    expect(props).not.toBeNull();
    expect(props?.collectionOptions).toEqual([
      { id: 'docs', label: 'Documentation' },
    ]);
    expect(props?.nav).toBe(manifest.nav);
    expect(props?.page).toBe(publishedPage);
    expect(props?.search).toEqual([]);
  });

  it('includes the full search corpus only when explicitly requested', () => {
    const props = createPagesRouterDocProps(
      { manifest, includeSearch: true },
      '/docs/getting-started',
    );

    expect(props?.search).toBe(manifest.search);
  });

  it('uses a page-aware search resolver in preference to includeSearch', () => {
    const contexts: Array<{ manifest: unknown; page: unknown }> = [];
    const scopedSearch = manifest.search.slice(0, 1);
    const props = createPagesRouterDocProps(
      {
        manifest,
        includeSearch: true,
        searchRecords: (context) => {
          contexts.push(context);
          return scopedSearch;
        },
      },
      '/docs/getting-started',
    );

    expect(props?.search).toBe(scopedSearch);
    expect(contexts).toEqual([{ manifest, page: publishedPage }]);
  });
});

describe('serializeNextProps', () => {
  it('round-trips plain data', () => {
    const props = {
      page: {
        title: 'Getting started',
        slug: ['getting-started'],
        order: 1,
        draft: false,
      },
      nav: [{ id: 'nav:getting-started', children: [] }],
    };

    const serialized = serializeNextProps(props);

    expect(serialized).toEqual(props);
    expect(serialized).not.toBe(props);
    expect(serialized.page).not.toBe(props.page);
  });
});
