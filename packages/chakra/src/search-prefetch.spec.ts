import { describe, expect, it, vi } from 'vitest';
import type { DocsSearchResponse } from '@chakra-docs/search';
import { createSearchPrefetch } from './search-prefetch.js';

function response(id: string): DocsSearchResponse {
  return { query: '', results: [{ id, title: id, route: `/docs/${id}` }] };
}

function deferred() {
  let resolve!: (value: DocsSearchResponse) => void;
  const promise = new Promise<DocsSearchResponse>((accept) => {
    resolve = accept;
  });
  return { resolve, promise };
}

describe('createSearchPrefetch', () => {
  it('deduplicates prefetch and foreground requests with the configured scope and limits', async () => {
    const pending = deferred();
    const provider = vi.fn(() => pending.promise);
    const query = {
      query: '',
      collectionIds: ['v2'],
      limit: 8,
      popularLimit: 3,
    };
    const cache = createSearchPrefetch(provider, query);
    const first = cache.prefetch();
    expect(cache.prefetch()).toBe(first);
    expect(cache.search(query)).toBe(first);
    await Promise.resolve();
    expect(provider).toHaveBeenCalledExactlyOnceWith(query, {
      signal: expect.any(AbortSignal),
    });
    pending.resolve(response('popular'));
    await first;
    expect(cache.peek()).toEqual(response('popular'));
    await cache.search(query);
    expect(provider).toHaveBeenCalledTimes(1);
  });

  it('keeps stale results stable while refreshing, and serves the new order on the next request', async () => {
    let now = 0;
    const pending = deferred();
    const provider = vi
      .fn()
      .mockResolvedValueOnce(response('old'))
      .mockReturnValueOnce(pending.promise);
    const cache = createSearchPrefetch(provider, { query: '' }, 100, () => now);
    await cache.prefetch();
    now = 99;
    await cache.prefetch();
    expect(provider).toHaveBeenCalledTimes(1);
    now = 100;
    expect(await cache.search({ query: '' })).toEqual(response('old'));
    expect(cache.peek()).toEqual(response('old'));
    const refreshing = cache.prefetch();
    pending.resolve(response('new'));
    await refreshing;
    expect(await cache.search({ query: '' })).toEqual(response('new'));
    expect(provider).toHaveBeenCalledTimes(2);
  });

  it('retains usable stale results after refresh failures and permits retry', async () => {
    const provider = vi
      .fn()
      .mockResolvedValueOnce(response('old'))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(response('new'));
    const cache = createSearchPrefetch(provider, { query: '' }, 0);
    await cache.prefetch();
    await expect(cache.prefetch()).rejects.toThrow('offline');
    expect(cache.peek()).toEqual(response('old'));
    await cache.prefetch();
    expect(cache.peek()).toEqual(response('new'));
  });

  it('passes typed queries and abort signals through without caching them', async () => {
    const provider = vi.fn(async () => response('typed'));
    const cache = createSearchPrefetch(provider, {
      query: '',
      collectionIds: ['v1'],
    });
    const options = { signal: new AbortController().signal };
    const query = { query: 'install', collectionIds: ['v1'] };
    await cache.search(query, options);
    await cache.search(query, options);
    expect(provider).toHaveBeenCalledTimes(2);
    expect(provider).toHaveBeenLastCalledWith(query, options);
    expect(cache.peek()).toBeUndefined();
  });

  it('aborts and discards invalidated work even if the provider ignores cancellation', async () => {
    const pending = deferred();
    let signal: AbortSignal | undefined;
    const provider = vi.fn((_query, options) => {
      signal = options.signal;
      return pending.promise;
    });
    const cache = createSearchPrefetch(provider, { query: '' });
    const task = cache.prefetch();
    const rejected = expect(task).rejects.toMatchObject({ name: 'AbortError' });
    await Promise.resolve();
    cache.dispose();
    expect(signal?.aborted).toBe(true);
    pending.resolve(response('obsolete'));
    await rejected;
    expect(cache.peek()).toBeUndefined();
    provider.mockResolvedValueOnce(response('current'));
    await cache.prefetch();
    expect(cache.peek()).toEqual(response('current'));
  });

  it('does not share data between component instances or providers', async () => {
    const provider = vi.fn(async () => response('first'));
    const first = createSearchPrefetch(provider, { query: '' });
    const second = createSearchPrefetch(provider, { query: '' });
    await first.prefetch();
    expect(second.peek()).toBeUndefined();
    await second.prefetch();
    expect(provider).toHaveBeenCalledTimes(2);
  });

  it('handles synchronous provider failures and Strict Mode disposal before work starts', async () => {
    const provider = vi.fn(() => {
      throw new Error('offline');
    });
    const cache = createSearchPrefetch(provider, { query: '' });
    await expect(cache.prefetch()).rejects.toThrow('offline');
    const task = cache.prefetch();
    const rejected = expect(task).rejects.toMatchObject({ name: 'AbortError' });
    cache.dispose();
    await rejected;
    expect(provider).toHaveBeenCalledTimes(1);
  });
});
