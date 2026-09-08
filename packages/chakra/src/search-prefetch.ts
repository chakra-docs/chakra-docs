import type {
  DocsSearchProvider,
  DocsSearchQuery,
  DocsSearchResponse,
} from '@chakra-docs/search';

/** One component, one provider/scope, one bounded empty-query cache entry. */
export function createSearchPrefetch(
  provider: DocsSearchProvider,
  query: DocsSearchQuery,
  staleTimeMs = 60_000,
  now: () => number = Date.now,
) {
  const ttl = Number.isFinite(staleTimeMs) ? Math.max(0, staleTimeMs) : 60_000;
  let cached: DocsSearchResponse | undefined;
  let updatedAt = 0;
  let generation = 0;
  let pending:
    | { promise: Promise<DocsSearchResponse>; controller: AbortController }
    | undefined;

  function prefetch(): Promise<DocsSearchResponse> {
    if (cached && now() - updatedAt < ttl) return Promise.resolve(cached);
    if (pending) return pending.promise;

    const controller = new AbortController();
    const requestGeneration = generation;
    const promise = Promise.resolve()
      .then(() => {
        controller.signal.throwIfAborted();
        return provider({ ...query, query: '' }, { signal: controller.signal });
      })
      .then((response) => {
        controller.signal.throwIfAborted();
        if (generation === requestGeneration) {
          cached = response;
          updatedAt = now();
        }
        return response;
      })
      .finally(() => {
        if (generation === requestGeneration) pending = undefined;
      });
    pending = { promise, controller };
    return promise;
  }

  const search: DocsSearchProvider = (searchQuery, options) => {
    if (searchQuery.query.trim()) return provider(searchQuery, options);
    // Revalidate stale defaults in the background, but keep the visible
    // response stable. The fresh ordering becomes available on the next open.
    const snapshot = cached;
    if (snapshot) {
      void prefetch().catch(() => undefined);
      return Promise.resolve(snapshot);
    }
    // The cache owns cancellation so opening/typing cannot abort shared work.
    return prefetch();
  };

  return {
    prefetch,
    peek: () => cached,
    search,
    dispose() {
      generation += 1;
      pending?.controller.abort();
      pending = undefined;
      cached = undefined;
    },
  };
}
