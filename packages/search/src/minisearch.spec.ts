import type { DocsSearchRecord } from '@chakra-docs/core';
import { createMiniSearchEngine } from './minisearch.js';
import { createDocsSearchEngine } from './lib/search.js';

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

describe('createMiniSearchEngine', () => {
  it.each([
    'Learn accessibility, keyboard navigation and focus management.',
    '(accessibility)',
    'accessibility: keyboard navigation',
    '“accessibility” matters.',
    'accessibility',
  ])('matches synonyms at prose boundaries: %s', (text) => {
    const records = [createRecord({ id: 'guide', title: 'Guide', text })];
    const options = { synonyms: [['a11y', 'accessibility']] };
    for (const createEngine of [
      createMiniSearchEngine,
      createDocsSearchEngine,
    ]) {
      expect(
        createEngine(records, options).search({ query: 'a11y' }).results,
      ).toEqual([expect.objectContaining({ id: 'guide' })]);
    }
  });

  it('matches whole phrases and preserves identifier punctuation', () => {
    const engine = createMiniSearchEngine(
      [
        createRecord({
          id: 'rendering',
          text: 'Learn (server-side rendering), today.',
        }),
        createRecord({ id: 'cpp', text: 'Use C++, safely.' }),
        createRecord({
          id: 'partial',
          text: 'inaccessibility accessibilityTools',
        }),
        createRecord({ id: 'unicode', text: 'éaccessibility accessibility語' }),
      ],
      {
        synonyms: [
          ['ssr', 'server-side rendering'],
          ['cplusplus', 'C++'],
          ['a11y', 'accessibility'],
        ],
        fuzzy: false,
        prefix: false,
      },
    );
    expect(engine.search({ query: 'ssr' }).results.map(({ id }) => id)).toEqual(
      ['rendering'],
    );
    expect(
      engine.search({ query: 'cplusplus' }).results.map(({ id }) => id),
    ).toEqual(['cpp']);
    expect(engine.search({ query: 'a11y' }).results).toEqual([]);
  });

  it('supports fuzzy and last-term prefix matching with short-term guards', () => {
    const engine = createMiniSearchEngine([
      createRecord({ id: 'javascript', title: 'JavaScript configuration' }),
      createRecord({ id: 'typescript', title: 'TypeScript installation' }),
    ]);

    expect(engine.search({ query: 'javscript' }).results[0]?.id).toBe(
      'javascript',
    );
    expect(engine.search({ query: 'typescript inst' }).results[0]?.id).toBe(
      'typescript',
    );
    expect(engine.search({ query: 'ts' }).results).toEqual([]);
  });

  it('expands term and phrase synonym groups while preserving compact results', () => {
    const engine = createMiniSearchEngine(
      [
        createRecord({
          id: 'rendering',
          title: 'Server-side rendering',
          aliases: ['render on server'],
          tags: ['architecture'],
        }),
      ],
      {
        synonyms: [
          ['ssr', 'server-side rendering', 'server rendering'],
          ['a11y', 'accessibility'],
        ],
      },
    );

    expect(engine.search({ query: 'ssr' }).results[0]?.id).toBe('rendering');
    expect(engine.search({ query: 'architecture' }).results[0]?.id).toBe(
      'rendering',
    );
    expect(
      engine.search({ query: 'render on server' }).results[0],
    ).not.toHaveProperty('aliases');
  });

  it('boosts titles and applies search priority without hiding exact matches', () => {
    const engine = createMiniSearchEngine([
      createRecord({ id: 'body', title: 'Reference', text: 'installation' }),
      createRecord({ id: 'title', title: 'Installation' }),
      createRecord({
        id: 'priority',
        title: 'Installation guide',
        searchPriority: 10,
      }),
    ]);

    expect(
      engine.search({ query: 'installation' }).results.map(({ id }) => id),
    ).toEqual(['title', 'priority', 'body']);
  });

  it('filters by collection before limiting results', () => {
    const engine = createMiniSearchEngine([
      createRecord({ id: 'v1', title: 'Install', collectionId: 'v1' }),
      createRecord({ id: 'v2', title: 'Install', collectionId: 'v2' }),
    ]);

    expect(
      engine.search({ query: 'install', collectionIds: ['v2'], limit: 1 })
        .results,
    ).toEqual([expect.objectContaining({ id: 'v2' })]);
  });

  it('limits duplicate results from the same page', () => {
    const records = [
      createRecord({ id: 'page', pageId: 'page', title: 'Configuration' }),
      createRecord({
        id: 'page#one',
        pageId: 'page',
        kind: 'heading',
        title: 'Configuration one',
      }),
      createRecord({
        id: 'page#two',
        pageId: 'page',
        kind: 'heading',
        title: 'Configuration two',
      }),
    ];

    expect(
      createMiniSearchEngine(records)
        .search({ query: 'configuration', limit: 8 })
        .results.map(({ id }) => id),
    ).toEqual(['page', 'page#one']);
    expect(
      createMiniSearchEngine(records, { maxResultsPerPage: 0 }).search({
        query: 'configuration',
        limit: 8,
      }).results,
    ).toHaveLength(3);
  });

  it('returns prioritized popular pages and query suggestions', () => {
    const engine = createMiniSearchEngine([
      createRecord({ id: 'first', title: 'First' }),
      createRecord({ id: 'install', title: 'Installation', searchPriority: 5 }),
    ]);

    expect(engine.search({ query: '', popularLimit: 1 }).results[0]?.id).toBe(
      'install',
    );
    expect(engine.suggest('instal', 1)[0]?.suggestion).toContain(
      'installation',
    );
  });
});
