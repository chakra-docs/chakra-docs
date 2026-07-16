import type { DocsSearchRecord } from '@chakra-docs/core';

const DEFAULT_RESULT_LIMIT = 8;
const DEFAULT_POPULAR_LIMIT = 6;
const MAX_SCORE = 100;

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
  title: string;
  pageTitle: string;
  description: string;
  text: string;
}

/**
 * Creates a reusable in-memory search engine. Searchable strings and compact
 * result objects are snapshotted once, so a warm server process does not need
 * to rebuild or renormalize its manifest for each request.
 */
export function createDocsSearchEngine(
  records: readonly DocsSearchRecord[],
): DocsSearchEngine {
  const index = records.map(createIndexedRecord);

  return {
    search(query) {
      assertSearchQuery(query);

      const displayQuery = query.query.trim();
      const normalizedQuery = displayQuery.toLowerCase();
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
          normalizedQuery,
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
    title: record.title.toLowerCase(),
    pageTitle: record.pageTitle?.toLowerCase() ?? '',
    description: record.description?.toLowerCase() ?? '',
    text: record.text.toLowerCase(),
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
  normalizedQuery: string,
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

    const score = scoreSearchRecord(item, normalizedQuery);

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
  if (item.title === normalizedQuery) {
    return MAX_SCORE;
  }

  let score = 0;

  if (item.title.includes(normalizedQuery)) {
    score += 40;
  }

  if (
    item.pageTitle &&
    item.pageTitle !== item.title &&
    item.pageTitle.includes(normalizedQuery)
  ) {
    score += 15;
  }

  if (item.description.includes(normalizedQuery)) {
    score += 20;
  }

  if (item.text.includes(normalizedQuery)) {
    score += item.result.kind === 'heading' ? 15 : 10;
  }

  return score;
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
