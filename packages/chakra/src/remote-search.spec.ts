import { describe, expect, it, vi } from 'vitest';
import type {
  DocsSearchProvider,
  DocsSearchResponse,
  DocsSearchResult,
} from '@chakra-docs/search';
import {
  createRemoteSearchRequester,
  getRemoteSearchDelayMs,
} from './remote-search.js';
import type { RemoteSearchState } from './remote-search.js';

function createResult(id: string): DocsSearchResult {
  return { id, route: `/docs/${id}`, title: id };
}

function createResponse(id: string, query = id): DocsSearchResponse {
  return { query, results: [createResult(id)] };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
}

function createScheduler() {
  let nextId = 0;
  const tasks = new Map<number, { callback: () => void; delayMs: number }>();

  return {
    cancel: (handle: unknown) => tasks.delete(handle as number),
    pending: () => [...tasks.entries()],
    run(handle: number) {
      const task = tasks.get(handle);
      tasks.delete(handle);
      task?.callback();
    },
    schedule(callback: () => void, delayMs: number) {
      nextId += 1;
      tasks.set(nextId, { callback, delayMs });
      return nextId;
    },
  };
}

async function flushMicrotasks(): Promise<void> {
  for (let index = 0; index < 6; index += 1) {
    await Promise.resolve();
  }
}

describe('getRemoteSearchDelayMs', () => {
  it('loads popular results immediately and debounces typed queries by default', () => {
    expect(getRemoteSearchDelayMs('', undefined)).toBe(0);
    expect(getRemoteSearchDelayMs('   ', 500)).toBe(0);
    expect(getRemoteSearchDelayMs('install', undefined)).toBe(150);
  });

  it('normalizes a custom debounce interval', () => {
    expect(getRemoteSearchDelayMs('install', 25.9)).toBe(25);
    expect(getRemoteSearchDelayMs('install', -10)).toBe(0);
    expect(getRemoteSearchDelayMs('install', Number.POSITIVE_INFINITY)).toBe(
      150,
    );
  });
});

describe('createRemoteSearchRequester', () => {
  it('uses a cached snapshot without a loading flash or replacing its selected ordering', async () => {
    const scheduler = createScheduler();
    const states: RemoteSearchState[] = [];
    const requester = createRemoteSearchRequester(
      (state) => states.push(state),
      scheduler.schedule,
      scheduler.cancel,
    );
    const results = [createResult('old')];
    requester.request(
      async () => createResponse('refreshed'),
      { query: '' },
      0,
      results,
    );
    expect(states).toEqual([{ results, status: 'success' }]);
    scheduler.run(scheduler.pending()[0][0]);
    await flushMicrotasks();
    expect(states.at(-1)?.results).toBe(results);
    requester.request(
      async () => {
        throw new Error('offline');
      },
      { query: '' },
      0,
      results,
    );
    scheduler.run(scheduler.pending()[0][0]);
    await flushMicrotasks();
    expect(states.at(-1)).toEqual({ results, status: 'success' });
  });
  it('reports loading and then returns provider results after the delay', async () => {
    const scheduler = createScheduler();
    const states: RemoteSearchState[] = [];
    const provider = vi.fn<DocsSearchProvider>(async (query) =>
      createResponse('install', query.query),
    );
    const requester = createRemoteSearchRequester(
      (state) => states.push(state),
      scheduler.schedule,
      scheduler.cancel,
    );

    requester.request(provider, { query: 'install' }, 150);

    expect(states).toEqual([{ results: [], status: 'loading' }]);
    expect(provider).not.toHaveBeenCalled();
    const [[handle, task]] = scheduler.pending();
    expect(task.delayMs).toBe(150);

    scheduler.run(handle);
    await flushMicrotasks();

    expect(provider).toHaveBeenCalledWith(
      { query: 'install' },
      { signal: expect.any(AbortSignal) },
    );
    expect(states.at(-1)).toEqual({
      results: [createResult('install')],
      status: 'success',
    });
  });

  it('cancels the pending debounce when a newer query arrives', async () => {
    const scheduler = createScheduler();
    const provider = vi.fn<DocsSearchProvider>(async (query) => ({
      query: query.query,
      results: [],
    }));
    const requester = createRemoteSearchRequester(
      () => undefined,
      scheduler.schedule,
      scheduler.cancel,
    );

    requester.request(provider, { query: 'old' }, 150);
    const [[oldHandle]] = scheduler.pending();
    requester.request(provider, { query: 'new' }, 150);
    const [[newHandle]] = scheduler.pending();

    scheduler.run(oldHandle);
    scheduler.run(newHandle);
    await flushMicrotasks();

    expect(provider).toHaveBeenCalledOnce();
    expect(provider.mock.calls[0]?.[0]).toEqual({ query: 'new' });
  });

  it('passes collection scopes and limits to the provider server-side', async () => {
    const scheduler = createScheduler();
    const provider = vi.fn<DocsSearchProvider>(async (query) => ({
      query: query.query,
      results: [],
    }));
    const requester = createRemoteSearchRequester(
      () => undefined,
      scheduler.schedule,
      scheduler.cancel,
    );
    const query = {
      collectionIds: ['v2', 'api'],
      limit: 9,
      popularLimit: 4,
      query: 'router',
    };

    requester.request(provider, query, 0);
    const [[handle]] = scheduler.pending();
    scheduler.run(handle);
    await flushMicrotasks();

    expect(provider.mock.calls[0]?.[0]).toEqual(query);
  });

  it('aborts an in-flight request when it is replaced', async () => {
    const scheduler = createScheduler();
    const first = createDeferred<DocsSearchResponse>();
    const second = createDeferred<DocsSearchResponse>();
    const signals: AbortSignal[] = [];
    const provider: DocsSearchProvider = vi.fn((query, options) => {
      signals.push(options?.signal as AbortSignal);
      return query.query === 'first' ? first.promise : second.promise;
    });
    const requester = createRemoteSearchRequester(
      () => undefined,
      scheduler.schedule,
      scheduler.cancel,
    );

    requester.request(provider, { query: 'first' }, 0);
    scheduler.run(scheduler.pending()[0][0]);
    await flushMicrotasks();
    requester.request(provider, { query: 'second' }, 0);

    expect(signals[0].aborted).toBe(true);
    second.resolve(createResponse('second'));
    first.resolve(createResponse('first'));
  });

  it('ignores stale responses even when a provider ignores abort signals', async () => {
    const scheduler = createScheduler();
    const states: RemoteSearchState[] = [];
    const first = createDeferred<DocsSearchResponse>();
    const second = createDeferred<DocsSearchResponse>();
    const provider: DocsSearchProvider = (query) =>
      query.query === 'first' ? first.promise : second.promise;
    const requester = createRemoteSearchRequester(
      (state) => states.push(state),
      scheduler.schedule,
      scheduler.cancel,
    );

    requester.request(provider, { query: 'first' }, 0);
    scheduler.run(scheduler.pending()[0][0]);
    await flushMicrotasks();
    requester.request(provider, { query: 'second' }, 0);
    scheduler.run(scheduler.pending()[0][0]);
    await flushMicrotasks();

    second.resolve(createResponse('second'));
    await flushMicrotasks();
    first.resolve(createResponse('first'));
    await flushMicrotasks();

    expect(states.at(-1)).toEqual({
      results: [createResult('second')],
      status: 'success',
    });
    expect(states.some((state) => state.results[0]?.id === 'first')).toBe(
      false,
    );
  });

  it('reports provider failures without surfacing aborted failures', async () => {
    const scheduler = createScheduler();
    const states: RemoteSearchState[] = [];
    const provider: DocsSearchProvider = async () => {
      throw new Error('offline');
    };
    const requester = createRemoteSearchRequester(
      (state) => states.push(state),
      scheduler.schedule,
      scheduler.cancel,
    );

    requester.request(provider, { query: 'install' }, 0);
    scheduler.run(scheduler.pending()[0][0]);
    await flushMicrotasks();

    expect(states.at(-1)).toEqual({ results: [], status: 'error' });

    const pending = createDeferred<DocsSearchResponse>();
    requester.request(() => pending.promise, { query: 'cancelled' }, 0);
    scheduler.run(scheduler.pending()[0][0]);
    await flushMicrotasks();
    requester.cancel();
    pending.reject(new Error('aborted'));
    await flushMicrotasks();

    expect(states.at(-1)).toEqual({ results: [], status: 'loading' });
  });
});
