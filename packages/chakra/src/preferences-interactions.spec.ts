// @vitest-environment jsdom

import { act, createElement } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import * as ChakraRuntime from '@chakra-ui/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocsPreferenceStorage } from '@chakra-docs/core';
import {
  DocsPreferences,
  DocsProvider,
  DocsTabs,
  createDocsLocalPreferenceStorage,
  useDocsPreference,
  useDocsPreferences,
} from './index.js';

const { ChakraProvider, defaultSystem } = ChakraRuntime as unknown as {
  ChakraProvider: ComponentType<{ value: unknown; children?: ReactNode }>;
  defaultSystem: unknown;
};

const definitions = [
  {
    id: 'package-manager',
    label: 'Package manager',
    options: ['npm', 'pnpm', { value: 'yarn', label: 'Yarn' }],
    defaultValue: 'npm',
  },
  {
    id: 'api-style',
    label: 'API style',
    options: ['rest', 'graphql'],
    defaultValue: 'rest',
  },
] as const;

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
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

function preferenceContent(props: {
  storage?: DocsPreferenceStorage | 'local' | false;
  values?: Readonly<Record<string, string>>;
  onValuesChange?: (values: Readonly<Record<string, string>>) => void;
  onPreferenceChange?: (event: unknown) => void;
  onStorageError?: (details: unknown) => void;
}) {
  return createElement(
    DocsPreferences.Root,
    { definitions, ...props },
    createElement(DocsPreferences.Select, {
      preference: 'package-manager',
    }),
    createElement(
      DocsPreferences.When,
      { preference: 'package-manager', value: 'npm' },
      'npm install package',
    ),
    createElement(
      DocsPreferences.When,
      { preference: 'package-manager', value: ['pnpm', 'yarn'] },
      'alternative install',
    ),
    createElement(PreferenceProbe),
  );
}

function PreferenceProbe() {
  const preference = useDocsPreference('package-manager');
  const preferences = useDocsPreferences();
  return createElement(
    'div',
    null,
    createElement('output', {
      'data-value': preference.value,
      'data-hydrated': String(preference.hydrated),
    }),
    createElement(
      'button',
      { type: 'button', onClick: preference.reset },
      'Reset package manager',
    ),
    createElement(
      'button',
      { type: 'button', onClick: () => preferences.reset() },
      'Reset all',
    ),
  );
}

function preferenceTabs(values: readonly string[], defaultValue?: string) {
  return createElement(
    DocsTabs.Root,
    { preference: 'package-manager', defaultValue },
    createElement(
      DocsTabs.List,
      { slotProps: { 'aria-label': 'Package manager examples' } },
      ...values.map((value) =>
        createElement(DocsTabs.Trigger, { key: value, value }, value),
      ),
    ),
    ...values.map((value) =>
      createElement(
        DocsTabs.Content,
        { key: value, value },
        `${value} install`,
      ),
    ),
  );
}

async function select(value: string) {
  const field = container.querySelector('select');
  expect(field).not.toBeNull();
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLSelectElement.prototype,
      'value',
    )?.set?.call(field, value);
    field?.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

describe('DocsPreferences', () => {
  it('renders an accessible selector and switches persistent content', async () => {
    const onPreferenceChange = vi.fn();
    const analytics = vi.fn();
    await render(
      createElement(
        DocsProvider,
        { config: { analytics: { onPreferenceChange: analytics } } },
        preferenceContent({ onPreferenceChange }),
      ),
    );

    const field = container.querySelector('select');
    const label = container.querySelector('label');
    expect(label?.textContent).toBe('Package manager');
    expect(label?.htmlFor).toBe(field?.id);
    expect(field?.value).toBe('npm');
    expect(
      [...(field?.options ?? [])].map((option) => option.textContent),
    ).toEqual(['npm', 'pnpm', 'Yarn']);
    expect(container.textContent).toContain('npm install package');
    expect(
      [...container.querySelectorAll('[hidden]')].some((node) =>
        node.textContent?.includes('alternative install'),
      ),
    ).toBe(true);

    await select('pnpm');
    expect(field?.value).toBe('pnpm');
    expect(container.querySelector('output')?.getAttribute('data-value')).toBe(
      'pnpm',
    );
    expect(onPreferenceChange).toHaveBeenCalledWith({
      id: 'package-manager',
      value: 'pnpm',
      previousValue: 'npm',
      source: 'selector',
    });
    expect(analytics).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'pnpm', source: 'selector' }),
    );
  });

  it('retains controlled values while requesting updates', async () => {
    const onValuesChange = vi.fn();
    await render(
      preferenceContent({
        values: { 'package-manager': 'npm', 'api-style': 'rest' },
        onValuesChange,
      }),
    );
    await select('yarn');
    expect(container.querySelector('select')?.value).toBe('npm');
    expect(onValuesChange).toHaveBeenCalledWith({
      'package-manager': 'yarn',
      'api-style': 'rest',
    });
  });

  it('hydrates valid stored values and ignores invalid dimensions', async () => {
    const storage: DocsPreferenceStorage = {
      get: vi.fn(async (id) => (id === 'package-manager' ? 'yarn' : 'invalid')),
      set: vi.fn(),
      remove: vi.fn(),
    };
    const onPreferenceChange = vi.fn();
    await render(preferenceContent({ storage, onPreferenceChange }));
    await act(async () => {
      await Promise.resolve();
    });

    const output = container.querySelector('output');
    expect(output?.getAttribute('data-value')).toBe('yarn');
    expect(output?.getAttribute('data-hydrated')).toBe('true');
    expect(onPreferenceChange).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'yarn', source: 'storage' }),
    );

    await act(async () => {
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent === 'Reset package manager')
        ?.click();
    });
    expect(storage.remove).toHaveBeenCalledWith('package-manager');
    expect(output?.getAttribute('data-value')).toBe('npm');
  });

  it('does not let slow storage overwrite a user selection', async () => {
    let resolveStored: ((value: string) => void) | undefined;
    const storage: DocsPreferenceStorage = {
      get: (id) =>
        id === 'package-manager'
          ? new Promise<string>((resolve) => {
              resolveStored = resolve;
            })
          : null,
      set: vi.fn(),
    };
    await render(preferenceContent({ storage }));
    await select('pnpm');
    await act(async () => resolveStored?.('yarn'));
    expect(container.querySelector('select')?.value).toBe('pnpm');
    expect(storage.set).toHaveBeenCalledWith('package-manager', 'pnpm');
  });

  it('reports synchronous storage failures without breaking selection', async () => {
    const onStorageError = vi.fn();
    const storage: DocsPreferenceStorage = {
      get: () => null,
      set: () => {
        throw new Error('storage denied');
      },
    };
    await render(preferenceContent({ storage, onStorageError }));
    await select('pnpm');
    expect(container.querySelector('select')?.value).toBe('pnpm');
    expect(onStorageError).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'package-manager', operation: 'set' }),
    );
  });

  it('creates a prefixed local storage adapter', async () => {
    const values = new Map<string, string>();
    const storage = createDocsLocalPreferenceStorage({
      prefix: 'docs.choice',
      storage: {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => {
          values.set(key, value);
        },
        removeItem: (key) => {
          values.delete(key);
        },
      },
    });
    await storage.set('language', 'typescript');
    expect(values.get('docs.choice.language')).toBe('typescript');
    expect(await storage.get('language')).toBe('typescript');
    await storage.remove?.('language');
    expect(await storage.get('language')).toBeNull();
  });

  it('binds tab groups while retaining a local fallback for subsets', async () => {
    const onPreferenceChange = vi.fn();
    const storage: DocsPreferenceStorage = {
      get: () => null,
      set: vi.fn(),
    };
    await render(
      createElement(
        DocsPreferences.Root,
        {
          definitions,
          defaultValues: {
            'package-manager': 'yarn',
            'api-style': 'rest',
          },
          storage,
          onPreferenceChange,
        },
        createElement(PreferenceProbe),
        preferenceTabs(['npm', 'pnpm'], 'npm'),
        preferenceTabs(['npm', 'pnpm', 'yarn']),
      ),
    );
    await act(async () => {
      await Promise.resolve();
    });

    const triggers = [
      ...container.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    ];
    expect(
      triggers.map((trigger) => trigger.getAttribute('aria-selected')),
    ).toEqual(['true', 'false', 'false', 'false', 'true']);
    expect(container.querySelector('output')?.getAttribute('data-value')).toBe(
      'yarn',
    );
    expect(onPreferenceChange).not.toHaveBeenCalled();

    await act(async () => triggers[1].click());
    expect(container.querySelector('output')?.getAttribute('data-value')).toBe(
      'pnpm',
    );
    expect(triggers[1].getAttribute('aria-selected')).toBe('true');
    expect(triggers[3].getAttribute('aria-selected')).toBe('true');
    expect(storage.set).toHaveBeenCalledWith('package-manager', 'pnpm');
    expect(onPreferenceChange).toHaveBeenCalledWith({
      id: 'package-manager',
      value: 'pnpm',
      previousValue: 'yarn',
      source: 'tabs',
    });
  });
});
