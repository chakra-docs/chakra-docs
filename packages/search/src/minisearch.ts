import type { DocsSearchRecord } from '@chakra-docs/core';
import MiniSearch from 'minisearch';
import {
  createDocsSearchText,
  normalizeDocsSearchText,
} from './lib/normalize.js';
import type {
  DocsSearchEngine,
  DocsSearchQuery,
  DocsSearchResponse,
  DocsSearchResult,
} from './lib/search.js';

const DEFAULT_RESULT_LIMIT = 8;
const DEFAULT_POPULAR_LIMIT = 6;
const DEFAULT_MAX_RESULTS_PER_PAGE = 2;

export interface DocsMiniSearchFieldWeights {
  title?: number;
  pageTitle?: number;
  sectionTitle?: number;
  tags?: number;
  aliases?: number;
  synonyms?: number;
  description?: number;
  text?: number;
}

export interface DocsMiniSearchFuzzyOptions {
  /** Maximum edit distance as a fraction of the term length. */
  distance?: number;
  /** Terms shorter than this value are never fuzzily matched. */
  minTermLength?: number;
}

export interface DocsMiniSearchPrefixOptions {
  enabled?: boolean;
  /** Terms shorter than this value are never prefix matched. */
  minTermLength?: number;
  /** Limit prefix matching to the final query term. */
  lastTermOnly?: boolean;
}

export interface DocsMiniSearchEngineOptions {
  fields?: DocsMiniSearchFieldWeights;
  fuzzy?: false | DocsMiniSearchFuzzyOptions;
  prefix?: false | DocsMiniSearchPrefixOptions;
  synonyms?: readonly (readonly string[])[];
  /** Limits duplicate page and heading results. Set to zero to disable. */
  maxResultsPerPage?: number;
}

export interface DocsSearchSuggestion {
  suggestion: string;
  terms: string[];
  score: number;
}

export interface DocsSuggestingSearchEngine extends DocsSearchEngine {
  suggest(query: string, limit?: number): DocsSearchSuggestion[];
}

interface MiniSearchDocument {
  id: string;
  title: string;
  pageTitle: string;
  sectionTitle: string;
  tags: string;
  aliases: string;
  synonyms: string;
  description: string;
  text: string;
  collectionId: string;
}

interface ResolvedOptions {
  fields: Required<DocsMiniSearchFieldWeights>;
  fuzzy: Required<DocsMiniSearchFuzzyOptions> | false;
  prefix: Required<DocsMiniSearchPrefixOptions> | false;
  synonyms: readonly (readonly string[])[];
  maxResultsPerPage: number;
}

/**
 * Creates an indexed search engine with fuzzy, prefix, synonym, and suggestion
 * support while preserving the standard Chakra Docs search response contract.
 */
export function createMiniSearchEngine(
  records: readonly DocsSearchRecord[],
  options: DocsMiniSearchEngineOptions = {},
): DocsSuggestingSearchEngine {
  const resolved = resolveOptions(options);
  const recordsById = new Map(records.map((record) => [record.id, record]));
  const resultsById = new Map(
    records.map((record) => [record.id, createSearchResult(record)]),
  );
  const miniSearch = new MiniSearch<MiniSearchDocument>({
    fields: [
      'title',
      'pageTitle',
      'sectionTitle',
      'tags',
      'aliases',
      'synonyms',
      'description',
      'text',
    ],
    idField: 'id',
    storeFields: ['collectionId'],
    tokenize: (value) => tokenizeSearchText(value),
    processTerm: (term) => term,
  });

  miniSearch.addAll(
    records.map((record) => createMiniSearchDocument(record, resolved)),
  );

  return {
    search(query) {
      assertSearchQuery(query);
      const displayQuery = query.query.trim();
      const normalizedQuery = normalizeDocsSearchText(displayQuery);
      const collectionScope = normalizeCollectionScope(query.collectionIds);
      const fuzzy = resolved.fuzzy;
      const prefix = resolved.prefix;

      if (!normalizedQuery) {
        return {
          query: displayQuery,
          results: getPopularResults(
            records,
            collectionScope,
            normalizeLimit(query.popularLimit, DEFAULT_POPULAR_LIMIT),
          ),
        };
      }

      const hits = miniSearch.search(normalizedQuery, {
        boost: resolved.fields,
        combineWith: 'OR',
        filter: (result) =>
          !collectionScope ||
          (typeof result.collectionId === 'string' &&
            collectionScope.has(result.collectionId)),
        fuzzy:
          fuzzy === false
            ? false
            : (term) =>
                term.length >= fuzzy.minTermLength ? fuzzy.distance : false,
        prefix:
          prefix === false || !prefix.enabled
            ? false
            : (term, index, terms) =>
                term.length >= prefix.minTermLength &&
                (!prefix.lastTermOnly || index === terms.length - 1),
      });
      const limit = normalizeLimit(query.limit, DEFAULT_RESULT_LIMIT);

      return {
        query: displayQuery,
        results: selectResults(
          hits
            .map((hit) => ({
              result: resultsById.get(String(hit.id)),
              score:
                hit.score +
                getExactMatchBonus(
                  recordsById.get(String(hit.id)),
                  normalizedQuery,
                ),
            }))
            .filter(
              (item): item is { result: DocsSearchResult; score: number } =>
                item.result !== undefined,
            )
            .sort((left, right) => right.score - left.score),
          limit,
          resolved.maxResultsPerPage,
        ),
      } satisfies DocsSearchResponse;
    },

    suggest(query, limit = 5) {
      const normalizedQuery = normalizeDocsSearchText(query);
      const fuzzy = resolved.fuzzy;

      if (!normalizedQuery || limit <= 0) {
        return [];
      }

      return miniSearch
        .autoSuggest(normalizedQuery, {
          fuzzy:
            fuzzy === false
              ? false
              : (term) =>
                  term.length >= fuzzy.minTermLength ? fuzzy.distance : false,
          prefix: true,
        })
        .slice(0, Math.floor(limit))
        .map(({ suggestion, terms, score }) => ({
          suggestion,
          terms: [...terms],
          score,
        }));
    },
  };
}

function createMiniSearchDocument(
  record: DocsSearchRecord,
  options: ResolvedOptions,
): MiniSearchDocument {
  const searchableText = normalizeDocsSearchText(
    [
      record.title,
      record.pageTitle,
      record.sectionTitle,
      record.description,
      record.tags?.join(' '),
      record.aliases?.join(' '),
      record.text,
    ]
      .filter(Boolean)
      .join(' '),
  );

  return {
    id: record.id,
    title: createDocsSearchText(record.title),
    pageTitle: createDocsSearchText(record.pageTitle ?? ''),
    sectionTitle: createDocsSearchText(record.sectionTitle ?? ''),
    tags: createDocsSearchText(record.tags?.join(' ') ?? ''),
    aliases: createDocsSearchText(record.aliases?.join(' ') ?? ''),
    synonyms: collectDocumentSynonyms(searchableText, options.synonyms),
    description: createDocsSearchText(record.description ?? ''),
    text: createDocsSearchText(record.text),
    collectionId: record.collectionId ?? '',
  };
}

function collectDocumentSynonyms(
  searchableText: string,
  groups: readonly (readonly string[])[],
): string {
  const expansions = new Set<string>();

  for (const group of groups) {
    const normalized = group.map(normalizeDocsSearchText).filter(Boolean);

    const paddedText = ` ${searchableText} `;

    if (normalized.some((term) => paddedText.includes(` ${term} `))) {
      normalized.forEach((term) => expansions.add(term));
    }
  }

  return [...expansions].join(' ');
}

function createSearchResult(record: DocsSearchRecord): DocsSearchResult {
  return {
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
}

function getExactMatchBonus(
  record: DocsSearchRecord | undefined,
  query: string,
): number {
  if (!record) return 0;

  const priority = normalizePriority(record.searchPriority);
  const title = normalizeDocsSearchText(record.title);

  if (title === query) return 1_000 + priority;
  if (title.includes(query)) return 100 + priority;
  return priority;
}

function selectResults(
  items: readonly { result: DocsSearchResult; score: number }[],
  limit: number,
  maxResultsPerPage: number,
): DocsSearchResult[] {
  if (limit <= 0) return [];

  const selected: DocsSearchResult[] = [];
  const pageCounts = new Map<string, number>();

  for (const { result } of items) {
    const pageId = result.pageId ?? result.id;
    const count = pageCounts.get(pageId) ?? 0;

    if (maxResultsPerPage > 0 && count >= maxResultsPerPage) continue;

    selected.push(result);
    pageCounts.set(pageId, count + 1);

    if (selected.length >= limit) break;
  }

  return selected;
}

function getPopularResults(
  records: readonly DocsSearchRecord[],
  collectionScope: ReadonlySet<string> | undefined,
  limit: number,
): DocsSearchResult[] {
  return records
    .filter(
      (record) =>
        record.kind !== 'heading' &&
        (!collectionScope ||
          (record.collectionId !== undefined &&
            collectionScope.has(record.collectionId))),
    )
    .sort(
      (left, right) =>
        normalizePriority(right.searchPriority) -
        normalizePriority(left.searchPriority),
    )
    .slice(0, limit)
    .map(createSearchResult);
}

function tokenizeSearchText(value: string): string[] {
  return createDocsSearchText(value).split(' ').filter(Boolean);
}

function normalizePriority(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(-20, Math.min(20, Math.round(value)));
}

function normalizeLimit(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}

function normalizeCollectionScope(
  collectionIds: readonly string[] | undefined,
): ReadonlySet<string> | undefined {
  if (collectionIds === undefined) return undefined;
  if (!Array.isArray(collectionIds)) {
    throw new TypeError('collectionIds must be an array of strings.');
  }

  const normalized = new Set<string>();

  for (const collectionId of collectionIds) {
    if (typeof collectionId !== 'string') {
      throw new TypeError('collectionIds must contain only strings.');
    }

    const id = collectionId.trim();
    if (id) normalized.add(id);
  }

  return normalized.size > 0 ? normalized : undefined;
}

function assertSearchQuery(query: DocsSearchQuery): void {
  if (!query || typeof query !== 'object') {
    throw new TypeError('Search query must be an object.');
  }

  if (typeof query.query !== 'string') {
    throw new TypeError('query must be a string.');
  }
}

function resolveOptions(options: DocsMiniSearchEngineOptions): ResolvedOptions {
  return {
    fields: {
      title: options.fields?.title ?? 10,
      pageTitle: options.fields?.pageTitle ?? 7,
      sectionTitle: options.fields?.sectionTitle ?? 7,
      tags: options.fields?.tags ?? 6,
      aliases: options.fields?.aliases ?? 6,
      synonyms: options.fields?.synonyms ?? 5,
      description: options.fields?.description ?? 3,
      text: options.fields?.text ?? 1,
    },
    fuzzy:
      options.fuzzy === false
        ? false
        : {
            distance: options.fuzzy?.distance ?? 0.2,
            minTermLength: options.fuzzy?.minTermLength ?? 4,
          },
    prefix:
      options.prefix === false
        ? false
        : {
            enabled: options.prefix?.enabled ?? true,
            minTermLength: options.prefix?.minTermLength ?? 2,
            lastTermOnly: options.prefix?.lastTermOnly ?? true,
          },
    synonyms: options.synonyms ?? [],
    maxResultsPerPage: Math.max(
      0,
      Math.floor(options.maxResultsPerPage ?? DEFAULT_MAX_RESULTS_PER_PAGE),
    ),
  };
}
