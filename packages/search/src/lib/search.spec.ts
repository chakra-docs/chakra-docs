import type { DocsSearchRecord } from '@chakra-docs/core';
import { createDocsSearchEngine } from './search.js';

function createRecord(
  overrides: Partial<DocsSearchRecord> & Pick<DocsSearchRecord, 'id'>,
): DocsSearchRecord {
  return {
    kind: 'page',
    route: `/docs/${overrides.id}`,
    title: overrides.id,
    headings: [],
    text: '',
    ...overrides,
  };
}

describe('createDocsSearchEngine', () => {
  it('returns compact result snapshots without the search corpus', () => {
    const source = createRecord({
      id: 'install',
      pageId: 'install-page',
      collectionId: 'current',
      sourceId: 'website',
      title: 'Install',
      pageTitle: 'Installation',
      sectionTitle: 'Quick start',
      headingId: 'quick-start',
      headingLevel: 2,
      description: 'Install the package.',
      headings: [{ id: 'quick-start', title: 'Quick start', level: 2 }],
      text: 'the entire large searchable document',
      tags: ['setup'],
    });
    const engine = createDocsSearchEngine([source]);

    source.title = 'Changed after indexing';
    source.text = 'changed';
    source.tags?.push('changed');

    const [result] = engine.search({ query: 'entire' }).results;

    expect(result).toEqual({
      id: 'install',
      kind: 'page',
      pageId: 'install-page',
      collectionId: 'current',
      sourceId: 'website',
      route: '/docs/install',
      title: 'Install',
      pageTitle: 'Installation',
      sectionTitle: 'Quick start',
      headingId: 'quick-start',
      headingLevel: 2,
      description: 'Install the package.',
      tags: ['setup'],
    });
    expect(result).not.toHaveProperty('text');
    expect(result).not.toHaveProperty('headings');
    expect(engine.search({ query: 'changed' }).results).toEqual([]);
  });

  it('preserves the Chakra scorer and stable source order for ties', () => {
    const engine = createDocsSearchEngine([
      createRecord({
        id: 'body',
        title: 'Usage',
        text: 'install the package',
      }),
      createRecord({
        id: 'heading',
        kind: 'heading',
        title: 'Quick start',
        text: 'install here',
      }),
      createRecord({
        id: 'description',
        title: 'Setup',
        description: 'Install it',
      }),
      createRecord({
        id: 'partial-a',
        title: 'Install guide A',
      }),
      createRecord({
        id: 'partial-b',
        title: 'Install guide B',
      }),
      createRecord({
        id: 'page-title',
        title: 'Configuration',
        pageTitle: 'Installation guide',
      }),
      createRecord({ id: 'exact', title: 'Install' }),
    ]);

    expect(
      engine.search({ query: '  INSTALL  ' }).results.map(({ id }) => id),
    ).toEqual([
      'exact',
      'partial-a',
      'partial-b',
      'description',
      'heading',
      'page-title',
      'body',
    ]);
    expect(engine.search({ query: 'missing' })).toEqual({
      query: 'missing',
      results: [],
    });
  });

  it('does not add the page-title bonus when it matches the record title', () => {
    const engine = createDocsSearchEngine([
      createRecord({
        id: 'same',
        title: 'Install guide',
        pageTitle: 'Install guide',
      }),
      createRecord({
        id: 'distinct',
        title: 'Guide',
        pageTitle: 'Install guide',
        description: 'Install guide',
        text: 'Install guide',
      }),
    ]);

    expect(
      engine.search({ query: 'install' }).results.map(({ id }) => id),
    ).toEqual(['distinct', 'same']);
  });

  it('returns the first non-heading pages for blank queries', () => {
    const engine = createDocsSearchEngine([
      createRecord({ id: 'heading', kind: 'heading' }),
      createRecord({ id: 'one' }),
      createRecord({ id: 'two' }),
      createRecord({ id: 'three' }),
    ]);

    expect(
      engine
        .search({ query: '   ', popularLimit: 2 })
        .results.map(({ id }) => id),
    ).toEqual(['one', 'two']);
    expect(engine.search({ query: '', popularLimit: 0 }).results).toEqual([]);
  });

  it('applies collection scope before ranking and result limits', () => {
    const engine = createDocsSearchEngine([
      createRecord({ id: 'v2-first', title: 'Install', collectionId: 'v2' }),
      createRecord({ id: 'v1-first', title: 'Install', collectionId: 'v1' }),
      createRecord({ id: 'unscoped', title: 'Install' }),
      createRecord({ id: 'v1-second', title: 'Install', collectionId: 'v1' }),
    ]);

    expect(
      engine
        .search({ query: 'install', collectionIds: [' v1 '], limit: 1 })
        .results.map(({ id }) => id),
    ).toEqual(['v1-first']);
    expect(
      engine
        .search({ query: '', collectionIds: ['v1'], popularLimit: 2 })
        .results.map(({ id }) => id),
    ).toEqual(['v1-first', 'v1-second']);
    expect(
      engine
        .search({ query: 'install', collectionIds: ['v1', 'v1'] })
        .results.map(({ id }) => id),
    ).toEqual(['v1-first', 'v1-second']);
  });

  it('treats absent and empty collection scopes as unscoped', () => {
    const engine = createDocsSearchEngine([
      createRecord({ id: 'one', title: 'Install', collectionId: 'v1' }),
      createRecord({ id: 'two', title: 'Install' }),
    ]);

    expect(engine.search({ query: 'install' }).results).toHaveLength(2);
    expect(
      engine.search({ query: 'install', collectionIds: [] }).results,
    ).toHaveLength(2);
    expect(
      engine.search({ query: 'install', collectionIds: ['', '  '] }).results,
    ).toHaveLength(2);
  });

  it('bounds unusual numeric limits without allocating from them', () => {
    const engine = createDocsSearchEngine(
      Array.from({ length: 5 }, (_, index) =>
        createRecord({ id: String(index), title: `Install ${index}` }),
      ),
    );

    expect(
      engine.search({ query: 'install', limit: 2.9 }).results,
    ).toHaveLength(2);
    expect(
      engine.search({ query: 'install', limit: Number.POSITIVE_INFINITY })
        .results,
    ).toHaveLength(5);
    expect(engine.search({ query: 'install', limit: -1 }).results).toEqual([]);
    expect(
      engine.search({ query: 'install', limit: Number.NaN }).results,
    ).toEqual([]);
    expect(
      engine.search({ query: 'install', limit: Number.NEGATIVE_INFINITY })
        .results,
    ).toEqual([]);
    expect(
      engine.search({ query: '', popularLimit: Number.POSITIVE_INFINITY })
        .results,
    ).toHaveLength(5);
  });

  it('rejects malformed direct-call query shapes', () => {
    const engine = createDocsSearchEngine([]);

    expect(() => engine.search(undefined as never)).toThrow(TypeError);
    expect(() => engine.search({ query: 1 } as never)).toThrow('query');
    expect(() =>
      engine.search({ query: '', collectionIds: 'v1' } as never),
    ).toThrow('array');
    expect(() =>
      engine.search({ query: '', collectionIds: [1] } as never),
    ).toThrow('only strings');
  });
});
