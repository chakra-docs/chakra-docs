// @vitest-environment jsdom
// @vitest-environment-options {"pretendToBeVisual":true}

import { act, createElement } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import * as ChakraRuntime from '@chakra-ui/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DocsMobileNavigation, DocsTabs } from './index.js';

// DOM mounting and focus effects need headroom when coverage and builds share
// a CI worker. Keep the broader unit-test timeout unchanged.
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

const { ChakraProvider, defaultSystem } = ChakraRuntime as unknown as {
  ChakraProvider: ComponentType<{ value: unknown; children?: ReactNode }>;
  defaultSystem: unknown;
};

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

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

const navigation = [
  {
    id: 'guide',
    title: 'Guide',
    children: [{ id: 'start', title: 'Start', href: '/docs/start' }],
  },
  {
    id: 'examples',
    title: 'Examples',
    children: [{ id: 'example', title: 'Example', href: '/docs/example' }],
  },
  {
    id: 'api',
    title: 'API',
    children: [
      { id: 'reference', title: 'Reference', href: '/docs/reference' },
    ],
  },
];

function mobileNavigation(
  route: string,
  props: Parameters<typeof DocsMobileNavigation.Root>[0] = {},
) {
  return createElement(DocsMobileNavigation.Root, {
    nav: navigation,
    page: {
      id: route,
      route,
      title: route,
      slug: [],
      path: route,
      frontmatter: {},
    },
    ...props,
  });
}

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

async function click(element: HTMLElement) {
  await act(async () => element.click());
}

describe('DocsMobileNavigation interactions', () => {
  it('closes on route changes by default and respects closeOnNavigate=false', async () => {
    const onOpenChange = vi.fn();
    await render(
      mobileNavigation('/docs/start', {
        defaultOpen: true,
        closeOnNavigate: false,
        onOpenChange,
      }),
    );
    await render(
      mobileNavigation('/docs/example', {
        closeOnNavigate: false,
        onOpenChange,
      }),
    );
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(
      document.querySelector('[role="dialog"]')?.getAttribute('data-state'),
    ).toBe('open');

    // Enabling dismissal should not treat an already-observed route as new.
    await render(mobileNavigation('/docs/example', { onOpenChange }));
    expect(onOpenChange).not.toHaveBeenCalled();
    await render(mobileNavigation('/docs/reference', { onOpenChange }));
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith({ open: false });
  });

  it.each([true, false])(
    'honors closeOnNavigate=%s on link selection',
    async (closeOnNavigate) => {
      const onOpenChange = vi.fn();
      await render(
        mobileNavigation('/docs/start', {
          defaultOpen: true,
          closeOnNavigate,
          onOpenChange,
        }),
      );
      const link = document.querySelector<HTMLAnchorElement>(
        'a[href="/docs/start"]',
      );
      expect(link).not.toBeNull();
      // Cancel jsdom's browser navigation after React's click handler has run.
      const cancelNavigation = (event: Event) => event.preventDefault();
      document.addEventListener('click', cancelNavigation, { once: true });
      await click(link as HTMLAnchorElement);
      if (closeOnNavigate) {
        expect(onOpenChange).toHaveBeenCalledExactlyOnceWith({ open: false });
      } else {
        expect(onOpenChange).not.toHaveBeenCalled();
      }
    },
  );

  it('preserves manual expansion and opens the new active branch while closed', async () => {
    const onOpenChange = vi.fn();
    await render(mobileNavigation('/docs/start', { onOpenChange }));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await click(button('Open navigation'));
    expect(button('Examples').getAttribute('aria-expanded')).toBe('false');
    await click(button('Examples'));
    expect(button('Examples').getAttribute('aria-expanded')).toBe('true');
    await click(button('Close navigation'));
    expect(
      document.querySelector('[role="dialog"]')?.getAttribute('data-state'),
    ).toBe('closed');
    onOpenChange.mockClear();
    await render(mobileNavigation('/docs/reference', { onOpenChange }));
    expect(onOpenChange).not.toHaveBeenCalled();
    await click(button('Open navigation'));
    expect(
      document.querySelector('[role="dialog"]')?.getAttribute('data-state'),
    ).toBe('open');
    expect(button('Examples').getAttribute('aria-expanded')).toBe('true');
    expect(button('API').getAttribute('aria-expanded')).toBe('true');
    expect(button('Guide').getAttribute('aria-expanded')).toBe('true');
  });

  it('leaves controlled expansion owned by the consumer', async () => {
    const onExpandedChange = vi.fn();
    await render(
      mobileNavigation('/docs/start', {
        defaultOpen: true,
        sidebarProps: { expandedIds: ['guide'], onExpandedChange },
      }),
    );
    await click(button('Examples'));
    expect(onExpandedChange).toHaveBeenCalledWith(['guide', 'examples']);
    expect(button('Examples').getAttribute('aria-expanded')).toBe('false');
    await render(
      mobileNavigation('/docs/start', {
        sidebarProps: { expandedIds: ['guide', 'examples'], onExpandedChange },
      }),
    );
    expect(button('Examples').getAttribute('aria-expanded')).toBe('true');
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function render(node: ReactNode) {
  await act(async () => {
    root.render(createElement(ChakraProvider, { value: defaultSystem }, node));
  });
}

async function press(element: HTMLElement, key: string) {
  await act(async () => {
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  });
  await act(async () => {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
}

function tabs(props: Parameters<typeof DocsTabs.Root>[0] = {}) {
  return createElement(
    DocsTabs.Root,
    { defaultValue: 'C++', ...props },
    createElement(
      DocsTabs.List,
      { slotProps: { 'aria-label': 'Language' } },
      ...['C++', 'C#', 'Rust'].map((value) =>
        createElement(DocsTabs.Trigger, { key: value, value }, value),
      ),
    ),
    ...['C++', 'C#', 'Rust'].map((value) =>
      createElement(
        DocsTabs.Content,
        { key: value, value },
        `${value} example`,
      ),
    ),
  );
}

describe('DocsTabs interactions', () => {
  it('uses unique relationships, roving focus, arrows, Home, and End', async () => {
    await render(tabs());
    const triggers = [
      ...container.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    ];
    const panels = [
      ...container.querySelectorAll<HTMLElement>('[role="tabpanel"]'),
    ];
    expect(new Set([...triggers, ...panels].map((node) => node.id)).size).toBe(
      6,
    );
    triggers.forEach((trigger, index) => {
      expect(panels[index].getAttribute('aria-labelledby')).toBe(trigger.id);
    });
    expect(triggers[0].getAttribute('aria-controls')).toBe(panels[0].id);
    expect(triggers.map((node) => node.tabIndex)).toEqual([0, -1, -1]);

    await act(async () => triggers[0].focus());
    await press(triggers[0], 'ArrowRight');
    expect(document.activeElement).toBe(triggers[1]);
    expect(triggers[1].getAttribute('aria-selected')).toBe('true');
    expect(triggers[1].getAttribute('aria-controls')).toBe(panels[1].id);
    expect(panels.map((node) => node.hidden)).toEqual([true, false, true]);
    expect(triggers.map((node) => node.tabIndex)).toEqual([-1, 0, -1]);
    await press(triggers[1], 'End');
    expect(document.activeElement).toBe(triggers[2]);
    await press(triggers[2], 'ArrowRight');
    expect(document.activeElement).toBe(triggers[0]);
    await press(triggers[0], 'ArrowLeft');
    expect(document.activeElement).toBe(triggers[2]);
    await press(triggers[2], 'Home');
    expect(document.activeElement).toBe(triggers[0]);
  });

  it('retains controlled selection and notifies the consumer', async () => {
    const onValueChange = vi.fn();
    await render(tabs({ value: 'C++', onValueChange }));
    const triggers =
      container.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    await act(async () => triggers[1].click());
    expect(onValueChange).toHaveBeenCalledWith('C#');
    expect(triggers[0].getAttribute('aria-selected')).toBe('true');
    await render(tabs({ value: 'C#', onValueChange }));
    expect(triggers[1].getAttribute('aria-selected')).toBe('true');
  });

  it('keeps independent groups synchronized after keyboard selection', async () => {
    await render(
      createElement(
        'div',
        null,
        tabs({ syncKey: 'interaction-languages' }),
        tabs({ syncKey: 'interaction-languages' }),
      ),
    );
    const triggers =
      container.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    await act(async () => triggers[0].focus());
    await press(triggers[0], 'ArrowRight');
    expect(triggers[1].getAttribute('aria-selected')).toBe('true');
    expect(triggers[4].getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(triggers[1]);
  });
});
