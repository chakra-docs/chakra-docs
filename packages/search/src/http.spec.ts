import type { DocsSearchProvider } from './index.js';
import { createDocsSearchEngine } from './index.js';
import { createFetchSearchHandler } from './http.js';

function request(search = '', method = 'GET'): Request {
  return new Request(`https://docs.example.test/api/search${search}`, {
    method,
  });
}

describe('createFetchSearchHandler', () => {
  it('parses supported query parameters and forwards cancellation', async () => {
    let captured:
      | {
          query: Parameters<DocsSearchProvider>[0];
          signal: AbortSignal | undefined;
        }
      | undefined;
    const provider: DocsSearchProvider = async (query, options) => {
      captured = { query, signal: options?.signal };
      return {
        query: query.query,
        results: [{ id: 'install', route: '/install', title: 'Install' }],
      };
    };
    const response = await createFetchSearchHandler(provider)(
      request('?q=Install&collection=v1&collection=v2&limit=4&popularLimit=3'),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe(
      'application/json; charset=utf-8',
    );
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual({
      query: 'Install',
      results: [{ id: 'install', route: '/install', title: 'Install' }],
    });
    expect(captured?.query).toEqual({
      query: 'Install',
      collectionIds: ['v1', 'v2'],
      limit: 4,
      popularLimit: 3,
    });
    expect(captured?.signal).toBeInstanceOf(AbortSignal);
  });

  it('uses an engine directly and supports blank-query popular results', async () => {
    const engine = createDocsSearchEngine([
      {
        id: 'heading',
        kind: 'heading',
        route: '/docs#heading',
        title: 'Heading',
        headings: [],
        text: '',
      },
      {
        id: 'page',
        kind: 'page',
        route: '/docs',
        title: 'Docs',
        headings: [],
        text: '',
      },
    ]);
    const response = await createFetchSearchHandler(engine)(request());

    expect(await response.json()).toMatchObject({
      query: '',
      results: [{ id: 'page', route: '/docs', title: 'Docs' }],
    });
  });

  it('trims collection values and ignores unrelated parameters', async () => {
    let captured: Parameters<DocsSearchProvider>[0] | undefined;
    const provider: DocsSearchProvider = async (query) => {
      captured = query;
      return { query: query.query, results: [] };
    };

    await createFetchSearchHandler(provider)(
      request('?collection=%20v1%20&unrelated=value'),
    );

    expect(captured).toEqual({
      query: '',
      collectionIds: ['v1'],
      limit: undefined,
      popularLimit: undefined,
    });
  });

  it('rejects non-GET methods with a structured 405 response', async () => {
    const provider = vi.fn<DocsSearchProvider>();
    const response = await createFetchSearchHandler(provider)(
      request('', 'POST'),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual({
      error: {
        code: 'method_not_allowed',
        message: 'Search only accepts GET requests.',
      },
    });
    expect(provider).not.toHaveBeenCalled();
  });

  it.each([
    ['?q=one&q=two', 'q'],
    ['?limit=1&limit=2', 'limit'],
    ['?popularLimit=1&popularLimit=2', 'popularLimit'],
    ['?limit=-1', 'limit'],
    ['?limit=1.5', 'limit'],
    ['?limit=01', 'limit'],
    ['?limit=9007199254740992', 'limit'],
    ['?popularLimit=21', 'popularLimit'],
    ['?collection=', 'collection'],
  ])('returns 400 for invalid parameters in %s', async (search, field) => {
    const handler = createFetchSearchHandler(async (query) => ({
      query: query.query,
      results: [],
    }));
    const response = await handler(request(search));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      error: { code: 'invalid_request', field },
    });
  });

  it('enforces the default query and collection bounds', async () => {
    const handler = createFetchSearchHandler(async (query) => ({
      query: query.query,
      results: [],
    }));
    const longQuery = `?q=${'q'.repeat(129)}`;
    const longCollection = `?collection=${'c'.repeat(129)}`;
    const tooManyCollections = `?${Array.from(
      { length: 6 },
      (_, index) => `collection=c${index}`,
    ).join('&')}`;

    for (const url of [longQuery, longCollection, tooManyCollections]) {
      const response = await handler(request(url));
      expect(response.status).toBe(400);
    }
  });

  it('supports custom validation caps and cache headers', async () => {
    const provider: DocsSearchProvider = async (query) => ({
      query: query.query,
      results: [],
    });
    const handler = createFetchSearchHandler(provider, {
      maxQueryLength: 2,
      maxCollectionIds: 1,
      maxCollectionIdLength: 2,
      maxResults: 2,
      cacheControl: 'public, max-age=60',
    });
    const success = await handler(
      request('?q=ok&collection=v1&limit=2&popularLimit=0'),
    );

    expect(success.status).toBe(200);
    expect(success.headers.get('cache-control')).toBe('public, max-age=60');
    expect((await handler(request('?q=too'))).status).toBe(400);
    expect(
      (await handler(request('?collection=v1&collection=v2'))).status,
    ).toBe(400);
    expect((await handler(request('?collection=old'))).status).toBe(400);
    expect((await handler(request('?limit=3'))).status).toBe(400);
  });

  it('can omit the successful Cache-Control header', async () => {
    const response = await createFetchSearchHandler(
      async (query) => ({ query: query.query, results: [] }),
      { cacheControl: false },
    )(request());

    expect(response.status).toBe(200);
    expect(response.headers.has('cache-control')).toBe(false);
  });

  it('returns a generic 500 when search fails or returns an invalid shape', async () => {
    const failed = await createFetchSearchHandler(async () => {
      throw new Error('database credentials must not leak');
    })(request('?q=secret'));
    const malformed = await createFetchSearchHandler(
      async () =>
        ({ query: '', results: [{ id: 'bad', text: 'large' }] }) as never,
    )(request());

    for (const response of [failed, malformed]) {
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: {
          code: 'search_failed',
          message: 'Search is temporarily unavailable.',
        },
      });
    }
  });

  it.each([
    [{ maxQueryLength: -1 }, 'maxQueryLength'],
    [{ maxCollectionIds: 1.2 }, 'maxCollectionIds'],
    [
      { maxCollectionIdLength: Number.POSITIVE_INFINITY },
      'maxCollectionIdLength',
    ],
    [{ maxResults: Number.NaN }, 'maxResults'],
  ])('rejects invalid handler option %s', (options, name) => {
    expect(() =>
      createFetchSearchHandler(
        async (query) => ({ query: query.query, results: [] }),
        options,
      ),
    ).toThrow(name);
  });

  it('rejects invalid search implementations and cache options', () => {
    expect(() => createFetchSearchHandler({} as never)).toThrow(TypeError);
    expect(() =>
      createFetchSearchHandler(
        async (query) => ({ query: query.query, results: [] }),
        {
          cacheControl: '',
        },
      ),
    ).toThrow('cacheControl');
  });
});
