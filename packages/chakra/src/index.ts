'use client';

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ComponentType, ElementType, ReactNode } from 'react';
import * as ChakraRuntime from '@chakra-ui/react';
import {
  createCollectionOptions,
  createHeadingIdGenerator,
  isSafeDocsRoute,
  isSafeLinkHref,
  stripMarkdown,
} from '@chakra-docs/core';
import type {
  DocsCollection,
  DocsCollectionOption,
  DocsConfig,
  DocsHeading,
  DocsNavItem,
  DocsPage,
  DocsSearchRecord,
} from '@chakra-docs/core';
import { createDocsSearchEngine } from '@chakra-docs/search';
import type {
  DocsSearchProvider,
  DocsSearchQuery,
  DocsSearchResult,
} from '@chakra-docs/search';
import { activateSearchResult } from './search-activation.js';
import type { DocsAnchorClickEvent } from './search-activation.js';
import {
  getActiveHeadingId,
  getHeadingScrollOffset,
} from './heading-scroll.js';
import type {
  ChakraDocsStickyTop,
  DocsBrowserEnv,
  DocsBrowserWindow,
  DocsScrollBehavior,
} from './heading-scroll.js';
import {
  createRemoteSearchRequester,
  getRemoteSearchDelayMs,
} from './remote-search.js';
import type { RemoteSearchState } from './remote-search.js';

export type { ChakraDocsStickyTop } from './heading-scroll.js';

const Chakra = ChakraRuntime as unknown as Record<string, ElementType>;
const Badge = Chakra.Badge;
const Box = Chakra.Box;
const Button = Chakra.Button;
const Code = Chakra.Code;
const Container = Chakra.Container;
const Dialog = Chakra.Dialog as unknown as Record<string, ElementType>;
const Flex = Chakra.Flex;
const Heading = Chakra.Heading;
const HStack = Chakra.HStack;
const Input = Chakra.Input;
const Kbd = Chakra.Kbd;
const Link = Chakra.Link;
const Portal = Chakra.Portal;
const Stack = Chakra.Stack;
const Text = Chakra.Text;
const ChakraCodeBlock = Chakra.CodeBlock as unknown as Record<
  string,
  ElementType
>;
const emptySearchRecords: readonly DocsSearchRecord[] = [];

export interface DocsLinkProps {
  href: string;
  children?: ReactNode;
  className?: string;
  [key: string]: unknown;
}

export type DocsLinkComponent = ComponentType<DocsLinkProps>;

export interface DocsLabels {
  search: string;
  searchPlaceholder: string;
  searchNoResults: string;
  searchLoading: string;
  searchError: string;
  searchPopular?: string;
  searchResults?: string;
  allVersions?: string;
  version?: string;
  allCollections?: string;
  collection?: string;
  previousPage: string;
  nextPage: string;
  editPage: string;
  onThisPage: string;
  openNavigation: string;
  closeNavigation: string;
  copyCode: string;
  copiedCode: string;
}

export interface DocsAnalyticsCallbacks {
  onSearchOpen?: () => void;
  onSearch?: (query: string) => void;
  onSearchResultSelect?: (result: DocsSearchResult) => void;
  onCodeCopy?: (event: {
    code: string;
    language?: string;
    title?: string;
  }) => void;
  onPackageCommandCopy?: (event: { command: string; manager: string }) => void;
}

export interface ChakraDocsCodeBlockHighlightResult {
  code: string;
  highlighted: boolean;
}

export type ChakraDocsCodeBlockColorScheme = 'light' | 'dark' | (string & {});

export interface ChakraDocsCodeBlockHighlightMeta {
  highlightLines?: number[];
  showLineNumbers?: boolean;
  wordWrap?: boolean;
  removedLineNumbers?: number[];
  addedLineNumbers?: number[];
  focusedLineNumbers?: number[];
  colorScheme?: ChakraDocsCodeBlockColorScheme;
}

export interface ChakraDocsCodeBlockHighlighterProps {
  code: string;
  language?: string;
  meta?: ChakraDocsCodeBlockHighlightMeta;
}

export type ChakraDocsCodeBlockHighlighter = (
  props: ChakraDocsCodeBlockHighlighterProps,
) => ChakraDocsCodeBlockHighlightResult;

export interface ChakraDocsCodeBlockAdapter {
  loadContext?: () => Promise<unknown>;
  loadContextSync?: () => unknown;
  getHighlighter: (context: unknown) => ChakraDocsCodeBlockHighlighter;
  unloadContext?: (context: unknown) => void;
}

export interface ChakraDocsCodeBlockConfig {
  adapter?: ChakraDocsCodeBlockAdapter;
}

export interface ChakraDocsLayoutConfig {
  stickyTop?: ChakraDocsStickyTop;
  sidebarStickyTop?: ChakraDocsStickyTop;
  tocStickyTop?: ChakraDocsStickyTop;
  scrollMarginTop?: ChakraDocsStickyTop;
}

export interface ChakraDocsConfig extends DocsConfig {
  linkComponent?: DocsLinkComponent;
  labels?: Partial<DocsLabels>;
  analytics?: DocsAnalyticsCallbacks;
  codeBlock?: ChakraDocsCodeBlockConfig;
  layout?: ChakraDocsLayoutConfig;
}

export interface DocsComponentProps {
  children?: ReactNode;
  config?: ChakraDocsConfig;
  page?: DocsPage;
  nav?: DocsNavItem[];
  headings?: DocsHeading[];
  slotProps?: Record<string, unknown>;
}

export interface DocsLayoutProps extends DocsComponentProps {
  stickyTop?: ChakraDocsStickyTop;
  scrollMarginTop?: ChakraDocsStickyTop;
  contentSlotProps?: Record<string, unknown>;
  sidebarSlotProps?: Record<string, unknown>;
  tocSlotProps?: Record<string, unknown>;
}

export interface DocsStickyComponentProps extends DocsComponentProps {
  stickyTop?: ChakraDocsStickyTop;
}

export interface DocsTableOfContentsProps extends DocsStickyComponentProps {
  scrollMarginTop?: ChakraDocsStickyTop;
}

export interface DocsSearchProps {
  records?: readonly DocsSearchRecord[];
  searchProvider?: DocsSearchProvider;
  debounceMs?: number;
  collectionId?: string;
  collectionIds?: readonly string[];
  limit?: number;
  popularLimit?: number;
  placeholder?: string;
  onNavigate?: (href: string, result: DocsSearchResult) => void;
  onResultSelect?: (result: DocsSearchResult) => void;
  slotProps?: Record<string, unknown>;
  triggerSlotProps?: Record<string, unknown>;
  inputSlotProps?: Record<string, unknown>;
  resultSlotProps?: Record<string, unknown>;
}

export type DocsVersionOption = DocsCollectionOption;

export interface DocsVersionSelectProps {
  collections?: DocsCollection[];
  options?: DocsVersionOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (collectionId: string) => void;
  includeAll?: boolean;
  allValue?: string;
  allLabel?: string;
  label?: string;
  labelHidden?: boolean;
  slotProps?: Record<string, unknown>;
  labelSlotProps?: Record<string, unknown>;
  selectSlotProps?: Record<string, unknown>;
}

type MarkdownBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'code'; code: string; language?: string }
  | { type: 'quote'; text: string };

export interface MarkdownContentProps {
  source: string;
  slotProps?: Record<string, unknown>;
}

type DocsInputChangeEvent = {
  currentTarget: {
    value: string;
  };
};

type DocsKeyboardEvent = {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  preventDefault: () => void;
};

const defaultLabels: DocsLabels = {
  search: 'Search',
  searchPlaceholder: 'Search docs',
  searchNoResults: 'No results found',
  searchLoading: 'Searching…',
  searchError: 'Search is temporarily unavailable',
  searchPopular: 'Popular docs',
  searchResults: 'Results',
  allVersions: 'All versions',
  version: 'Version',
  allCollections: 'All docs',
  collection: 'Collection',
  previousPage: 'Previous',
  nextPage: 'Next',
  editPage: 'Edit this page',
  onThisPage: 'On this page',
  openNavigation: 'Open navigation',
  closeNavigation: 'Close navigation',
  copyCode: 'Copy code',
  copiedCode: 'Copied',
};

const DocsContext = createContext<ChakraDocsConfig>({
  labels: defaultLabels,
});

export function DocsProvider(props: DocsComponentProps): ReactNode {
  const value = mergeConfig(useContext(DocsContext), props.config);
  const children = value.codeBlock?.adapter
    ? createElement(
        ChakraCodeBlock.AdapterProvider,
        { value: value.codeBlock.adapter },
        props.children,
      )
    : props.children;

  return createElement(DocsContext.Provider, { value }, children);
}

export function useDocsConfig(): ChakraDocsConfig {
  const config = useContext(DocsContext);
  return {
    ...config,
    labels: {
      ...defaultLabels,
      ...config.labels,
    },
  };
}

export function DocsLayout(props: DocsLayoutProps): ReactNode {
  return createElement(
    Container,
    { maxW: '7xl', px: { base: 4, md: 8 }, py: 8, ...props.slotProps },
    createElement(
      Flex,
      {
        align: 'flex-start',
        gap: { base: 8, lg: 12 },
        direction: { base: 'column', lg: 'row' },
      },
      props.nav
        ? createElement(DocsSidebar, {
            nav: props.nav,
            page: props.page,
            stickyTop: props.stickyTop,
            slotProps: props.sidebarSlotProps,
          })
        : null,
      createElement(
        Box,
        { flex: '1', minW: 0, as: 'div', ...props.contentSlotProps },
        props.children ??
          createElement(DocsArticle, {
            page: props.page,
            headings: props.headings,
          }),
      ),
      props.headings
        ? createElement(DocsTableOfContents, {
            headings: props.headings,
            scrollMarginTop: props.scrollMarginTop,
            stickyTop: props.stickyTop,
            slotProps: props.tocSlotProps,
          })
        : null,
    ),
  );
}

export function DocsArticle(props: DocsComponentProps): ReactNode {
  return createElement(
    Box,
    { as: 'article', maxW: '3xl', ...props.slotProps },
    props.page
      ? createElement(
          Box,
          { mb: 8 },
          createElement(
            Heading,
            { as: 'h1', size: '3xl', mb: 3 },
            props.page.title,
          ),
          props.page.description
            ? createElement(
                Text,
                { color: 'fg.muted', fontSize: 'lg' },
                props.page.description,
              )
            : null,
        )
      : null,
    props.children,
  );
}

export function DocsSidebar(props: DocsStickyComponentProps): ReactNode {
  const config = useDocsConfig();
  const stickyTop = props.stickyTop ??
    config.layout?.sidebarStickyTop ??
    config.layout?.stickyTop ?? { lg: 8 };

  return createElement(
    Box,
    {
      as: 'nav',
      flex: '0 0 16rem',
      position: { lg: 'sticky' },
      top: stickyTop,
      w: { base: '100%', lg: '16rem' },
      ...props.slotProps,
    },
    createElement(NavList, {
      items: props.nav ?? [],
      activeRoute: props.page?.route,
    }),
  );
}

export function DocsTableOfContents(
  props: DocsTableOfContentsProps,
): ReactNode {
  const config = useDocsConfig();
  const labels = config.labels ?? defaultLabels;
  const headings = props.headings ?? [];
  const headingIds = useMemo(
    () => headings.map((heading) => heading.id).filter(Boolean),
    [headings],
  );
  const stickyTop =
    props.stickyTop ??
    config.layout?.tocStickyTop ??
    config.layout?.stickyTop ??
    8;
  const scrollMarginTop =
    props.scrollMarginTop ??
    props.stickyTop ??
    config.layout?.scrollMarginTop ??
    config.layout?.stickyTop ??
    8;
  const [activeHeadingId, setActiveHeadingId] = useState<string | undefined>();

  useEffect(() => {
    return observeActiveHeading({
      headingIds,
      scrollMarginTop,
      onChange: setActiveHeadingId,
    });
  }, [headingIds, scrollMarginTop]);

  if (headings.length === 0) {
    return null;
  }

  return createElement(
    Box,
    {
      as: 'aside',
      flex: '0 0 14rem',
      display: { base: 'none', xl: 'block' },
      position: 'sticky',
      top: stickyTop,
      ...props.slotProps,
    },
    createElement(Text, { fontWeight: 'semibold', mb: 3 }, labels.onThisPage),
    createElement(
      Box,
      { as: 'ol', listStyleType: 'none', ps: 0, m: 0 },
      headings.map((heading) => {
        const active = activeHeadingId === heading.id;

        return createElement(
          Box,
          {
            as: 'li',
            key: heading.id,
            ps: Math.max(0, heading.level - 2) * 3,
            py: 1,
          },
          createElement(
            Link,
            {
              'aria-current': active ? 'location' : undefined,
              borderInlineStartWidth: '2px',
              borderInlineStartColor: active ? 'teal.500' : 'transparent',
              borderRadius: 'sm',
              color: active ? 'teal.700' : 'fg.muted',
              display: 'block',
              fontSize: 'sm',
              fontWeight: 'medium',
              href: `#${heading.id}`,
              onClick: (event: DocsAnchorClickEvent) => {
                if (!shouldHandleTocClick(event)) {
                  return;
                }

                event.preventDefault();
                setActiveHeadingId(heading.id);
                scrollToHeading(heading.id, scrollMarginTop);
              },
              px: 2,
              py: 1,
              _hover: {
                color: active ? 'teal.800' : 'fg',
                textDecoration: 'none',
              },
            },
            heading.title,
          ),
        );
      }),
    ),
  );
}

function observeActiveHeading(props: {
  headingIds: string[];
  scrollMarginTop: ChakraDocsStickyTop;
  onChange: (headingId: string | undefined) => void;
}): () => void {
  const env = getBrowserEnv();

  if (!env || props.headingIds.length === 0) {
    props.onChange(undefined);
    return () => undefined;
  }

  const browserEnv = env;
  let frame: number | undefined;

  function update() {
    frame = undefined;
    props.onChange(
      getActiveHeadingId(browserEnv, props.headingIds, props.scrollMarginTop),
    );
  }

  function scheduleUpdate() {
    if (frame !== undefined) {
      return;
    }

    if (!browserEnv.window.requestAnimationFrame) {
      update();
      return;
    }

    frame = browserEnv.window.requestAnimationFrame(update);
  }

  update();
  browserEnv.window.addEventListener?.('scroll', scheduleUpdate, {
    passive: true,
  });
  browserEnv.window.addEventListener?.('resize', scheduleUpdate);

  return () => {
    if (frame !== undefined) {
      browserEnv.window.cancelAnimationFrame?.(frame);
    }

    browserEnv.window.removeEventListener?.('scroll', scheduleUpdate);
    browserEnv.window.removeEventListener?.('resize', scheduleUpdate);
  };
}

function shouldHandleTocClick(event: DocsAnchorClickEvent): boolean {
  return (
    !event.defaultPrevented &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    (event.button === undefined || event.button === 0)
  );
}

function scrollToHeading(
  headingId: string,
  scrollMarginTop: ChakraDocsStickyTop,
): boolean {
  const env = getBrowserEnv();
  const element = env?.document.getElementById?.(headingId);

  if (!env || !element) {
    return false;
  }

  const behavior = getScrollBehavior(env.window);
  const rect = element.getBoundingClientRect?.();

  updateLocationHash(env.window, headingId);

  if (!rect || !env.window.scrollTo) {
    element.scrollIntoView?.({ behavior, block: 'start' });
    return true;
  }

  const top = Math.max(
    0,
    rect.top +
      getScrollY(env) -
      getHeadingScrollOffset(element, scrollMarginTop, env.window),
  );

  env.window.scrollTo({ behavior, top });
  return true;
}

function getBrowserEnv(): DocsBrowserEnv | undefined {
  const root = globalThis as unknown as DocsBrowserWindow;
  const win = root.window ?? root;
  const doc = win.document ?? root.document;

  return doc ? { document: doc, window: win } : undefined;
}

function getScrollY(env: DocsBrowserEnv): number {
  return (
    env.window.scrollY ??
    env.window.pageYOffset ??
    env.document.documentElement?.scrollTop ??
    env.document.body?.scrollTop ??
    0
  );
}

function getScrollBehavior(win: DocsBrowserWindow): DocsScrollBehavior {
  return win.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth';
}

function updateLocationHash(win: DocsBrowserWindow, headingId: string) {
  const hash = `#${encodeURIComponent(headingId)}`;

  if (!win.history?.pushState || win.location?.hash === hash) {
    return;
  }

  win.history.pushState(
    null,
    '',
    `${win.location?.pathname ?? ''}${win.location?.search ?? ''}${hash}`,
  );
}

export function DocsSearch(props: DocsSearchProps): ReactNode {
  const config = useDocsConfig();
  const labels = config.labels ?? defaultLabels;
  const inputRef = useRef<{ focus: () => void } | null>(null);
  const remoteRequesterRef = useRef<ReturnType<
    typeof createRemoteSearchRequester
  > | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [remoteSearch, setRemoteSearch] = useState<RemoteSearchState>({
    results: [],
    status: 'idle',
  });
  const isRemote = props.searchProvider !== undefined;
  const normalizedQuery = query.trim().toLowerCase();
  const records = props.records ?? emptySearchRecords;
  const searchAvailable = isRemote || records.length > 0;
  const collectionIds = useMemo(
    () => resolveSearchCollectionIds(props),
    [props.collectionId, props.collectionIds],
  );
  const searchQuery = useMemo<DocsSearchQuery>(
    () => ({
      collectionIds,
      limit: props.limit,
      popularLimit: props.popularLimit,
      query: query.trim(),
    }),
    [collectionIds, props.limit, props.popularLimit, query],
  );
  const searchEngine = useMemo(
    () => (isRemote ? undefined : createDocsSearchEngine(records)),
    [isRemote, records],
  );
  const localResults = useMemo(
    () => searchEngine?.search(searchQuery).results ?? [],
    [searchEngine, searchQuery],
  );
  const results = isRemote ? remoteSearch.results : localResults;

  if (!remoteRequesterRef.current) {
    remoteRequesterRef.current = createRemoteSearchRequester(setRemoteSearch);
  }

  useEffect(() => {
    const requester = remoteRequesterRef.current;

    if (!requester || !open || !props.searchProvider) {
      requester?.cancel();
      return;
    }

    // Popular results are useful immediately when the dialog opens. Typed
    // queries wait for the debounce interval to avoid unnecessary requests.
    const delayMs = getRemoteSearchDelayMs(searchQuery.query, props.debounceMs);

    requester.request(props.searchProvider, searchQuery, delayMs);
    return () => requester.cancel();
  }, [
    normalizedQuery,
    open,
    props.debounceMs,
    props.searchProvider,
    searchQuery,
  ]);

  useEffect(() => {
    const target = globalThis as unknown as {
      addEventListener?: (
        type: string,
        listener: (event: DocsKeyboardEvent) => void,
      ) => void;
      removeEventListener?: (
        type: string,
        listener: (event: DocsKeyboardEvent) => void,
      ) => void;
    };

    function onKeyDown(event: DocsKeyboardEvent) {
      const isSearchShortcut =
        event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey);

      if (!isSearchShortcut) {
        return;
      }

      if (!searchAvailable) {
        return;
      }

      event.preventDefault();
      setOpen(true);
      config.analytics?.onSearchOpen?.();
    }

    target.addEventListener?.('keydown', onKeyDown);
    return () => target.removeEventListener?.('keydown', onKeyDown);
  }, [config.analytics, searchAvailable]);

  useEffect(() => {
    if (!open) {
      return;
    }

    globalThis.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [open, results]);

  useEffect(() => {
    if (normalizedQuery) {
      config.analytics?.onSearch?.(normalizedQuery);
    }
  }, [config.analytics, normalizedQuery]);

  function closeSearch() {
    setOpen(false);
    setQuery('');
  }

  function selectResult(record: DocsSearchResult) {
    props.onResultSelect?.(record);
    config.analytics?.onSearchResultSelect?.(record);
    closeSearch();
  }

  function navigateToLocation(href: string) {
    if (!isSafeDocsRoute(href)) {
      return;
    }

    const location = globalThis as unknown as {
      location?: { assign?: (href: string) => void; href?: string };
    };

    if (location.location?.assign) {
      location.location.assign(href);
    } else if (location.location) {
      location.location.href = href;
    }
  }

  function activateResult(
    record: DocsSearchResult,
    event?: DocsAnchorClickEvent,
  ) {
    activateSearchResult(record, {
      event,
      navigate: navigateToLocation,
      onNavigate: props.onNavigate,
      onSelect: selectResult,
    });
  }

  function onInputKeyDown(event: DocsKeyboardEvent) {
    if (results.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === 'Enter' && results[activeIndex]) {
      event.preventDefault();
      activateResult(results[activeIndex]);
    }
  }

  return createElement(
    Dialog.Root,
    {
      lazyMount: true,
      onOpenChange: (details: { open: boolean }) => {
        setOpen(details.open);

        if (details.open) {
          config.analytics?.onSearchOpen?.();
        } else {
          setQuery('');
        }
      },
      open,
      placement: 'top',
      ...props.slotProps,
    },
    createElement(
      Dialog.Trigger,
      { asChild: true },
      createElement(
        Button,
        {
          disabled: !searchAvailable,
          justifyContent: 'space-between',
          minW: { base: 'full', md: '13rem' },
          size: 'sm',
          variant: 'outline',
          ...props.triggerSlotProps,
        },
        createElement(
          Text,
          { color: 'fg.muted', fontWeight: 'medium' },
          labels.search,
        ),
        createElement(Kbd, null, '⌘K'),
      ),
    ),
    createElement(
      Portal,
      null,
      createElement(Dialog.Backdrop),
      createElement(
        Dialog.Positioner,
        { px: 4, pt: { base: 12, md: 20 } },
        createElement(
          Dialog.Content,
          { maxW: '2xl', overflow: 'hidden', p: 0 },
          createElement(
            Dialog.Header,
            { borderBottomWidth: '1px', p: 4 },
            createElement(Dialog.Title, { fontSize: 'sm' }, labels.search),
          ),
          createElement(
            Dialog.Body,
            { p: 0 },
            createElement(Input, {
              ref: inputRef,
              'aria-label': labels.search,
              borderRadius: 0,
              borderWidth: 0,
              fontSize: 'lg',
              h: 14,
              onChange: (event: DocsInputChangeEvent) =>
                setQuery(event.currentTarget.value),
              onKeyDown: onInputKeyDown,
              placeholder: props.placeholder ?? labels.searchPlaceholder,
              value: query,
              _focus: { boxShadow: 'none' },
              ...props.inputSlotProps,
            }),
            createElement(
              Box,
              { borderTopWidth: '1px', maxH: '420px', overflowY: 'auto', p: 3 },
              createElement(
                Text,
                {
                  color: 'fg.muted',
                  fontSize: 'xs',
                  fontWeight: 'semibold',
                  px: 2,
                  py: 1,
                },
                normalizedQuery
                  ? (labels.searchResults ?? defaultLabels.searchResults)
                  : (labels.searchPopular ?? defaultLabels.searchPopular),
              ),
              createElement(
                Stack,
                { gap: 1 },
                isRemote && remoteSearch.status === 'loading'
                  ? createSearchStatus(
                      labels.searchLoading ?? defaultLabels.searchLoading,
                      'status',
                    )
                  : isRemote && remoteSearch.status === 'error'
                    ? createSearchStatus(
                        labels.searchError ?? defaultLabels.searchError,
                        'alert',
                      )
                    : results.length > 0
                      ? results.map((record, index) =>
                          createElement(SearchResult, {
                            active: index === activeIndex,
                            key: record.id,
                            onSelect: (event: DocsAnchorClickEvent) =>
                              activateResult(record, event),
                            record,
                            slotProps: props.resultSlotProps,
                          }),
                        )
                      : createSearchStatus(
                          labels.searchNoResults ??
                            defaultLabels.searchNoResults,
                          'status',
                        ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

export function DocsVersionSelect(props: DocsVersionSelectProps): ReactNode {
  const labels = useDocsConfig().labels ?? defaultLabels;
  const selectId = useId();
  const allValue = props.allValue ?? '';
  const labelText =
    props.label ??
    labels.version ??
    defaultLabels.version ??
    labels.collection ??
    defaultLabels.collection;
  const allLabelText =
    props.allLabel ??
    labels.allVersions ??
    defaultLabels.allVersions ??
    labels.allCollections ??
    defaultLabels.allCollections;
  const options =
    props.options ??
    props.collections?.map((collection) => ({
      id: collection.id,
      label: collection.name ?? collection.id,
    })) ??
    [];
  const hiddenLabelProps = props.labelHidden
    ? {
        border: 0,
        clip: 'rect(0, 0, 0, 0)',
        h: '1px',
        m: '-1px',
        overflow: 'hidden',
        p: 0,
        position: 'absolute',
        whiteSpace: 'nowrap',
        w: '1px',
      }
    : {};
  const selectProps: Record<string, unknown> = {
    as: 'select',
    id: selectId,
    bg: 'bg',
    borderColor: 'gray.200',
    borderRadius: 'md',
    borderWidth: '1px',
    fontSize: 'sm',
    fontWeight: 'semibold',
    h: 8,
    lineHeight: 1,
    minW: '7.5rem',
    px: 2,
    value: props.value,
    onChange: (event: DocsInputChangeEvent) =>
      props.onValueChange?.(event.currentTarget.value),
    ...props.selectSlotProps,
  };

  if (props.value === undefined) {
    delete selectProps.value;
  }

  if (props.defaultValue !== undefined) {
    selectProps.defaultValue = props.defaultValue;
  }

  return createElement(
    Box,
    {
      alignItems: 'center',
      display: 'inline-flex',
      gap: 2,
      minW: 0,
      ...props.slotProps,
    },
    createElement(
      Text,
      {
        as: 'label',
        color: 'fg.muted',
        fontSize: 'xs',
        fontWeight: 'semibold',
        htmlFor: selectId,
        lineHeight: 1,
        ...hiddenLabelProps,
        ...props.labelSlotProps,
      },
      labelText,
    ),
    createElement(
      Box,
      selectProps,
      props.includeAll
        ? createElement(
            'option',
            { key: allValue, value: allValue },
            allLabelText,
          )
        : null,
      options.map((option) =>
        createElement(
          'option',
          { key: option.id, value: option.id },
          option.label,
        ),
      ),
    ),
  );
}

export function createDocsVersionOptions(
  collections: DocsCollection[],
): DocsVersionOption[] {
  return createCollectionOptions(collections);
}

export function MarkdownContent(props: MarkdownContentProps): ReactNode {
  const config = useDocsConfig();
  const blocks = parseMarkdown(props.source);
  const createNextHeadingId = createHeadingIdGenerator();
  const scrollMarginTop =
    config.layout?.scrollMarginTop ?? config.layout?.stickyTop ?? 8;

  return createElement(
    Stack,
    { gap: 4, ...props.slotProps },
    blocks.map((block, index) =>
      renderMarkdownBlock(block, index, createNextHeadingId, scrollMarginTop),
    ),
  );
}

export function DocsPagination(props: DocsComponentProps): ReactNode {
  const labels = useDocsConfig().labels ?? defaultLabels;
  const pages = flattenNav(props.nav ?? []).filter((item) => item.href);
  const index = pages.findIndex((item) => item.href === props.page?.route);
  const previous = index > 0 ? pages[index - 1] : undefined;
  const next =
    index >= 0 && index < pages.length - 1 ? pages[index + 1] : undefined;

  if (!previous && !next) {
    return null;
  }

  return createElement(
    Flex,
    {
      as: 'nav',
      justify: 'space-between',
      gap: 4,
      mt: 12,
      pt: 6,
      borderTopWidth: '1px',
    },
    previous
      ? createElement(
          Box,
          null,
          createElement(
            Text,
            { color: 'fg.muted', fontSize: 'sm' },
            labels.previousPage,
          ),
          createElement(
            DocsLink,
            { href: previous.href ?? '#' },
            previous.title,
          ),
        )
      : createElement(Box),
    next
      ? createElement(
          Box,
          { textAlign: 'right' },
          createElement(
            Text,
            { color: 'fg.muted', fontSize: 'sm' },
            labels.nextPage,
          ),
          createElement(DocsLink, { href: next.href ?? '#' }, next.title),
        )
      : createElement(Box),
  );
}

export interface CalloutProps extends DocsComponentProps {
  type?: 'info' | 'warning' | 'success' | 'danger';
  title?: string;
}

export function Callout(props: CalloutProps): ReactNode {
  const palette = {
    info: 'blue',
    warning: 'orange',
    success: 'green',
    danger: 'red',
  }[props.type ?? 'info'];

  return createElement(
    Box,
    {
      borderWidth: '1px',
      borderColor: `${palette}.300`,
      bg: `${palette}.50`,
      color: `${palette}.950`,
      rounded: 'md',
      p: 4,
      ...props.slotProps,
    },
    props.title
      ? createElement(Text, { fontWeight: 'semibold', mb: 2 }, props.title)
      : null,
    props.children,
  );
}

export interface CodeBlockProps extends DocsComponentProps {
  code?: string;
  language?: string;
  title?: string;
}

export function CodeBlock(props: CodeBlockProps): ReactNode {
  const config = useDocsConfig();
  const code = props.code ?? getCodeText(props.children);
  const copyLabel = config.labels?.copyCode ?? defaultLabels.copyCode;
  const copiedLabel = config.labels?.copiedCode ?? defaultLabels.copiedCode;
  const hasHeader = Boolean(props.title || props.language || code);

  return createElement(
    ChakraCodeBlock.Root,
    {
      code,
      language: props.language,
      onCopy: code
        ? () =>
            config.analytics?.onCodeCopy?.({
              code,
              language: props.language,
              title: props.title,
            })
        : undefined,
      ...props.slotProps,
    },
    hasHeader
      ? createElement(
          ChakraCodeBlock.Header,
          null,
          props.title || props.language
            ? createElement(
                ChakraCodeBlock.Title,
                null,
                props.title ?? props.language,
              )
            : null,
          createElement(
            ChakraCodeBlock.Control,
            null,
            props.title && props.language
              ? createElement(Badge, null, props.language)
              : null,
            code
              ? createElement(
                  ChakraCodeBlock.CopyTrigger,
                  { type: 'button', 'aria-label': copyLabel },
                  createElement(
                    ChakraCodeBlock.CopyIndicator,
                    { copied: copiedLabel },
                    copyLabel,
                  ),
                )
              : null,
          ),
        )
      : null,
    createElement(
      ChakraCodeBlock.Content,
      null,
      createElement(
        ChakraCodeBlock.Code,
        null,
        createElement(ChakraCodeBlock.CodeText),
      ),
    ),
  );
}

interface SearchResultProps {
  active: boolean;
  onSelect: (event: DocsAnchorClickEvent) => void;
  record: DocsSearchResult;
  slotProps?: Record<string, unknown>;
}

function SearchResult(props: SearchResultProps): ReactNode {
  const description = props.record.sectionTitle
    ? (props.record.pageTitle ?? props.record.description)
    : props.record.description;

  return createElement(
    Box,
    {
      bg: props.active ? 'teal.50' : 'transparent',
      borderColor: props.active ? 'teal.200' : 'transparent',
      borderRadius: 'md',
      borderWidth: '1px',
      display: 'block',
      p: 3,
      _hover: { bg: 'gray.50', textDecoration: 'none' },
      ...props.slotProps,
    },
    createElement(
      DocsLink,
      { href: props.record.route, onClick: props.onSelect },
      createElement(
        HStack,
        { align: 'flex-start', justify: 'space-between' },
        createElement(
          Stack,
          { gap: 1 },
          createElement(Text, { fontWeight: 'semibold' }, props.record.title),
          description
            ? createElement(
                Text,
                { color: 'fg.muted', fontSize: 'sm' },
                description,
              )
            : null,
        ),
        props.record.tags?.length
          ? createElement(
              Badge,
              { colorPalette: 'teal', flexShrink: 0, variant: 'subtle' },
              props.record.tags[0],
            )
          : null,
      ),
    ),
  );
}

function createSearchStatus(
  message: string,
  role: 'alert' | 'status',
): ReactNode {
  return createElement(
    Text,
    {
      color: 'fg.muted',
      fontSize: 'sm',
      px: 2,
      py: 6,
      role,
      textAlign: 'center',
    },
    message,
  );
}

export function filterSearchRecordsByCollections(
  records: DocsSearchRecord[],
  collectionIds: readonly string[] | undefined,
): DocsSearchRecord[] {
  const scope = normalizeCollectionIds(collectionIds);

  if (!scope) {
    return records;
  }

  return records.filter(
    (record) =>
      record.collectionId !== undefined && scope.has(record.collectionId),
  );
}

function resolveSearchCollectionIds(
  props: Pick<DocsSearchProps, 'collectionId' | 'collectionIds'>,
): string[] | undefined {
  const collectionIds =
    props.collectionIds ??
    (props.collectionId ? [props.collectionId] : undefined);
  const normalized = [...new Set(collectionIds?.filter(Boolean) ?? [])];
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeCollectionIds(
  collectionIds: readonly string[] | undefined,
): Set<string> | undefined {
  const ids = collectionIds?.filter(Boolean) ?? [];
  return ids.length > 0 ? new Set(ids) : undefined;
}

function renderMarkdownBlock(
  block: MarkdownBlock,
  index: number,
  createNextHeadingId: (title: string) => string,
  scrollMarginTop: ChakraDocsStickyTop,
): ReactNode {
  if (block.type === 'heading') {
    return createElement(
      Heading,
      {
        as: headingElement(block.level),
        id: createNextHeadingId(stripMarkdown(block.text)),
        key: `${block.type}-${index}`,
        size: block.level === 2 ? '2xl' : 'xl',
        mt: block.level === 2 ? 8 : 3,
        scrollMarginTop,
      },
      renderInlineMarkdown(block.text),
    );
  }

  if (block.type === 'paragraph') {
    return createElement(
      Text,
      { color: 'fg.muted', fontSize: 'md', key: `${block.type}-${index}` },
      renderInlineMarkdown(block.text),
    );
  }

  if (block.type === 'list') {
    return createElement(
      Box,
      { as: 'ul', color: 'fg.muted', key: `${block.type}-${index}`, ps: 6 },
      block.items.map((item) =>
        createElement(
          Box,
          { as: 'li', key: item, mt: 1 },
          renderInlineMarkdown(item),
        ),
      ),
    );
  }

  if (block.type === 'quote') {
    return createElement(
      Callout,
      { key: `${block.type}-${index}`, title: 'Note' },
      renderInlineMarkdown(block.text),
    );
  }

  return createElement(CodeBlock, {
    code: block.code,
    key: `${block.type}-${index}`,
    language: normalizeCodeLanguage(block.language),
  });
}

function parseMarkdown(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = source.trim().split(/\r?\n/);
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = /^(```|~~~)(.*)$/.exec(line);

    if (fence) {
      const marker = fence[1];
      const language = fence[2].trim() || undefined;
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index].startsWith(marker)) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      blocks.push({ type: 'code', language, code: codeLines.join('\n') });
      continue;
    }

    const headingMatch = /^(#{2,6})\s+(.+)$/.exec(line);

    if (headingMatch) {
      const title = stripMarkdown(headingMatch[2]).trim();

      if (!title) {
        blocks.push({ type: 'paragraph', text: line });
        index += 1;
        continue;
      }

      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      index += 1;
      continue;
    }

    if (/^-\s+/.test(line)) {
      const items: string[] = [];

      while (index < lines.length && /^-\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^-\s+/, ''));
        index += 1;
      }

      blocks.push({ type: 'list', items });
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];

      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ''));
        index += 1;
      }

      blocks.push({ type: 'quote', text: quoteLines.join(' ') });
      continue;
    }

    const paragraphLines: string[] = [];

    while (index < lines.length && isParagraphLine(lines[index])) {
      paragraphLines.push(lines[index]);
      index += 1;
    }

    blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') });
  }

  return blocks;
}

function isParagraphLine(line: string): boolean {
  return (
    Boolean(line.trim()) &&
    !/^(```|~~~)/.test(line) &&
    !/^(#{2,6})\s+/.test(line) &&
    !/^-\s+/.test(line) &&
    !/^>\s?/.test(line)
  );
}

function renderInlineMarkdown(text: string): ReactNode[] {
  return text
    .split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g)
    .filter(Boolean)
    .map((part, index) => renderInlineMarkdownPart(part, index));
}

function renderInlineMarkdownPart(part: string, index: number): ReactNode {
  const key = `${part}-${index}`;

  if (part.startsWith('`') && part.endsWith('`')) {
    return createElement(
      Code,
      { colorPalette: 'teal', key, variant: 'subtle' },
      part.slice(1, -1),
    );
  }

  if (part.startsWith('**') && part.endsWith('**')) {
    return createElement('strong', { key }, part.slice(2, -2));
  }

  const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);

  if (linkMatch) {
    return createElement(
      DocsLink,
      {
        color: 'blue.700',
        fontWeight: 'semibold',
        href: linkMatch[2],
        key,
        textDecoration: 'underline',
        textUnderlineOffset: '3px',
      },
      linkMatch[1],
    );
  }

  return part;
}

function headingElement(level: number): string {
  if (level === 2) return 'h2';
  if (level === 3) return 'h3';
  if (level === 4) return 'h4';
  if (level === 5) return 'h5';
  return 'h6';
}

function normalizeCodeLanguage(
  language: string | undefined,
): string | undefined {
  if (language === 'md') return 'markdown';
  if (language === 'txt') return 'text';
  if (language === 'sh') return 'bash';
  return language;
}

function getCodeText(children: ReactNode): string {
  if (typeof children === 'string') {
    return children;
  }

  if (typeof children === 'number') {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map((child) => getCodeText(child)).join('');
  }

  return '';
}

function DocsLink(props: DocsLinkProps): ReactNode {
  const config = useDocsConfig();
  const LinkComponent = config.linkComponent;

  if (!isSafeLinkHref(props.href)) {
    return createElement('span', null, props.children);
  }

  if (LinkComponent && isInternalHref(props.href)) {
    return createElement(
      Link,
      { asChild: true, ...props },
      createElement(LinkComponent, { href: props.href }, props.children),
    );
  }

  return createElement(Link, props);
}

function isInternalHref(href: string): boolean {
  const value = href.trim();

  return !value.startsWith('//') && !/^[a-z][a-z\d+.-]*:/i.test(value);
}

function NavList(props: {
  items: DocsNavItem[];
  activeRoute?: string;
}): ReactNode {
  return createElement(
    Box,
    { as: 'ol', listStyleType: 'none', ps: 0, m: 0 },
    props.items
      .filter((item) => !item.hidden)
      .map((item) =>
        createElement(
          Box,
          { as: 'li', key: item.id, py: 1 },
          item.href
            ? createElement(
                DocsLink,
                {
                  href: item.href,
                  'aria-current':
                    item.href === props.activeRoute ? 'page' : undefined,
                },
                item.title,
              )
            : createElement(Text, { fontWeight: 'semibold' }, item.title),
          item.badge ? createElement(Badge, { ms: 2 }, item.badge) : null,
          item.children
            ? createElement(
                Box,
                { ps: 4, mt: 1 },
                createElement(NavList, {
                  items: item.children,
                  activeRoute: props.activeRoute,
                }),
              )
            : null,
        ),
      ),
  );
}

function flattenNav(items: DocsNavItem[]): DocsNavItem[] {
  return items.flatMap((item) => [item, ...flattenNav(item.children ?? [])]);
}

function mergeConfig(
  inherited: ChakraDocsConfig,
  next: ChakraDocsConfig | undefined,
): ChakraDocsConfig {
  return {
    ...inherited,
    ...next,
    codeBlock: {
      ...inherited.codeBlock,
      ...next?.codeBlock,
    },
    layout: {
      ...inherited.layout,
      ...next?.layout,
    },
    labels: {
      ...defaultLabels,
      ...inherited.labels,
      ...next?.labels,
    },
  };
}
