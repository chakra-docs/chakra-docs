// @vitest-environment jsdom
// @vitest-environment-options {"pretendToBeVisual":true}

import { act, createElement } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import * as ChakraRuntime from '@chakra-ui/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DocsSearch } from './index.js';

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

describe('DocsSearch keyboard interactions', () => {
  beforeEach(() => {
    // The dialog's focus trap checks visibility; jsdom has no layout boxes.
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
      { width: 100, height: 30 },
    ] as unknown as DOMRectList);
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
