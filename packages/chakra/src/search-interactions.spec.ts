// @vitest-environment jsdom
// @vitest-environment-options {"pretendToBeVisual":true}

import { act, createElement, StrictMode } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import * as ChakraRuntime from '@chakra-ui/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CodeBlock,
  DocsHeadingPermalink,
  DocsPageFeedback,
  DocsPageActions,
  DocsProvider,
  DocsSearch,
} from './index.js';

// DOM mounting and focus effects need headroom when coverage and builds share
// a CI worker. Keep the broader unit-test timeout unchanged.
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const { ChakraProvider, defaultSystem } = ChakraRuntime as unknown as {
  ChakraProvider: ComponentType<{ value: unknown; children?: ReactNode }>;
  defaultSystem: unknown;
};

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

function required<T>(value: T | null | undefined): T {
  if (value == null) throw new Error('Expected a DOM node or attribute');
  return value;
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('matchMedia', (media: string) => ({
    matches: false,
    media,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  vi.stubGlobal('CSS', {
    escape: (value: string) =>
      Array.from(
        value,
        (character) => `\\${character.codePointAt(0)?.toString(16)} `,
      ).join(''),
  });
  // jsdom batches RAF callbacks without the browser's intervening microtask
  // checkpoints. Separate tasks let Zag flush focus before selecting the tab.
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(performance.now()), 0),
  );
  vi.stubGlobal('cancelAnimationFrame', (id: number) =>
    window.clearTimeout(id),
  );
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {
        /* No layout in jsdom. */
      }
      unobserve() {
        /* No layout in jsdom. */
      }
      disconnect() {
        /* No layout in jsdom. */
      }
    },
  );
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

function button(label: string): HTMLButtonElement {
  const result = [...document.querySelectorAll('button')].find((node) => {
    const accessibleContent = node.cloneNode(true) as HTMLElement;
    accessibleContent
      .querySelectorAll('[aria-hidden="true"]')
      .forEach((child) => child.remove());
    return (
      node.getAttribute('aria-label') === label ||
      accessibleContent.textContent?.trim() === label
    );
  });
  expect(result, `Button ${label}`).toBeDefined();
  return result as HTMLButtonElement;
}

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function render(node: ReactNode) {
  await act(async () => {
    root.render(createElement(ChakraProvider, { value: defaultSystem }, node));
  });
}

async function press(
  element: HTMLElement,
  key: string,
  init: KeyboardEventInit = {},
) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  await act(async () => {
    element.dispatchEvent(event);
  });
  await act(async () => {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  return event;
}

const searchRecords = Array.from({ length: 12 }, (_, index) => ({
  id: `page-${index}`,
  route: `/docs/page-${index}`,
  title: `Page ${String(index).padStart(2, '0')}`,
  text: `Searchable page ${index}`,
  headings: [],
}));

async function openSearch(props: Parameters<typeof DocsSearch>[0] = {}) {
  await render(
    createElement(DocsSearch, {
      records: searchRecords,
      popularLimit: 12,
      ...props,
    }),
  );
  await press(document.body, 'k', { metaKey: true });
  const input = document.querySelector<HTMLInputElement>('[role="combobox"]');
  expect(input).not.toBeNull();
  return input as HTMLInputElement;
}

async function typeQuery(input: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('DocsPageActions portal variables', () => {
  it('carries root inline variables through both portal levels and allows local overrides', async () => {
    await render(
      createElement(
        DocsPageActions.Root,
        {
          size: 'lg',
          slotProps: {
            style: { '--page-action-test': 'root', display: 'flex' },
          },
        },
        createElement(
          DocsPageActions.Menu,
          {
            label: 'Actions',
            defaultOpen: true,
            positionerSlotProps: { 'data-testid': 'main-positioner' },
          },
          createElement(
            DocsPageActions.Submenu,
            {
              label: 'Nested',
              defaultOpen: true,
              positionerSlotProps: {
                'data-testid': 'nested-positioner',
                style: { '--page-action-local': 'nested' },
              },
            },
            createElement(DocsPageActions.Item, { href: '/docs' }, 'Docs'),
          ),
        ),
      ),
    );
    for (const id of ['main-positioner', 'nested-positioner']) {
      const positioner = required(
        document.querySelector<HTMLElement>(`[data-testid="${id}"]`),
      );
      expect(positioner.style.getPropertyValue('--page-action-test')).toBe(
        'root',
      );
      expect(positioner.style.display).not.toBe('flex');
      expect(container.contains(positioner)).toBe(false);
    }
    expect(
      required(
        document.querySelector<HTMLElement>(
          '[data-testid="nested-positioner"]',
        ),
      ).style.getPropertyValue('--page-action-local'),
    ).toBe('nested');
  });
});

describe('DocsPageActions copy confirmation', () => {
  it.each([
    { action: 'page', expected: 'Copied!' },
    { action: 'link', expected: 'Copied!' },
    { action: 'page', providerLabel: 'Page copied', expected: 'Page copied' },
    { action: 'link', providerLabel: 'Link copied', expected: 'Link copied' },
    {
      action: 'page',
      providerLabel: 'Global',
      copiedLabel: 'Done!',
      expected: 'Done!',
    },
    {
      action: 'link',
      providerLabel: 'Global',
      copiedLabel: 'Saved!',
      expected: 'Saved!',
    },
  ])(
    'shows and resets $action confirmation: $expected',
    async ({ action, providerLabel, copiedLabel, expected }) => {
      const writeText = vi.fn(async () => undefined);
      vi.stubGlobal(
        'navigator',
        Object.create(navigator, { clipboard: { value: { writeText } } }),
      );
      vi.useFakeTimers();
      try {
        const label = action === 'page' ? 'Copy page' : 'Copy link';
        await render(
          createElement(
            DocsProvider,
            {
              config: {
                labels: {
                  copiedPage: providerLabel,
                  copiedLink: providerLabel,
                },
              },
            },
            createElement(
              DocsPageActions.Root,
              { markdown: '# Page', pageUrl: '/docs/page' },
              createElement(
                action === 'page'
                  ? DocsPageActions.CopyPage
                  : DocsPageActions.CopyLink,
                {
                  copiedLabel,
                  icon: createElement(
                    'span',
                    { 'data-copy-icon': true },
                    'icon',
                  ),
                },
              ),
            ),
          ),
        );
        const trigger = button(label);
        expect(trigger.textContent).toContain(label);
        await act(async () => trigger.click());
        expect(writeText).toHaveBeenCalledWith(
          action === 'page' ? '# Page' : '/docs/page',
        );
        expect(trigger.textContent).toContain(expected);
        expect(trigger.querySelector('[data-copy-icon]')).not.toBeNull();
        await act(async () => {
          await vi.advanceTimersByTimeAsync(4000);
        });
        expect(trigger.textContent).toContain(label);
        expect(trigger.textContent).not.toContain(expected);
      } finally {
        vi.useRealTimers();
      }
    },
  );
});

describe('CodeBlock copy analytics', () => {
  it('does not classify ordinary code as package commands', async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal(
      'navigator',
      Object.create(navigator, { clipboard: { value: { writeText } } }),
    );
    const onCodeCopy = vi.fn();
    const onPackageCommandCopy = vi.fn();
    await render(
      createElement(
        DocsProvider,
        {
          config: { analytics: { onCodeCopy, onPackageCommandCopy } },
        },
        createElement(CodeBlock, { code: 'npm install example' }),
      ),
    );
    await act(async () => button('Copy code').click());
    expect(onCodeCopy).toHaveBeenCalledTimes(1);
    expect(onPackageCommandCopy).not.toHaveBeenCalled();
  });
  it('emits successful code and explicit package command copies alongside slot callbacks', async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal(
      'navigator',
      Object.create(navigator, { clipboard: { value: { writeText } } }),
    );
    const onCodeCopy = vi.fn(() => {
      throw new Error('Analytics offline');
    });
    const onPackageCommandCopy = vi.fn();
    const onCopy = vi.fn();
    await render(
      createElement(
        DocsProvider,
        {
          config: { analytics: { onCodeCopy, onPackageCommandCopy } },
        },
        createElement(CodeBlock, {
          code: 'pnpm add @chakra-docs/chakra',
          language: 'sh',
          packageManager: 'pnpm',
          slotProps: { onCopy },
        }),
      ),
    );
    expect(onPackageCommandCopy).not.toHaveBeenCalled();
    await act(async () => button('Copy code').click());
    expect(writeText).toHaveBeenCalledWith('pnpm add @chakra-docs/chakra');
    expect(onCodeCopy).toHaveBeenCalledTimes(1);
    expect(onPackageCommandCopy).toHaveBeenCalledExactlyOnceWith({
      command: 'pnpm add @chakra-docs/chakra',
      manager: 'pnpm',
    });
    expect(onCopy).toHaveBeenCalledTimes(1);
  });
});

describe('heading and feedback analytics', () => {
  it('preserves provider analytics alongside heading clipboard status observers', async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal(
      'navigator',
      Object.create(navigator, { clipboard: { value: { writeText } } }),
    );
    const onHeadingLinkCopy = vi.fn();
    const onStatusChange = vi.fn();
    await render(
      createElement(
        DocsProvider,
        { config: { analytics: { onHeadingLinkCopy } } },
        createElement(DocsHeadingPermalink, {
          headingId: 'install',
          title: 'Install',
          slotProps: { onStatusChange },
        }),
      ),
    );
    expect(onHeadingLinkCopy).not.toHaveBeenCalled();
    await act(async () => required(container.querySelector('button')).click());
    expect(onHeadingLinkCopy).toHaveBeenCalledExactlyOnceWith({
      headingId: 'install',
      title: 'Install',
      href: '#install',
    });
    expect(onStatusChange).toHaveBeenCalledExactlyOnceWith({ copied: true });
  });

  it('does not turn successful feedback into an error when analytics throws', async () => {
    const onSubmit = vi.fn(async () => undefined);
    const onPageFeedback = vi.fn(() => {
      throw new Error('Analytics unavailable');
    });
    await render(
      createElement(
        DocsProvider,
        { config: { analytics: { onPageFeedback } } },
        createElement(DocsPageFeedback.Root, {
          onSubmit,
          defaultValue: 'helpful',
        }),
      ),
    );
    await act(async () =>
      required(container.querySelector('form')).dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      ),
    );
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onPageFeedback).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Thanks for your feedback');
  });
});

describe('DocsSearch keyboard interactions', () => {
  beforeEach(() => {
    // The dialog's focus trap checks visibility; jsdom has no layout boxes.
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
      { width: 100, height: 30 },
    ] as unknown as DOMRectList);
  });
  it('tracks displayed recommendations and keyboard selection once, even with repeated shortcuts and callback identity changes', async () => {
    const onSearchOpen = vi.fn();
    const onSearchClose = vi.fn();
    const onSearchResults = vi.fn();
    const onSearchResultSelect = vi.fn(() => {
      throw new Error('Analytics offline');
    });
    const onNavigate = vi.fn();
    const tree = () =>
      createElement(
        StrictMode,
        null,
        createElement(
          DocsProvider,
          {
            config: {
              analytics: {
                onSearchOpen,
                onSearchClose,
                onSearchResults,
                onSearchResultSelect,
              },
            },
          },
          createElement(DocsSearch, {
            defaultResults: [searchRecords[2], searchRecords[1]],
            onNavigate,
          }),
        ),
      );
    await render(tree());
    expect(onSearchResults).not.toHaveBeenCalled();
    await press(document.body, 'k', { metaKey: true });
    await press(document.body, 'k', { metaKey: true });
    await render(tree());
    expect(onSearchOpen).toHaveBeenCalledTimes(1);
    expect(onSearchResults).toHaveBeenCalledExactlyOnceWith({
      query: '',
      collectionIds: undefined,
      source: 'curated',
      mode: 'default',
      resultCount: 2,
      resultIds: ['page-2', 'page-1'],
    });
    const input = required(
      document.querySelector<HTMLInputElement>('[role="combobox"]'),
    );
    await press(input, 'ArrowDown');
    expect(onSearchResults).toHaveBeenCalledTimes(1);
    await press(input, 'Enter');
    expect(onSearchResultSelect).toHaveBeenCalledExactlyOnceWith(
      searchRecords[1],
      {
        query: '',
        collectionIds: undefined,
        source: 'curated',
        mode: 'default',
        resultCount: 2,
        position: 2,
        interaction: 'keyboard',
      },
    );
    expect(onNavigate).toHaveBeenCalledWith(
      searchRecords[1].route,
      searchRecords[1],
    );
    expect(onSearchClose).toHaveBeenCalledExactlyOnceWith({
      reason: 'selection',
    });
    await press(document.body, 'k', { metaKey: true });
    expect(onSearchResults).toHaveBeenCalledTimes(2);
    await press(
      required(document.querySelector<HTMLInputElement>('[role="combobox"]')),
      'Escape',
    );
    expect(onSearchClose).toHaveBeenLastCalledWith({ reason: 'dismiss' });
  });

  it('reports typed local results, zero results and pointer selection with query and position', async () => {
    const onSearch = vi.fn();
    const onSearchResults = vi.fn();
    const onSearchResultSelect = vi.fn();
    await render(
      createElement(
        DocsProvider,
        {
          config: {
            analytics: { onSearch, onSearchResults, onSearchResultSelect },
          },
        },
        createElement(DocsSearch, {
          records: searchRecords,
          onNavigate: vi.fn(),
        }),
      ),
    );
    await press(document.body, 'k', { metaKey: true });
    const input = required(
      document.querySelector<HTMLInputElement>('[role="combobox"]'),
    );
    await typeQuery(input, ' No matches here ');
    expect(onSearch).toHaveBeenLastCalledWith('no matches here');
    expect(onSearchResults).toHaveBeenLastCalledWith(
      expect.objectContaining({
        query: 'No matches here',
        resultCount: 0,
        resultIds: [],
        source: 'local',
        mode: 'query',
      }),
    );
    await typeQuery(input, 'Page 01');
    const link = required(
      document.querySelector<HTMLAnchorElement>('a[role="option"]'),
    );
    await act(async () => link.click());
    expect(onSearchResultSelect).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        query: 'Page 01',
        position: 1,
        interaction: 'pointer',
        source: 'local',
        mode: 'query',
      }),
    );
  });

  it('reports foreground errors but not background prefetch failures or aborted requests', async () => {
    const onSearchError = vi.fn();
    const onSearchResults = vi.fn();
    const searchProvider = vi.fn(async () => {
      throw new Error('Private provider details');
    });
    await render(
      createElement(
        DocsProvider,
        { config: { analytics: { onSearchError, onSearchResults } } },
        createElement(DocsSearch, { searchProvider, prefetch: 'mount' }),
      ),
    );
    expect(onSearchError).not.toHaveBeenCalled();
    await press(document.body, 'k', { metaKey: true });
    expect(onSearchError).toHaveBeenCalledExactlyOnceWith({
      query: '',
      collectionIds: undefined,
      source: 'remote',
      mode: 'default',
      resultCount: 0,
    });
    expect(onSearchResults).not.toHaveBeenCalled();
    const input = required(
      document.querySelector<HTMLInputElement>('[role="combobox"]'),
    );
    await typeQuery(input, 'cancelled');
    await press(input, 'Escape');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 180));
    });
    expect(onSearchError).toHaveBeenCalledTimes(1);
  });

  it('optionally debounces query analytics and cancels pending events on close', async () => {
    const onSearch = vi.fn();
    await render(
      createElement(
        DocsProvider,
        { config: { analytics: { onSearch } } },
        createElement(DocsSearch, {
          records: searchRecords,
          analyticsDebounceMs: 100,
        }),
      ),
    );
    await press(document.body, 'k', { metaKey: true });
    const input = required(
      document.querySelector<HTMLInputElement>('[role="combobox"]'),
    );
    await typeQuery(input, 'p');
    await typeQuery(input, 'page');
    expect(onSearch).not.toHaveBeenCalled();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 120));
    });
    expect(onSearch).toHaveBeenCalledExactlyOnceWith('page');
    await typeQuery(input, 'cancelled');
    await press(input, 'Escape');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 120));
    });
    expect(onSearch).toHaveBeenCalledTimes(1);
  });
  it('prefetches on mount without analytics and reuses fresh defaults on repeated opening', async () => {
    const searchProvider = vi.fn(async () => ({
      query: '',
      results: [searchRecords[2], searchRecords[1]],
    }));
    const onSearchOpen = vi.fn();
    const onSearch = vi.fn();
    const onSearchResults = vi.fn();
    await render(
      createElement(
        StrictMode,
        null,
        createElement(
          DocsProvider,
          {
            config: { analytics: { onSearchOpen, onSearch, onSearchResults } },
          },
          createElement(DocsSearch, { searchProvider, prefetch: 'mount' }),
        ),
      ),
    );
    expect(searchProvider).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(onSearchOpen).not.toHaveBeenCalled();
    expect(onSearch).not.toHaveBeenCalled();
    expect(onSearchResults).not.toHaveBeenCalled();
    await press(document.body, 'k', { metaKey: true });
    const input = required(
      document.querySelector<HTMLInputElement>('[role="combobox"]'),
    );
    expect(document.querySelector('[role="option"]')?.textContent).toBe(
      'Page 02',
    );
    expect(document.querySelector('[role="status"]')).toBeNull();
    expect(onSearchOpen).toHaveBeenCalledTimes(1);
    expect(onSearchResults).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        source: 'remote',
        mode: 'default',
        resultIds: ['page-2', 'page-1'],
      }),
    );
    await press(input, 'Escape');
    await press(document.body, 'k', { ctrlKey: true });
    expect(searchProvider).toHaveBeenCalledTimes(1);
    expect(onSearchResults).toHaveBeenCalledTimes(2);
  });

  it.each(['focus', 'hover'])(
    'prefetches on %s intent and composes consumer trigger handlers',
    async (intent) => {
      const searchProvider = vi.fn(async () => ({
        query: '',
        results: [searchRecords[0]],
      }));
      const onFocus = vi.fn();
      const onPointerEnter = vi.fn();
      await render(
        createElement(DocsSearch, {
          searchProvider,
          prefetch: 'intent',
          triggerSlotProps: { onFocus, onPointerEnter },
        }),
      );
      expect(searchProvider).not.toHaveBeenCalled();
      const trigger = required(container.querySelector('button'));
      await act(async () => {
        if (intent === 'focus') trigger.focus();
        else
          trigger.dispatchEvent(
            new MouseEvent('pointerover', { bubbles: true }),
          );
      });
      expect(
        intent === 'focus' ? onFocus : onPointerEnter,
      ).toHaveBeenCalledTimes(1);
      expect(searchProvider).toHaveBeenCalledTimes(1);
      await press(trigger, 'k', { metaKey: true });
      expect(searchProvider).toHaveBeenCalledTimes(1);
      expect(document.querySelector('[role="option"]')?.textContent).toBe(
        'Page 00',
      );
    },
  );

  it('joins in-flight prefetching and keeps cached selection stable during a stale refresh', async () => {
    let now = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    let resolveInitial!: (value: {
      query: string;
      results: typeof searchRecords;
    }) => void;
    let resolveRefresh!: (value: {
      query: string;
      results: typeof searchRecords;
    }) => void;
    const searchProvider = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveInitial = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRefresh = resolve;
          }),
      );
    const input = await openSearch({
      searchProvider,
      prefetch: 'mount',
      prefetchStaleTimeMs: 100,
    });
    expect(searchProvider).toHaveBeenCalledTimes(1);
    await act(async () =>
      resolveInitial({
        query: '',
        results: [searchRecords[0], searchRecords[1]],
      }),
    );
    await press(input, 'Escape');
    now = 101;
    await press(document.body, 'k', { metaKey: true });
    expect(searchProvider).toHaveBeenCalledTimes(2);
    const reopened = required(
      document.querySelector<HTMLInputElement>('[role="combobox"]'),
    );
    await press(reopened, 'ArrowDown');
    await act(async () =>
      resolveRefresh({
        query: '',
        results: [searchRecords[8], searchRecords[9]],
      }),
    );
    expect(document.querySelector('[aria-selected="true"]')?.textContent).toBe(
      'Page 01',
    );
    expect(document.querySelector('[role="status"]')).toBeNull();
    await press(reopened, 'Escape');
    await press(document.body, 'k', { metaKey: true });
    expect(document.querySelector('[role="option"]')?.textContent).toBe(
      'Page 08',
    );
    expect(searchProvider).toHaveBeenCalledTimes(2);
  });

  it('invalidates prefetched results on scope or provider changes and aborts on unmount', async () => {
    const signals: AbortSignal[] = [];
    const searchProvider = vi.fn(async (query, options) => {
      signals.push(options.signal);
      return {
        query: '',
        results: [searchRecords[query.collectionIds[0] === 'v1' ? 0 : 1]],
      };
    });
    await render(
      createElement(DocsSearch, {
        searchProvider,
        prefetch: 'mount',
        collectionIds: ['v1'],
      }),
    );
    await render(
      createElement(DocsSearch, {
        searchProvider,
        prefetch: 'mount',
        collectionIds: ['v1'],
      }),
    );
    expect(searchProvider).toHaveBeenCalledTimes(1);
    await render(
      createElement(DocsSearch, {
        searchProvider,
        prefetch: 'mount',
        collectionIds: ['v2'],
      }),
    );
    expect(searchProvider).toHaveBeenCalledTimes(2);
    await press(document.body, 'k', { metaKey: true });
    expect(document.querySelector('[role="option"]')?.textContent).toBe(
      'Page 01',
    );
    const otherProvider = vi.fn((_query, options) => {
      signals.push(options.signal);
      return new Promise<never>(() => undefined);
    });
    await render(
      createElement(DocsSearch, {
        searchProvider: otherProvider,
        prefetch: 'mount',
        collectionIds: ['v2'],
      }),
    );
    expect(document.querySelector('[role="option"]')).toBeNull();
    await render(null);
    expect(signals.at(-1)?.aborted).toBe(true);
  });

  it('does not prefetch by default or when curated defaults take precedence, and retries failures on open', async () => {
    const searchProvider = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ query: '', results: [searchRecords[0]] });
    await render(createElement(DocsSearch, { searchProvider }));
    expect(searchProvider).not.toHaveBeenCalled();
    await render(
      createElement(DocsSearch, {
        searchProvider,
        prefetch: 'mount',
        defaultResults: [],
      }),
    );
    expect(searchProvider).not.toHaveBeenCalled();
    await render(
      createElement(DocsSearch, { searchProvider, prefetch: 'mount' }),
    );
    expect(searchProvider).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[role="alert"]')).toBeNull();
    await press(document.body, 'k', { metaKey: true });
    expect(searchProvider).toHaveBeenCalledTimes(2);
    expect(document.querySelector('[role="option"]')?.textContent).toBe(
      'Page 00',
    );
  });
  it('shows curated defaults immediately, searches when typing, and restores them on clear', async () => {
    const searchProvider = vi.fn(async () => ({
      query: 'page',
      results: [searchRecords[1]],
    }));
    const defaults = [searchRecords[8], searchRecords[3]];
    const input = await openSearch({
      defaultResults: defaults,
      defaultResultsLabel: 'New this week',
      searchProvider,
      debounceMs: 0,
    });
    const titles = () =>
      [...document.querySelectorAll('[role="option"]')].map(
        (option) => option.textContent,
      );
    expect(titles()).toEqual(['Page 08', 'Page 03']);
    expect(document.body.textContent).toContain('New this week');
    expect(searchProvider).not.toHaveBeenCalled();
    await press(input, 'ArrowDown');
    await typeQuery(input, 'page');
    await press(input, 'Shift');
    expect(searchProvider).toHaveBeenCalledTimes(1);
    expect(titles()).toEqual(['Page 01']);
    await typeQuery(input, '');
    expect(titles()).toEqual(['Page 08', 'Page 03']);
    expect(document.querySelector('[aria-selected="true"]')?.textContent).toBe(
      'Page 08',
    );
    expect(searchProvider).toHaveBeenCalledTimes(1);
  });

  it('filters curated results on collection changes and lets an explicit empty list suppress provider defaults', async () => {
    const searchProvider = vi.fn(async () => ({
      query: '',
      results: searchRecords,
    }));
    const defaults = [
      { ...searchRecords[0], collectionId: 'v1' },
      { ...searchRecords[1], collectionId: 'v2' },
    ];
    await openSearch({
      defaultResults: defaults,
      collectionId: 'v1',
      searchProvider,
    });
    expect(document.querySelector('[role="option"]')?.textContent).toBe(
      'Page 00',
    );
    await render(
      createElement(DocsSearch, {
        defaultResults: defaults,
        collectionId: 'v2',
        searchProvider,
      }),
    );
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(1);
    expect(document.querySelector('[role="option"]')?.textContent).toBe(
      'Page 01',
    );
    await render(
      createElement(DocsSearch, { defaultResults: [], searchProvider }),
    );
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(0);
    expect(document.querySelector('[role="status"]')?.textContent).toBe(
      'No results found',
    );
    expect(searchProvider).not.toHaveBeenCalled();
  });

  it('supports curated-only launchers and keeps local search separate from curated ordering', async () => {
    const input = await openSearch({
      records: [],
      defaultResults: [searchRecords[3]],
    });
    expect(document.querySelector('[role="option"]')?.textContent).toBe(
      'Page 03',
    );
    await render(
      createElement(DocsSearch, {
        records: searchRecords,
        defaultResults: [searchRecords[3]],
      }),
    );
    await typeQuery(input, 'Page 11');
    expect(document.querySelector('[role="option"]')?.textContent).toBe(
      'Page 11',
    );
    await typeQuery(input, '');
    expect(document.querySelector('[role="option"]')?.textContent).toBe(
      'Page 03',
    );
  });
  it('opens with either platform shortcut, focuses the combobox, and restores focus on Escape', async () => {
    await render(
      createElement(
        'div',
        null,
        createElement('button', { id: 'search-opener' }, 'Previous focus'),
        createElement(DocsSearch, { records: searchRecords }),
      ),
    );
    const opener = button('Previous focus');
    for (const modifiers of [{ metaKey: true }, { ctrlKey: true }]) {
      opener.focus();
      await press(opener, 'k', modifiers);
      const input = required(
        document.querySelector<HTMLInputElement>('[role="combobox"]'),
      );
      expect(document.activeElement).toBe(input);
      expect(input.getAttribute('aria-expanded')).toBe('true');
      const list = required(
        document.getElementById(required(input.getAttribute('aria-controls'))),
      );
      expect(list?.getAttribute('role')).toBe('listbox');
      expect(
        document.getElementById(required(list.getAttribute('aria-labelledby')))
          ?.textContent,
      ).toBe('Popular docs');
      await press(input, 'Escape');
      expect(
        document.querySelector('[role="dialog"][data-state="open"]'),
      ).toBeNull();
      expect(document.activeElement).toBe(opener);
    }
  });

  it('keeps the active row visible in both directions without moving focus or scrolling the page', async () => {
    const input = await openSearch();
    const list = required(
      document.getElementById(required(input.getAttribute('aria-controls'))),
    );
    const scroller = required(list.parentElement);
    const rows = [
      ...list.querySelectorAll<HTMLElement>('[data-search-result-index]'),
    ];
    const options = [...list.querySelectorAll<HTMLElement>('[role="option"]')];
    expect(options).toHaveLength(12);
    Object.defineProperties(scroller, {
      clientHeight: { configurable: true, value: 100 },
      clientTop: { configurable: true, value: 1 },
    });
    vi.spyOn(scroller, 'getBoundingClientRect').mockReturnValue({
      top: 100,
    } as DOMRect);
    rows.forEach((row, index) => {
      vi.spyOn(row, 'getBoundingClientRect').mockImplementation(
        () =>
          ({
            top: 101 + index * 40 - scroller.scrollTop,
            bottom: 141 + index * 40 - scroller.scrollTop,
          }) as DOMRect,
      );
    });
    const assertSelected = (index: number) => {
      expect(input.getAttribute('aria-activedescendant')).toBe(
        options[index].id,
      );
      expect(
        options.filter(
          (option) => option.getAttribute('aria-selected') === 'true',
        ),
      ).toEqual([options[index]]);
      expect(options.every((option) => option.tabIndex === -1)).toBe(true);
      expect(document.activeElement).toBe(input);
    };
    assertSelected(0);
    await press(input, 'ArrowUp');
    assertSelected(0);
    for (let index = 1; index < options.length; index++) {
      await press(input, 'ArrowDown');
      assertSelected(index);
      expect(rows[index].getBoundingClientRect().bottom).toBeLessThanOrEqual(
        201,
      );
    }
    await press(input, 'ArrowDown');
    assertSelected(11);
    expect(scroller.scrollTop).toBe(380);
    for (let index = 10; index >= 0; index--) {
      await press(input, 'ArrowUp');
      assertSelected(index);
      expect(rows[index].getBoundingClientRect().top).toBeGreaterThanOrEqual(
        101,
      );
    }
    expect(scroller.scrollTop).toBe(0);
    expect(document.documentElement.scrollTop).toBe(0);
    expect(document.body.scrollTop).toBe(0);
  });

  it('keeps Tab navigation inside the dialog and restores the trigger after button activation', async () => {
    await render(createElement(DocsSearch, { records: searchRecords }));
    const trigger = required(container.querySelector('button'));
    trigger.focus();
    await act(async () => trigger.click());
    await press(trigger, 'Shift');
    const input = required(
      document.querySelector<HTMLInputElement>('[role="combobox"]'),
    );
    expect(document.activeElement).toBe(input);
    for (const shiftKey of [false, true]) {
      await press(input, 'Tab', { shiftKey });
      expect(document.activeElement).toBe(input);
    }
    await press(input, 'Escape');
    expect(document.activeElement).toBe(trigger);
  });

  it('activates the highlighted result with Enter and preserves text editing and composition', async () => {
    const onNavigate = vi.fn();
    const onResultSelect = vi.fn();
    const input = await openSearch({ onNavigate, onResultSelect });
    await press(input, 'ArrowDown');
    const selectedId = input.getAttribute('aria-activedescendant');
    const selected = required(document.getElementById(required(selectedId)));
    const route = selected.getAttribute('href');
    for (const key of ['Home', 'End', 'ArrowLeft', 'ArrowRight']) {
      expect((await press(input, key)).defaultPrevented).toBe(false);
    }
    expect(
      (await press(input, 'ArrowDown', { shiftKey: true })).defaultPrevented,
    ).toBe(false);
    await press(input, 'ArrowDown', { isComposing: true });
    await press(input, 'Enter', { isComposing: true });
    expect(input.getAttribute('aria-activedescendant')).toBe(selectedId);
    expect(onNavigate).not.toHaveBeenCalled();
    await press(input, 'Enter');
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith(
      route,
      expect.objectContaining({ route }),
    );
    expect(onResultSelect).toHaveBeenCalledTimes(1);
    expect(
      document.querySelector('[role="dialog"][data-state="open"]'),
    ).toBeNull();
  });

  it('resets selection after filtering and removes the active descendant for empty results', async () => {
    const onNavigate = vi.fn();
    const input = await openSearch({ onNavigate });
    await press(input, 'ArrowDown');
    await press(input, 'ArrowDown');
    await typeQuery(input, 'Page 11');
    const options = [...document.querySelectorAll('[role="option"]')];
    expect(options.length).toBeGreaterThan(0);
    expect(input.getAttribute('aria-activedescendant')).toBe(options[0].id);
    await typeQuery(input, 'zzzznothingmatches');
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(0);
    expect(input.hasAttribute('aria-activedescendant')).toBe(false);
    expect(document.querySelector('[role="status"]')?.textContent).toBe(
      'No results found',
    );
    await press(input, 'ArrowDown');
    await press(input, 'Enter');
    expect(onNavigate).not.toHaveBeenCalled();
    await press(input, 'Escape');
    expect(
      document.querySelector('[role="dialog"][data-state="open"]'),
    ).toBeNull();
  });

  it('does not select hidden results while loading or after a provider error', async () => {
    let rejectSearch: (reason: Error) => void = () => undefined;
    const searchProvider = vi.fn(
      () =>
        new Promise<never>((_resolve, reject) => {
          rejectSearch = reject;
        }),
    );
    const onNavigate = vi.fn();
    const input = await openSearch({ searchProvider, onNavigate });
    expect(
      document.querySelector('[role="listbox"]')?.getAttribute('aria-busy'),
    ).toBe('true');
    expect(input.hasAttribute('aria-activedescendant')).toBe(false);
    await press(input, 'Enter');
    await act(async () => rejectSearch(new Error('Offline')));
    expect(document.querySelector('[role="alert"]')?.textContent).toBe(
      'Search is temporarily unavailable',
    );
    expect(input.hasAttribute('aria-activedescendant')).toBe(false);
    await press(input, 'Enter');
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('preserves modified link clicks without closing search or taking focus from the input', async () => {
    const onNavigate = vi.fn();
    const onResultSelect = vi.fn();
    const input = await openSearch({ onNavigate, onResultSelect });
    const option = required(
      document.querySelector<HTMLElement>('[role="option"]'),
    );
    const down = new MouseEvent('mousedown', {
      button: 0,
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    await act(async () => option.dispatchEvent(down));
    expect(down.defaultPrevented).toBe(true);
    let cancelledByComponent = true;
    document.addEventListener(
      'click',
      (event) => {
        cancelledByComponent = event.defaultPrevented;
        // Suppress jsdom navigation after the component has handled the event.
        event.preventDefault();
      },
      { once: true },
    );
    await act(async () =>
      option.dispatchEvent(
        new MouseEvent('click', {
          button: 0,
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }),
      ),
    );
    expect(cancelledByComponent).toBe(false);
    expect(onNavigate).not.toHaveBeenCalled();
    expect(onResultSelect).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute('aria-expanded')).toBe('true');
  });
});
