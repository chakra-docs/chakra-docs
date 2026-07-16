import type { IncomingHttpHeaders } from 'node:http';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { DocsSearchProvider } from '@chakra-docs/search';
import { describe, expect, it, vi } from 'vitest';
import {
  createAppRouterSearchHandler,
  createPagesRouterSearchHandler,
} from './search.js';

function createProvider() {
  return vi.fn<DocsSearchProvider>(async (query) => ({
    query: query.query,
    results: [],
  }));
}

function createPagesRequest(options: {
  method?: string;
  query?: NextApiRequest['query'];
  headers?: IncomingHttpHeaders;
}): NextApiRequest {
  return {
    headers: options.headers ?? {},
    method: options.method ?? 'GET',
    query: options.query ?? {},
  } as NextApiRequest;
}

function createPagesResponse() {
  const headers = new Map<string, string | number | readonly string[]>();
  let body = Buffer.alloc(0);

  const response = {
    statusCode: 200,
    setHeader(name: string, value: string | number | readonly string[]) {
      headers.set(name.toLowerCase(), value);
      return response;
    },
    end(chunk?: Uint8Array | string) {
      if (chunk !== undefined) {
        body = Buffer.from(chunk);
      }

      return response;
    },
  } as unknown as NextApiResponse<unknown>;

  return {
    response,
    get body() {
      return body;
    },
    getHeader(name: string) {
      return headers.get(name.toLowerCase());
    },
  };
}

async function readJson(response: Response): Promise<unknown> {
  return response.json() as Promise<unknown>;
}

function readPagesJson(body: Buffer): unknown {
  return JSON.parse(body.toString('utf8')) as unknown;
}

describe('createAppRouterSearchHandler', () => {
  it('delegates method validation to the Fetch handler', async () => {
    const search = createProvider();
    const handler = createAppRouterSearchHandler(search);

    const response = await handler(
      new Request('https://example.com/api/search?q=docs', {
        method: 'POST',
      }),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await readJson(response)).toEqual({
      error: {
        code: 'method_not_allowed',
        message: 'Search only accepts GET requests.',
      },
    });
    expect(search).not.toHaveBeenCalled();
  });

  it('returns validation errors for malformed inputs', async () => {
    const search = createProvider();
    const handler = createAppRouterSearchHandler(search);

    const response = await handler(
      new Request('https://example.com/api/search?q=docs&limit=not-a-number'),
    );

    expect(response.status).toBe(400);
    expect(await readJson(response)).toMatchObject({
      error: { code: 'invalid_request', field: 'limit' },
    });
    expect(search).not.toHaveBeenCalled();
  });

  it('uses the configured cache policy for successful searches', async () => {
    const search = createProvider();
    const handler = createAppRouterSearchHandler(search, {
      cacheControl: 'public, max-age=60, stale-while-revalidate=300',
    });

    const response = await handler(
      new Request('https://example.com/api/search?q=docs'),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(
      'public, max-age=60, stale-while-revalidate=300',
    );
    expect(await readJson(response)).toEqual({ query: 'docs', results: [] });
  });
});

describe('createPagesRouterSearchHandler', () => {
  it('defaults a missing method to GET and ignores undefined query values', async () => {
    const search = createProvider();
    const handler = createPagesRouterSearchHandler(search);
    const request = createPagesRequest({
      query: { q: 'docs', collection: undefined },
    });
    const result = createPagesResponse();
    request.method = undefined;

    await handler(request, result.response);

    expect(result.response.statusCode).toBe(200);
    expect(search.mock.calls[0]?.[0]).toEqual({
      query: 'docs',
      collectionIds: undefined,
      limit: undefined,
      popularLimit: undefined,
    });
  });

  it('preserves repeated collection parameters', async () => {
    const search = createProvider();
    const handler = createPagesRouterSearchHandler(search);
    const result = createPagesResponse();

    await handler(
      createPagesRequest({
        query: {
          q: 'installation',
          collection: ['guides', 'api'],
          limit: '5',
        },
      }),
      result.response,
    );

    expect(result.response.statusCode).toBe(200);
    expect(search).toHaveBeenCalledOnce();
    expect(search.mock.calls[0]?.[0]).toEqual({
      query: 'installation',
      collectionIds: ['guides', 'api'],
      limit: 5,
      popularLimit: undefined,
    });
    expect(readPagesJson(result.body)).toEqual({
      query: 'installation',
      results: [],
    });
  });

  it('relays validation status, headers and JSON bodies', async () => {
    const search = createProvider();
    const handler = createPagesRouterSearchHandler(search);
    const result = createPagesResponse();

    await handler(
      createPagesRequest({ query: { q: 'docs', popularLimit: '-1' } }),
      result.response,
    );

    expect(result.response.statusCode).toBe(400);
    expect(result.getHeader('content-type')).toBe(
      'application/json; charset=utf-8',
    );
    expect(result.getHeader('cache-control')).toBe('private, no-store');
    expect(readPagesJson(result.body)).toMatchObject({
      error: { code: 'invalid_request', field: 'popularLimit' },
    });
    expect(search).not.toHaveBeenCalled();
  });

  it('relays method errors and the Allow header', async () => {
    const search = createProvider();
    const handler = createPagesRouterSearchHandler(search);
    const result = createPagesResponse();

    await handler(
      createPagesRequest({ method: 'POST', query: { q: 'docs' } }),
      result.response,
    );

    expect(result.response.statusCode).toBe(405);
    expect(result.getHeader('allow')).toBe('GET');
    expect(readPagesJson(result.body)).toMatchObject({
      error: { code: 'method_not_allowed' },
    });
    expect(search).not.toHaveBeenCalled();
  });

  it('turns search provider failures into safe server errors', async () => {
    const search = vi.fn<DocsSearchProvider>(async () => {
      throw new Error('database password must not escape');
    });
    const handler = createPagesRouterSearchHandler(search);
    const result = createPagesResponse();

    await handler(
      createPagesRequest({ query: { q: 'docs' } }),
      result.response,
    );

    expect(result.response.statusCode).toBe(500);
    expect(result.getHeader('cache-control')).toBe('private, no-store');
    expect(readPagesJson(result.body)).toEqual({
      error: {
        code: 'search_failed',
        message: 'Search is temporarily unavailable.',
      },
    });
    expect(result.body.toString('utf8')).not.toContain('database password');
  });
});
