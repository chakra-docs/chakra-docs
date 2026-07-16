import { isDocsSearchResponse } from './lib/response-validation.js';
import type { DocsSearchProvider, DocsSearchQuery } from './lib/search.js';

export interface HttpSearchProviderOptions {
  fetch?: typeof globalThis.fetch;
  headers?: ConstructorParameters<typeof Headers>[0];
}

export class DocsSearchHttpError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'DocsSearchHttpError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Creates a small remote provider for `DocsSearch`. Relative endpoints remain
 * unresolved until invocation, making construction safe during Next SSR.
 */
export function createHttpSearchProvider(
  endpoint: string | URL,
  options: HttpSearchProviderOptions = {},
): DocsSearchProvider {
  const endpointValue =
    endpoint instanceof URL ? endpoint.toString() : endpoint;

  if (typeof endpointValue !== 'string' || !endpointValue.trim()) {
    throw new TypeError('endpoint must be a non-empty URL or URL string.');
  }

  const fetchSearch = options.fetch ?? globalThis.fetch;

  if (typeof fetchSearch !== 'function') {
    throw new TypeError('A Fetch-compatible implementation is required.');
  }

  return async function httpSearchProvider(query, providerOptions) {
    const requestUrl = createSearchRequestUrl(endpointValue, query);
    const headers = new Headers(options.headers);

    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    const response = await fetchSearch(requestUrl, {
      method: 'GET',
      headers,
      signal: providerOptions?.signal,
    });

    if (!response.ok) {
      throw await createHttpError(response);
    }

    let body: unknown;

    try {
      body = await response.json();
    } catch {
      throw new TypeError('Search endpoint returned invalid JSON.');
    }

    if (!isDocsSearchResponse(body)) {
      throw new TypeError('Search endpoint returned an invalid response.');
    }

    return body;
  };
}

function createSearchRequestUrl(
  endpoint: string,
  query: DocsSearchQuery,
): string {
  assertSearchQuery(query);

  const hashIndex = endpoint.indexOf('#');
  const endpointWithoutHash =
    hashIndex === -1 ? endpoint : endpoint.slice(0, hashIndex);
  const queryIndex = endpointWithoutHash.indexOf('?');
  const path =
    queryIndex === -1
      ? endpointWithoutHash
      : endpointWithoutHash.slice(0, queryIndex);
  const existingQuery =
    queryIndex === -1 ? '' : endpointWithoutHash.slice(queryIndex + 1);
  const params = new URLSearchParams(existingQuery);

  params.set('q', query.query);
  params.delete('collection');
  params.delete('limit');
  params.delete('popularLimit');

  if (query.collectionIds !== undefined) {
    if (!Array.isArray(query.collectionIds)) {
      throw new TypeError('collectionIds must be an array of strings.');
    }

    for (const collectionId of query.collectionIds) {
      if (typeof collectionId !== 'string' || !collectionId.trim()) {
        throw new TypeError(
          'collectionIds must contain only non-empty strings.',
        );
      }

      params.append('collection', collectionId.trim());
    }
  }

  appendLimit(params, 'limit', query.limit);
  appendLimit(params, 'popularLimit', query.popularLimit);

  const serialized = params.toString();
  return serialized ? `${path}?${serialized}` : path;
}

function appendLimit(
  params: URLSearchParams,
  name: 'limit' | 'popularLimit',
  value: number | undefined,
): void {
  if (value === undefined) {
    return;
  }

  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative safe integer.`);
  }

  params.set(name, String(value));
}

async function createHttpError(
  response: Response,
): Promise<DocsSearchHttpError> {
  let errorBody: unknown;

  try {
    errorBody = await response.json();
  } catch {
    // A non-JSON error body is still represented by the HTTP status below.
  }

  const error = getStructuredError(errorBody);
  const message =
    error?.message ||
    response.statusText ||
    `Search request failed with status ${response.status}.`;

  return new DocsSearchHttpError(message, response.status, error?.code);
}

function getStructuredError(
  value: unknown,
): { code?: string; message?: string } | undefined {
  if (!isRecord(value) || !isRecord(value.error)) {
    return undefined;
  }

  const code =
    typeof value.error.code === 'string' ? value.error.code : undefined;
  const message =
    typeof value.error.message === 'string' ? value.error.message : undefined;

  return code || message ? { code, message } : undefined;
}

function assertSearchQuery(query: DocsSearchQuery): void {
  if (!query || typeof query !== 'object' || typeof query.query !== 'string') {
    throw new TypeError(
      'query must be a search query with a string query field.',
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
