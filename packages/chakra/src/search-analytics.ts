import { useEffect, useRef } from 'react';
import type { DocsSearchResult } from '@chakra-docs/search';
import { emitAnalytics } from './analytics.js';

export interface DocsSearchAnalyticsContext {
  /** Trimmed query. Empty for opening recommendations/defaults. */
  query: string;
  collectionIds?: readonly string[];
  source: 'curated' | 'local' | 'remote';
  mode: 'default' | 'query';
  resultCount: number;
}

export interface DocsSearchResultsEvent extends DocsSearchAnalyticsContext {
  /** Ordered IDs in the displayed list, not viewport-level impressions. */
  resultIds: readonly string[];
}

export interface DocsSearchSelectionContext extends DocsSearchAnalyticsContext {
  /** One-based position in the displayed list. */
  position: number;
  interaction: 'keyboard' | 'pointer';
}

export interface DocsSearchCloseEvent {
  reason: 'dismiss' | 'selection';
}

export interface DocsSearchAnalyticsCallbacks {
  onSearchOpen?: () => void;
  onSearchClose?: (event: DocsSearchCloseEvent) => void;
  /** Normalized query changes; configure analyticsDebounceMs to coalesce typing. */
  onSearch?: (query: string) => void;
  onSearchResults?: (event: DocsSearchResultsEvent) => void;
  /** A foreground search failed with no usable results. Error contents are not exposed. */
  onSearchError?: (event: DocsSearchAnalyticsContext) => void;
  onSearchResultSelect?: (
    result: DocsSearchResult,
    context: DocsSearchSelectionContext,
  ) => void;
}

export function useSearchAnalytics(options: {
  callbacks?: DocsSearchAnalyticsCallbacks;
  open: boolean;
  context: DocsSearchAnalyticsContext;
  results: readonly DocsSearchResult[];
  status: 'loading' | 'success' | 'error';
  debounceMs?: number;
}) {
  const callbacks = useRef(options.callbacks);
  const wasOpen = useRef(false);
  const lastResultsKey = useRef<string | undefined>(undefined);
  const lastQuery = useRef('');
  useEffect(() => {
    callbacks.current = options.callbacks;
  });

  useEffect(() => {
    if (options.open === wasOpen.current) return;
    wasOpen.current = options.open;
    if (options.open) {
      emitAnalytics(callbacks.current?.onSearchOpen);
    } else {
      emitAnalytics(callbacks.current?.onSearchClose, {
        reason: 'dismiss',
      });
    }
  }, [options.open]);

  const query = options.context.query.toLowerCase();
  const delay = Number.isFinite(options.debounceMs)
    ? Math.max(0, options.debounceMs ?? 0)
    : 0;
  useEffect(() => {
    if (!options.open || !query) {
      lastQuery.current = '';
      return;
    }
    if (lastQuery.current === query) return;
    const notify = () => {
      lastQuery.current = query;
      emitAnalytics(callbacks.current?.onSearch, query);
    };
    if (!delay) {
      notify();
      return;
    }
    const timer = setTimeout(notify, delay);
    return () => clearTimeout(timer);
  }, [options.open, query, delay]);

  // Compare semantic list content, not callback/array identity. Arrow movement,
  // equivalent props and StrictMode effect replay must not inflate engagement.
  const resultsKey = JSON.stringify([
    options.context,
    options.results.map(({ id, route }) => [id, route]),
    options.status,
  ]);
  useEffect(() => {
    if (!options.open || options.status === 'loading') {
      lastResultsKey.current = undefined;
      return;
    }
    if (lastResultsKey.current === resultsKey) return;
    lastResultsKey.current = resultsKey;
    if (options.status === 'error') {
      emitAnalytics(callbacks.current?.onSearchError, options.context);
    } else {
      emitAnalytics(callbacks.current?.onSearchResults, {
        ...options.context,
        resultIds: options.results.map(({ id }) => id),
      });
    }
  }, [
    options.open,
    options.status,
    resultsKey,
    options.context,
    options.results,
  ]);

  return (
    result: DocsSearchResult,
    interaction: DocsSearchSelectionContext['interaction'],
  ) => {
    emitAnalytics(callbacks.current?.onSearchResultSelect, result, {
      ...options.context,
      position: options.results.indexOf(result) + 1,
      interaction,
    });
    // Emit before navigation: a full-page transition can unmount the dialog
    // before React commits its closed-state effect.
    if (wasOpen.current) {
      wasOpen.current = false;
      lastResultsKey.current = undefined;
      lastQuery.current = '';
      emitAnalytics(callbacks.current?.onSearchClose, { reason: 'selection' });
    }
  };
}
