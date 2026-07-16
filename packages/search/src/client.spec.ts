import { createHttpSearchProvider, DocsSearchHttpError } from './client.js';

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('createHttpSearchProvider', () => {
  it('lazily builds a relative URL with repeated collection parameters', async () => {
    const fetchSearch = vi.fn<typeof fetch>(async () =>
      jsonResponse({
        query: 'install now',
        results: [{ id: 'install', route: '/install', title: 'Install' }],
      }),
    );
    const provider = createHttpSearchProvider(
      '/api/docs/search?tenant=acme&q=old&collection=old#ignored',
      { fetch: fetchSearch },
    );

    expect(fetchSearch).not.toHaveBeenCalled();

    const response = await provider({
      query: 'install now',
      collectionIds: ['v1', ' v2 '],
      limit: 8,
      popularLimit: 4,
    });

    expect(response.results[0]?.id).toBe('install');
    expect(fetchSearch).toHaveBeenCalledOnce();
    const [url, init] = fetchSearch.mock.calls[0];
    expect(url).toBe(
      '/api/docs/search?tenant=acme&q=install+now&collection=v1&collection=v2&limit=8&popularLimit=4',
    );
    expect(init?.method).toBe('GET');
    expect(new Headers(init?.headers).get('accept')).toBe('application/json');
  });

  it('accepts URL objects and preserves unrelated query parameters', async () => {
    const fetchSearch = vi.fn<typeof fetch>(async () =>
      jsonResponse({ query: '', results: [] }),
    );
    const provider = createHttpSearchProvider(
      new URL('https://docs.example.test/search?locale=en'),
      { fetch: fetchSearch },
    );

    await provider({ query: '' });

    expect(fetchSearch.mock.calls[0][0]).toBe(
      'https://docs.example.test/search?locale=en&q=',
    );
  });

  it('forwards AbortSignal and configured headers', async () => {
    const controller = new AbortController();
    const fetchSearch = vi.fn<typeof fetch>(async () =>
      jsonResponse({ query: 'docs', results: [] }),
    );
    const provider = createHttpSearchProvider('/search', {
      fetch: fetchSearch,
      headers: {
        Accept: 'application/vnd.docs+json',
        Authorization: 'Bearer x',
      },
    });

    await provider({ query: 'docs' }, { signal: controller.signal });

    const init = fetchSearch.mock.calls[0][1];
    expect(init?.signal).toBe(controller.signal);
    expect(new Headers(init?.headers)).toMatchObject({});
    expect(new Headers(init?.headers).get('accept')).toBe(
      'application/vnd.docs+json',
    );
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer x');
  });

  it('rejects structured HTTP failures with status and code', async () => {
    const provider = createHttpSearchProvider('/search', {
      fetch: async () =>
        jsonResponse(
          {
            error: {
              code: 'invalid_request',
              message: 'q is too long.',
            },
          },
          { status: 400 },
        ),
    });

    const error = await provider({ query: 'long' }).catch((reason: unknown) =>
      reason instanceof Error ? reason : new Error(String(reason)),
    );

    expect(error).toBeInstanceOf(DocsSearchHttpError);
    expect(error).toMatchObject({
      message: 'q is too long.',
      status: 400,
      code: 'invalid_request',
    });
  });

  it('falls back to HTTP status information for non-JSON errors', async () => {
    const provider = createHttpSearchProvider('/search', {
      fetch: async () =>
        new Response('upstream unavailable', {
          status: 503,
          statusText: 'Service Unavailable',
        }),
    });

    await expect(provider({ query: 'docs' })).rejects.toMatchObject({
      name: 'DocsSearchHttpError',
      message: 'Service Unavailable',
      status: 503,
      code: undefined,
    });
  });

  it('uses the generic status message when no other error message exists', async () => {
    const provider = createHttpSearchProvider('/search', {
      fetch: async () => new Response(null, { status: 500 }),
    });

    await expect(provider({ query: '' })).rejects.toThrow(
      'Search request failed with status 500.',
    );
  });

  it('retains a structured code when its error has no message', async () => {
    const provider = createHttpSearchProvider('/search', {
      fetch: async () =>
        jsonResponse({ error: { code: 'busy' } }, { status: 503 }),
    });

    await expect(provider({ query: '' })).rejects.toMatchObject({
      code: 'busy',
      status: 503,
    });
  });

  it('rejects invalid JSON in a successful response', async () => {
    const provider = createHttpSearchProvider('/search', {
      fetch: async () => new Response('not-json'),
    });

    await expect(provider({ query: 'docs' })).rejects.toThrow(
      'Search endpoint returned invalid JSON.',
    );
  });

  it.each([
    {},
    { query: 1, results: [] },
    { query: '', results: {} },
    { query: '', results: [null] },
    {
      query: '',
      results: [{ id: 'a', route: '/', title: 'A', text: 'large' }],
    },
    { query: '', results: [{ id: 'a', route: '/', title: 'A', headings: [] }] },
    {
      query: '',
      results: [{ id: 'a', route: '/', title: 'A', kind: 'other' }],
    },
    { query: '', results: [{ id: 'a', route: '/', title: 'A', pageId: 1 }] },
    {
      query: '',
      results: [{ id: 'a', route: '/', title: 'A', headingLevel: null }],
    },
    {
      query: '',
      results: [{ id: 'a', route: '/', title: 'A', headingLevel: 1.5 }],
    },
    {
      query: '',
      results: [{ id: 'a', route: '/', title: 'A', headingLevel: -1 }],
    },
    { query: '', results: [{ id: 'a', route: '/', title: 'A', tags: [1] }] },
  ])('rejects malformed successful response %#', async (body) => {
    const provider = createHttpSearchProvider('/search', {
      fetch: async () => jsonResponse(body),
    });

    await expect(provider({ query: '' })).rejects.toThrow(
      'Search endpoint returned an invalid response.',
    );
  });

  it('accepts all compact optional result fields', async () => {
    const body = {
      query: 'install',
      results: [
        {
          id: 'install#quick',
          kind: 'heading',
          pageId: 'install',
          collectionId: 'v1',
          sourceId: 'docs',
          route: '/install#quick',
          title: 'Quick install',
          pageTitle: 'Install',
          sectionTitle: 'Quick install',
          headingId: 'quick',
          headingLevel: 2,
          description: 'Install quickly.',
          tags: ['setup'],
        },
      ],
    };
    const provider = createHttpSearchProvider('/search', {
      fetch: async () => jsonResponse(body),
    });

    await expect(provider({ query: 'install' })).resolves.toEqual(body);
  });

  it.each([
    [undefined, 'query'],
    [{ query: 1 }, 'query'],
    [{ query: '', collectionIds: 'v1' }, 'collectionIds'],
    [{ query: '', collectionIds: [''] }, 'collectionIds'],
    [{ query: '', collectionIds: [1] }, 'collectionIds'],
    [{ query: '', limit: -1 }, 'limit'],
    [{ query: '', limit: 1.5 }, 'limit'],
    [{ query: '', popularLimit: Number.POSITIVE_INFINITY }, 'popularLimit'],
  ])('rejects malformed client query %#', async (query, message) => {
    const provider = createHttpSearchProvider('/search', {
      fetch: async () => jsonResponse({ query: '', results: [] }),
    });

    await expect(provider(query as never)).rejects.toThrow(message);
  });

  it('validates its endpoint and Fetch implementation', () => {
    expect(() => createHttpSearchProvider('')).toThrow('endpoint');
    expect(() =>
      createHttpSearchProvider('/search', { fetch: 1 as never }),
    ).toThrow('Fetch-compatible');
  });

  it('propagates Fetch-level failures unchanged', async () => {
    const networkError = new Error('network unavailable');
    const provider = createHttpSearchProvider('/search', {
      fetch: async () => {
        throw networkError;
      },
    });

    await expect(provider({ query: 'docs' })).rejects.toBe(networkError);
  });
});
