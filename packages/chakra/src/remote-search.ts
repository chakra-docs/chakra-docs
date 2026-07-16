import type {
  DocsSearchProvider,
  DocsSearchQuery,
  DocsSearchResult,
} from '@chakra-docs/search';

export type RemoteSearchStatus = 'idle' | 'loading' | 'success' | 'error';

export interface RemoteSearchState {
  status: RemoteSearchStatus;
  results: DocsSearchResult[];
}

interface RemoteSearchRequester {
  request: (
    provider: DocsSearchProvider,
    query: DocsSearchQuery,
    delayMs: number,
  ) => void;
  cancel: () => void;
}

type Schedule = (callback: () => void, delayMs: number) => unknown;
type CancelSchedule = (handle: unknown) => void;

export function getRemoteSearchDelayMs(
  query: string,
  debounceMs: number | undefined,
): number {
  if (!query.trim()) {
    return 0;
  }

  if (debounceMs === undefined || !Number.isFinite(debounceMs)) {
    return 150;
  }

  return Math.max(0, Math.floor(debounceMs));
}

/**
 * Owns one remote-search request at a time. Kept outside the component so the
 * cancellation and stale-response guarantees can be exercised without a DOM.
 */
export function createRemoteSearchRequester(
  onStateChange: (state: RemoteSearchState) => void,
  schedule: Schedule = (callback, delayMs) =>
    globalThis.setTimeout(callback, delayMs),
  cancelSchedule: CancelSchedule = (handle) =>
    globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
): RemoteSearchRequester {
  let generation = 0;
  let scheduled: unknown;
  let controller: AbortController | undefined;

  function cancel(): void {
    generation += 1;

    if (scheduled !== undefined) {
      cancelSchedule(scheduled);
      scheduled = undefined;
    }

    controller?.abort();
    controller = undefined;
  }

  function request(
    provider: DocsSearchProvider,
    query: DocsSearchQuery,
    delayMs: number,
  ): void {
    cancel();

    const requestGeneration = generation;
    const requestController = new AbortController();
    controller = requestController;
    onStateChange({ results: [], status: 'loading' });

    scheduled = schedule(() => {
      scheduled = undefined;

      void Promise.resolve()
        .then(() => provider(query, { signal: requestController.signal }))
        .then(
          (response) => {
            if (
              generation !== requestGeneration ||
              requestController.signal.aborted
            ) {
              return;
            }

            controller = undefined;
            onStateChange({ results: response.results, status: 'success' });
          },
          () => {
            if (
              generation !== requestGeneration ||
              requestController.signal.aborted
            ) {
              return;
            }

            controller = undefined;
            onStateChange({ results: [], status: 'error' });
          },
        );
    }, delayMs);
  }

  return { cancel, request };
}
