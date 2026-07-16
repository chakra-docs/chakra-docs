import { describe, expect, it } from 'vitest';
import { createDocsManifest } from '@chakra-docs/core';
import type { DocsCollection, DocsPage } from '@chakra-docs/core';
import { createRouteSlug } from './route-params.js';

function createPage(
  collectionId: string,
  route: string,
  slug: string[],
): DocsPage {
  return {
    id: `${collectionId}:${slug.join('/') || 'index'}`,
    collectionId,
    slug,
    path: `${collectionId}/${slug.join('/') || 'index'}.mdx`,
    route,
    title: route,
    frontmatter: {},
  };
}

function createCollection(
  id: string,
  basePath: string,
  pages: DocsPage[],
): DocsCollection {
  return { id, basePath, pages, nav: [] };
}

describe('createRouteSlug', () => {
  it('preserves the single-collection relative slug behavior', () => {
    const page = createPage('docs', '/docs/guides/install', [
      'guides',
      'install',
    ]);
    const manifest = createDocsManifest({
      collections: [createCollection('docs', '/docs', [page])],
    });

    expect(createRouteSlug(page, { manifest })).toEqual(['guides', 'install']);
  });

  it('removes only the common collection base path', () => {
    const v1Page = createPage('v1', '/docs/v1/intro', ['intro']);
    const v2Page = createPage('v2', '/docs/v2/intro', ['intro']);
    const manifest = createDocsManifest({
      collections: [
        createCollection('v1', '/docs/v1', [v1Page]),
        createCollection('v2', '/docs/v2', [v2Page]),
      ],
    });

    expect(createRouteSlug(v1Page, { manifest })).toEqual(['v1', 'intro']);
    expect(createRouteSlug(v2Page, { manifest })).toEqual(['v2', 'intro']);
  });

  it('keeps the full route when collections have no common base path', () => {
    const guide = createPage('guides', '/guides/intro', ['intro']);
    const api = createPage('api', '/api/reference', ['reference']);
    const manifest = createDocsManifest({
      collections: [
        createCollection('guides', '/guides', [guide]),
        createCollection('api', '/api', [api]),
      ],
    });

    expect(createRouteSlug(guide, { manifest })).toEqual(['guides', 'intro']);
    expect(createRouteSlug(api, { manifest })).toEqual(['api', 'reference']);
  });

  it('honors an explicit base path', () => {
    const page = createPage('docs', '/docs/guides/install', [
      'guides',
      'install',
    ]);
    const manifest = createDocsManifest({
      collections: [createCollection('docs', '/docs', [page])],
    });

    expect(createRouteSlug(page, { manifest, basePath: '/' })).toEqual([
      'docs',
      'guides',
      'install',
    ]);
  });

  it('decodes canonical manifest route segments for Next static params', () => {
    const page = createPage(
      'docs',
      '/docs/space%20name/hash%23query%3F/100%25/caf%C3%A9',
      ['space name', 'hash#query?', '100%', 'café'],
    );
    const manifest = createDocsManifest({
      collections: [createCollection('docs', '/docs', [page])],
    });

    expect(createRouteSlug(page, { manifest })).toEqual([
      'space name',
      'hash#query?',
      '100%',
      'café',
    ]);
  });

  it('decodes a literal percent sequence exactly once', () => {
    const page = createPage('docs', '/docs/literal%2520text', [
      'literal%20text',
    ]);
    const manifest = createDocsManifest({
      collections: [createCollection('docs', '/docs', [page])],
    });

    expect(createRouteSlug(page, { manifest })).toEqual(['literal%20text']);
  });

  it('preserves malformed percent encodings instead of throwing', () => {
    const page = createPage(
      'docs',
      '/docs/incomplete%2/invalid%ZZ/truncated%E0%A4%A',
      ['incomplete%2', 'invalid%ZZ', 'truncated%E0%A4%A'],
    );
    const manifest = createDocsManifest({
      collections: [createCollection('docs', '/docs', [page])],
    });

    expect(createRouteSlug(page, { manifest })).toEqual([
      'incomplete%2',
      'invalid%ZZ',
      'truncated%E0%A4%A',
    ]);
  });

  it('rejects a route outside the configured base path', () => {
    const page = createPage('v2', '/docs/v2/intro', ['intro']);
    const manifest = createDocsManifest({
      collections: [createCollection('v2', '/docs/v2', [page])],
    });

    expect(() =>
      createRouteSlug(page, { manifest, basePath: '/docs/v1' }),
    ).toThrow(
      'Docs route "/docs/v2/intro" is outside the configured base path "/docs/v1".',
    );
  });

  it('matches base paths by complete segment', () => {
    const page = createPage('docs', '/docs/intro', ['intro']);
    const manifest = createDocsManifest({
      collections: [createCollection('docs', '/docs', [page])],
    });

    expect(() => createRouteSlug(page, { manifest, basePath: '/doc' })).toThrow(
      'Docs route "/docs/intro" is outside the configured base path "/doc".',
    );
  });
});
