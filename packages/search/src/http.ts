import { isDocsSearchResponse } from './lib/response-validation.js';
import type {
  DocsSearchEngine,
  DocsSearchProvider,
  DocsSearchQuery,
} from './lib/search.js';

const DEFAULT_MAX_QUERY_LENGTH = 128;
const DEFAULT_MAX_COLLECTION_IDS = 5;
const DEFAULT_MAX_COLLECTION_ID_LENGTH = 128;
const DEFAULT_MAX_RESULTS = 20;
const DEFAULT_CACHE_CONTROL = 'private, no-store';

export interface FetchSearchHandlerOptions {
  maxQueryLength?: number;
  maxCollectionIds?: number;
  maxCollectionIdLength?: number;
  maxResults?: number;
  /** Set to `false` to omit Cache-Control from successful responses. */
  cacheControl?: string | false;
}

export type DocsSearchHttpErrorCode =
  'invalid_request' | 'method_not_allowed' | 'search_failed';

export interface DocsSearchHttpErrorResponse {
  error: {
    code: DocsSearchHttpErrorCode;
    message: string;
    field?: string;
  };
}

export type FetchSearchHandler = (request: Request) => Promise<Response>;

interface ResolvedFetchSearchHandlerOptions {
  maxQueryLength: number;
  maxCollectionIds: number;
  maxCollectionIdLength: number;
  maxResults: number;
  cacheControl: string | false;
}

class SearchRequestError extends Error {
  constructor(
    message: string,
    readonly field: string,
  ) {
    super(message);
    this.name = 'SearchRequestError';
  }
}

/**
 * Adapts a synchronous engine or asynchronous provider to the standard Fetch
 * Request/Response contract used by Next route handlers and many Node servers.
 */
export function createFetchSearchHandler(
  search: DocsSearchEngine | DocsSearchProvider,
  options: FetchSearchHandlerOptions = {},
): FetchSearchHandler {
  if (
    typeof search !== 'function' &&
    (!search || typeof search.search !== 'function')
  ) {
    throw new TypeError('search must be a DocsSearchEngine or provider.');
  }

  const resolved = resolveOptions(options);

  return async function handleSearchRequest(request) {
    if (request.method !== 'GET') {
      return createErrorResponse(
        405,
        'method_not_allowed',
        'Search only accepts GET requests.',
        undefined,
        { Allow: 'GET' },
      );
    }

    let query: DocsSearchQuery;

    try {
      query = parseSearchQuery(new URL(request.url).searchParams, resolved);
    } catch (error) {
      if (error instanceof SearchRequestError) {
        return createErrorResponse(
          400,
          'invalid_request',
          error.message,
          error.field,
        );
      }

      return createErrorResponse(
        400,
        'invalid_request',
        'The search request URL is invalid.',
      );
    }

    try {
      const response =
        typeof search === 'function'
          ? await search(query, { signal: request.signal })
          : search.search(query);

      if (!isDocsSearchResponse(response)) {
        throw new TypeError('Search returned an invalid response.');
      }

      return createJsonResponse(response, 200, resolved.cacheControl);
    } catch {
      return createErrorResponse(
        500,
        'search_failed',
        'Search is temporarily unavailable.',
      );
    }
  };
}

function parseSearchQuery(
  params: URLSearchParams,
  options: ResolvedFetchSearchHandlerOptions,
): DocsSearchQuery {
  const query = readSingleParameter(params, 'q') ?? '';

  if (query.length > options.maxQueryLength) {
    throw new SearchRequestError(
      `q must be at most ${options.maxQueryLength} characters.`,
      'q',
    );
  }

  const rawCollectionIds = params.getAll('collection');

  if (rawCollectionIds.length > options.maxCollectionIds) {
    throw new SearchRequestError(
      `collection may be provided at most ${options.maxCollectionIds} times.`,
      'collection',
    );
  }

  const collectionIds = rawCollectionIds.map((rawId) => {
    const collectionId = rawId.trim();

    if (!collectionId) {
      throw new SearchRequestError(
        'collection values must not be empty.',
        'collection',
      );
    }

    if (collectionId.length > options.maxCollectionIdLength) {
      throw new SearchRequestError(
        `collection values must be at most ${options.maxCollectionIdLength} characters.`,
        'collection',
      );
    }

    return collectionId;
  });

  const limit = readLimitParameter(params, 'limit', options.maxResults);
  const popularLimit = readLimitParameter(
    params,
    'popularLimit',
    options.maxResults,
  );

  return {
    query,
    collectionIds: collectionIds.length > 0 ? collectionIds : undefined,
    limit,
    popularLimit,
  };
}

function readSingleParameter(
  params: URLSearchParams,
  name: string,
): string | undefined {
  const values = params.getAll(name);

  if (values.length > 1) {
    throw new SearchRequestError(`${name} may only be provided once.`, name);
  }

  return values[0];
}

function readLimitParameter(
  params: URLSearchParams,
  name: 'limit' | 'popularLimit',
  maximum: number,
): number | undefined {
  const value = readSingleParameter(params, name);

  if (value === undefined) {
    return undefined;
  }

  if (!/^(?:0|[1-9]\d*)$/.test(value)) {
    throw new SearchRequestError(
      `${name} must be a non-negative integer.`,
      name,
    );
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed > maximum) {
    throw new SearchRequestError(`${name} must be at most ${maximum}.`, name);
  }

  return parsed;
}

function resolveOptions(
  options: FetchSearchHandlerOptions,
): ResolvedFetchSearchHandlerOptions {
  const cacheControl = options.cacheControl ?? DEFAULT_CACHE_CONTROL;

  if (
    cacheControl !== false &&
    (typeof cacheControl !== 'string' || !cacheControl.trim())
  ) {
    throw new TypeError('cacheControl must be a non-empty string or false.');
  }

  return {
    maxQueryLength: readNonNegativeOption(
      options.maxQueryLength,
      DEFAULT_MAX_QUERY_LENGTH,
      'maxQueryLength',
    ),
    maxCollectionIds: readNonNegativeOption(
      options.maxCollectionIds,
      DEFAULT_MAX_COLLECTION_IDS,
      'maxCollectionIds',
    ),
    maxCollectionIdLength: readNonNegativeOption(
      options.maxCollectionIdLength,
      DEFAULT_MAX_COLLECTION_ID_LENGTH,
      'maxCollectionIdLength',
    ),
    maxResults: readNonNegativeOption(
      options.maxResults,
      DEFAULT_MAX_RESULTS,
      'maxResults',
    ),
    cacheControl,
  };
}

function readNonNegativeOption(
  value: number | undefined,
  fallback: number,
  name: string,
): number {
  const resolved = value ?? fallback;

  if (!Number.isSafeInteger(resolved) || resolved < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer.`);
  }

  return resolved;
}

function createErrorResponse(
  status: number,
  code: DocsSearchHttpErrorCode,
  message: string,
  field?: string,
  responseHeaders?: ConstructorParameters<typeof Headers>[0],
): Response {
  const body: DocsSearchHttpErrorResponse = {
    error: {
      code,
      message,
      field,
    },
  };

  return createJsonResponse(
    body,
    status,
    DEFAULT_CACHE_CONTROL,
    responseHeaders,
  );
}

function createJsonResponse(
  body: unknown,
  status: number,
  cacheControl: string | false,
  responseHeaders?: ConstructorParameters<typeof Headers>[0],
): Response {
  const headers = new Headers(responseHeaders);
  headers.set('Content-Type', 'application/json; charset=utf-8');

  if (cacheControl !== false) {
    headers.set('Cache-Control', cacheControl);
  }

  return new Response(JSON.stringify(body), { status, headers });
}
