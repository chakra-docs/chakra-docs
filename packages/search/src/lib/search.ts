import type { DocsSearchRecord } from '@chakra-docs/core';
import { createDocsSearchText, normalizeDocsSearchText } from './normalize.js';

const DEFAULT_RESULT_LIMIT = 8;
const DEFAULT_POPULAR_LIMIT = 6;
const MAX_SCORE = 200;
const MAX_SYNONYM_EXPANSIONS = 24;

export interface DocsSearchEngineOptions {
  /** Groups of equivalent terms or phrases used to expand incoming queries. */
  synonyms?: readonly (readonly string[])[];
}

export interface DocsSearchQuery {
  query: string;
  collectionIds?: readonly string[];
  limit?: number;
  popularLimit?: number;
}

/**
 * A display- and navigation-only search result. The large source `text` and
 * `headings` fields are deliberately excluded from server responses.
 */
export interface DocsSearchResult {
  id: string;
  kind?: 'page' | 'heading';
  pageId?: string;
  collectionId?: string;
  sourceId?: string;
  route: string;
  title: string;
  pageTitle?: string;
  sectionTitle?: string;
  headingId?: string;
  headingLevel?: number;
  description?: string;
  tags?: string[];
}

export interface DocsSearchResponse {
  query: string;
  results: DocsSearchResult[];
}

export interface DocsSearchProviderOptions {
  signal?: AbortSignal;
}

export type DocsSearchProvider = (
  query: DocsSearchQuery,
  options?: DocsSearchProviderOptions,
) => Promise<DocsSearchResponse>;

export interface DocsSearchEngine {
  search(query: DocsSearchQuery): DocsSearchResponse;
}

interface IndexedSearchRecord {
  result: DocsSearchResult;
  exactTitle: string;
  title: string;
  pageTitle: string;
  sectionTitle: string;
  description: string;
  text: string;
  tags: string;
  aliases: string;
  priority: number;
}

/**
 * Creates a reusable in-memory search engine. Searchable strings and compact
 * result objects are snapshotted once, so a warm server process does not need
 * to rebuild or renormalize its manifest for each request.
 */
export function createDocsSearchEngine(
  records: readonly DocsSearchRecord[],
  options: DocsSearchEngineOptions = {},
): DocsSearchEngine {
  const index = records.map(createIndexedRecord);
  const synonyms = createSynonymIndex(options.synonyms);

  return {
    search(query) {
      assertSearchQuery(query);

      const displayQuery = query.query.trim();
      const normalizedQuery = normalizeDocsSearchText(displayQuery);
      const collectionScope = normalizeCollectionScope(query.collectionIds);

      if (!normalizedQuery) {
        return {
          query: displayQuery,
          results: getPopularResults(
            index,
            collectionScope,
            normalizeLimit(
              query.popularLimit,
              DEFAULT_POPULAR_LIMIT,
              index.length,
            ),
          ),
        };
      }

      return {
        query: displayQuery,
        results: getRankedResults(
          index,
          expandSearchQueries(normalizedQuery, synonyms),
          collectionScope,
          normalizeLimit(query.limit, DEFAULT_RESULT_LIMIT, index.length),
        ),
      };
    },
  };
}

function createIndexedRecord(record: DocsSearchRecord): IndexedSearchRecord {
  const result: DocsSearchResult = {
    id: record.id,
    kind: record.kind,
    pageId: record.pageId,
    collectionId: record.collectionId,
    sourceId: record.sourceId,
    route: record.route,
    title: record.title,
    pageTitle: record.pageTitle,
    sectionTitle: record.sectionTitle,
    headingId: record.headingId,
    headingLevel: record.headingLevel,
    description: record.description,
    tags: record.tags ? [...record.tags] : undefined,
  };

  return {
    result,
    exactTitle: normalizeDocsSearchText(record.title),
    title: createDocsSearchText(record.title),
    pageTitle: createDocsSearchText(record.pageTitle ?? ''),
    sectionTitle: createDocsSearchText(record.sectionTitle ?? ''),
    description: createDocsSearchText(record.description ?? ''),
    text: createDocsSearchText(record.text),
    tags: createDocsSearchText(record.tags?.join(' ') ?? ''),
    aliases: createDocsSearchText(record.aliases?.join(' ') ?? ''),
    priority: normalizePriority(record.searchPriority),
  };
}

function getPopularResults(
  index: readonly IndexedSearchRecord[],
  collectionScope: ReadonlySet<string> | undefined,
  limit: number,
): DocsSearchResult[] {
  const results: DocsSearchResult[] = [];

  if (limit === 0) {
    return results;
  }

  for (const item of index) {
    if (
      item.result.kind !== 'heading' &&
      isInCollectionScope(item, collectionScope)
    ) {
      results.push(item.result);
    }

    if (results.length === limit) {
      break;
    }
  }

  return results;
}

function getRankedResults(
  index: readonly IndexedSearchRecord[],
  normalizedQueries: readonly string[],
  collectionScope: ReadonlySet<string> | undefined,
  limit: number,
): DocsSearchResult[] {
  if (limit === 0) {
    return [];
  }

  // Scores are bounded small positive integers. Buckets preserve source order
  // for ties while avoiding a full allocation and sort on every request.
  const buckets: Array<DocsSearchResult[] | undefined> = [];

  for (const item of index) {
    if (!isInCollectionScope(item, collectionScope)) {
      continue;
    }

    const score = Math.max(
      ...normalizedQueries.map((query) => scoreSearchRecord(item, query)),
    );

    if (score === 0) {
      continue;
    }

    const bucket = buckets[score] ?? [];
    buckets[score] = bucket;

    if (bucket.length < limit) {
      bucket.push(item.result);
    }
  }

  const results: DocsSearchResult[] = [];

  for (let score = MAX_SCORE; score > 0 && results.length < limit; score -= 1) {
    const bucket = buckets[score];

    if (bucket) {
      results.push(...bucket.slice(0, limit - results.length));
    }
  }

  return results;
}

function scoreSearchRecord(
  item: IndexedSearchRecord,
  normalizedQuery: string,
): number {
  if (item.exactTitle === normalizedQuery) {
    return MAX_SCORE;
  }

  let score = 0;

  if (item.title.includes(normalizedQuery)) {
    score += 40;
  }

  if (item.aliases.includes(normalizedQuery)) {
    score += 35;
  }

  if (item.tags.includes(normalizedQuery)) {
    score += 30;
  }

  if (
    item.pageTitle &&
    item.pageTitle !== item.title &&
    item.pageTitle.includes(normalizedQuery)
  ) {
    score += 15;
  }

  if (
    item.sectionTitle &&
    item.sectionTitle !== item.title &&
    item.sectionTitle.includes(normalizedQuery)
  ) {
    score += 25;
  }

  if (item.description.includes(normalizedQuery)) {
    score += 20;
  }

  if (item.text.includes(normalizedQuery)) {
    score += item.result.kind === 'heading' ? 15 : 10;
  }

  if (score === 0 && normalizedQuery.includes(' ')) {
    score = scoreSearchTerms(item, normalizedQuery.split(' '));
  }

  if (score > 0) {
    score += item.priority;
  }

  return Math.max(0, Math.min(MAX_SCORE - 1, score));
}

function scoreSearchTerms(
  item: IndexedSearchRecord,
  terms: readonly string[],
): number {
  let score = 0;
  let matchedTerms = 0;

  for (const term of terms) {
    let termScore = 0;

    if (item.title.includes(term)) termScore = Math.max(termScore, 14);
    if (item.aliases.includes(term)) termScore = Math.max(termScore, 12);
    if (item.tags.includes(term)) termScore = Math.max(termScore, 10);
    if (item.sectionTitle.includes(term)) termScore = Math.max(termScore, 9);
    if (item.pageTitle.includes(term)) termScore = Math.max(termScore, 8);
    if (item.description.includes(term)) termScore = Math.max(termScore, 5);
    if (item.text.includes(term)) termScore = Math.max(termScore, 3);

    if (termScore > 0) {
      matchedTerms += 1;
      score += termScore;
    }
  }

  if (matchedTerms === terms.length) {
    score += 15;
  }

  return score;
}

function normalizePriority(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(-20, Math.min(20, Math.round(value)));
}

function createSynonymIndex(
  groups: readonly (readonly string[])[] | undefined,
): ReadonlyMap<string, readonly string[]> {
  const index = new Map<string, readonly string[]>();

  for (const group of groups ?? []) {
    const terms = [
      ...new Set(group.map(normalizeDocsSearchText).filter(Boolean)),
    ];

    for (const term of terms) {
      index.set(
        term,
        terms.filter((candidate) => candidate !== term),
      );
    }
  }

  return index;
}

function expandSearchQueries(
  query: string,
  synonyms: ReadonlyMap<string, readonly string[]>,
): string[] {
  const expanded = new Set<string>([query]);

  for (const synonym of synonyms.get(query) ?? []) {
    expanded.add(synonym);
  }

  const terms = query.split(' ');

  for (let index = 0; index < terms.length; index += 1) {
    for (const synonym of synonyms.get(terms[index] ?? '') ?? []) {
      const variant = [...terms];
      variant[index] = synonym;
      expanded.add(variant.join(' '));

      if (expanded.size >= MAX_SYNONYM_EXPANSIONS) {
        return [...expanded];
      }
    }
  }

  return [...expanded];
}

function isInCollectionScope(
  item: IndexedSearchRecord,
  collectionScope: ReadonlySet<string> | undefined,
): boolean {
  return (
    !collectionScope ||
    (item.result.collectionId !== undefined &&
      collectionScope.has(item.result.collectionId))
  );
}

function normalizeCollectionScope(
  collectionIds: readonly string[] | undefined,
): ReadonlySet<string> | undefined {
  if (collectionIds === undefined) {
    return undefined;
  }

  if (!Array.isArray(collectionIds)) {
    throw new TypeError('collectionIds must be an array of strings.');
  }

  const normalized = new Set<string>();

  for (const collectionId of collectionIds) {
    if (typeof collectionId !== 'string') {
      throw new TypeError('collectionIds must contain only strings.');
    }

    const id = collectionId.trim();

    if (id) {
      normalized.add(id);
    }
  }

  return normalized.size > 0 ? normalized : undefined;
}

function normalizeLimit(
  value: number | undefined,
  fallback: number,
  maximum: number,
): number {
  if (value === undefined) {
    return Math.min(fallback, maximum);
  }

  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
    return 0;
  }

  if (!Number.isFinite(value)) {
    return value === Number.POSITIVE_INFINITY ? maximum : 0;
  }

  return Math.min(Math.floor(value), maximum);
}

function assertSearchQuery(query: DocsSearchQuery): void {
  if (!query || typeof query !== 'object') {
    throw new TypeError('Search query must be an object.');
  }

  if (typeof query.query !== 'string') {
    throw new TypeError('query must be a string.');
  }
}
