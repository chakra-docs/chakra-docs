import { describe, expect, it } from 'vitest';
import { createDocsManifest } from '@chakra-docs/core';
import type { DocsCollection, DocsPage } from '@chakra-docs/core';
import { createGenerateStaticParams, getAppRouterDoc } from './app.js';

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

describe('createGenerateStaticParams', () => {
  it('returns slug params for published pages only by default', () => {
    const generateStaticParams = createGenerateStaticParams({ manifest });

    expect(generateStaticParams()).toEqual([{ slug: ['getting-started'] }]);
  });

  it('includes draft pages when includeDrafts is set', () => {
    const generateStaticParams = createGenerateStaticParams({
      manifest,
      includeDrafts: true,
    });

    expect(generateStaticParams()).toEqual([
      { slug: ['getting-started'] },
      { slug: ['drafts', 'wip'] },
    ]);
  });

  it('includes hidden pages when includeHidden is set', () => {
    const generateStaticParams = createGenerateStaticParams({
      manifest,
      includeHidden: true,
    });

    expect(generateStaticParams()).toEqual([
      { slug: ['getting-started'] },
      { slug: ['internal'] },
    ]);
  });

  it('includes all pages when both includeDrafts and includeHidden are set', () => {
    const generateStaticParams = createGenerateStaticParams({
      manifest,
      includeDrafts: true,
      includeHidden: true,
    });

    expect(generateStaticParams()).toEqual([
      { slug: ['getting-started'] },
      { slug: ['drafts', 'wip'] },
      { slug: ['internal'] },
    ]);
  });

  it('preserves collection path segments for multi-collection routes', () => {
    const generateStaticParams = createGenerateStaticParams({
      manifest: multiCollectionManifest,
    });

    expect(generateStaticParams()).toEqual([
      { slug: ['v1', 'intro'] },
      { slug: ['v2', 'intro'] },
    ]);
  });

  it('supports an explicit route base path', () => {
    const generateStaticParams = createGenerateStaticParams({
      manifest: multiCollectionManifest,
      basePath: '/',
    });

    expect(generateStaticParams()).toEqual([
      { slug: ['docs', 'v1', 'intro'] },
      { slug: ['docs', 'v2', 'intro'] },
    ]);
  });

  it('returns decoded special-character params without double-decoding percent text', () => {
    const generateStaticParams = createGenerateStaticParams({
      manifest: specialCharacterManifest,
    });

    expect(generateStaticParams()).toEqual([
      { slug: ['space name'] },
      { slug: ['hash#query?'] },
      { slug: ['literal%20text'] },
      { slug: ['café'] },
      { slug: ['invalid%ZZ'] },
    ]);
  });
});

describe('getAppRouterDoc', () => {
  it('returns the page for a published route', () => {
    expect(getAppRouterDoc({ manifest }, '/docs/getting-started')).toBe(
      publishedPage,
    );
  });

  it('returns null for a draft page by default', () => {
    expect(getAppRouterDoc({ manifest }, '/docs/drafts/wip')).toBeNull();
  });

  it('returns null for a hidden page by default', () => {
    expect(getAppRouterDoc({ manifest }, '/docs/internal')).toBeNull();
  });

  it('returns a draft page when includeDrafts is set', () => {
    expect(
      getAppRouterDoc({ manifest, includeDrafts: true }, '/docs/drafts/wip'),
    ).toBe(draftPage);
  });

  it('returns a hidden page when includeHidden is set', () => {
    expect(
      getAppRouterDoc({ manifest, includeHidden: true }, '/docs/internal'),
    ).toBe(hiddenPage);
  });

  it('returns null for an unknown route', () => {
    expect(getAppRouterDoc({ manifest }, '/docs/does-not-exist')).toBeNull();
  });

  it.each([
    ['/docs/space name', specialCharacterPages[0]],
    ['/docs/hash#query?', specialCharacterPages[1]],
    ['/docs/literal%20text', specialCharacterPages[2]],
    ['/docs/café', specialCharacterPages[3]],
    ['/docs/invalid%ZZ', specialCharacterPages[4]],
  ])('looks up the decoded Next route %s', (route, page) => {
    expect(getAppRouterDoc({ manifest: specialCharacterManifest }, route)).toBe(
      page,
    );
  });

  it('continues to accept a canonical encoded route', () => {
    expect(
      getAppRouterDoc(
        { manifest: specialCharacterManifest },
        '/docs/space%20name',
      ),
    ).toBe(specialCharacterPages[0]);
  });
});
