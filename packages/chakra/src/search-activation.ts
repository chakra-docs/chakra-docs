import type { DocsSearchResult } from '@chakra-docs/search';
import { isSafeDocsRoute } from '@chakra-docs/core';

export type DocsAnchorClickEvent = {
  altKey?: boolean;
  button?: number;
  ctrlKey?: boolean;
  defaultPrevented?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  preventDefault: () => void;
};

interface ActivateSearchResultOptions {
  event?: DocsAnchorClickEvent;
  navigate: (href: string) => void;
  onNavigate?: (href: string, result: DocsSearchResult) => void;
  onSelect: (result: DocsSearchResult) => void;
}

export function activateSearchResult(
  record: DocsSearchResult,
  options: ActivateSearchResultOptions,
): void {
  if (!isSafeDocsRoute(record.route)) {
    options.event?.preventDefault();
    return;
  }

  if (options.event && !shouldHandleNavigationClick(options.event)) {
    return;
  }

  options.onSelect(record);

  if (options.onNavigate) {
    options.event?.preventDefault();
    options.onNavigate(record.route, record);
    return;
  }

  if (!options.event) {
    options.navigate(record.route);
  }
}

function shouldHandleNavigationClick(event: DocsAnchorClickEvent): boolean {
  return (
    !event.defaultPrevented &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    (event.button === undefined || event.button === 0)
  );
}
