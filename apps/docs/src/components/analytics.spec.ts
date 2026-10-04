import { act, createElement, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { FathomProvider } from 'react-fathom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { Analytics, DocsPageviewTracker, useDocsAnalytics } from './analytics';

const router = vi.hoisted(() => ({ asPath: '/docs', isReady: true }));
vi.mock('next/router', () => ({ useRouter: () => router }));

const client = {
  blockTrackingForMe: vi.fn(),
  enableTrackingForMe: vi.fn(),
  isTrackingEnabled: vi.fn(() => true),
  load: vi.fn(),
  setSite: vi.fn(),
  trackEvent: vi.fn(),
  trackGoal: vi.fn(),
  trackPageview: vi.fn(),
};
let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.clearAllMocks();
  router.asPath = '/docs';
  router.isReady = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const renderTracker = () =>
  act(() =>
    root.render(
      createElement(
        StrictMode,
        null,
        createElement(
          FathomProvider,
          { client },
          createElement(DocsPageviewTracker),
        ),
      ),
    ),
  );

test('the public root provider shares its client with pageview and docs-event hooks', async () => {
  await renderTracker();
  expect(client.trackPageview).toHaveBeenCalledExactlyOnceWith({
    url: 'https://chakra-docs.dev/docs',
  });

  function EventButton() {
    const analytics = useDocsAnalytics();
    return createElement(
      'button',
      { onClick: () => analytics.onSearchOpen?.() },
      'Search',
    );
  }
  await act(() =>
    root.render(
      createElement(FathomProvider, { client }, createElement(EventButton)),
    ),
  );
  const button = container.querySelector('button');
  expect(button).not.toBeNull();
  await act(() => button?.click());
  expect(client.trackEvent).toHaveBeenCalledExactlyOnceWith(
    'docs-search-open',
    {},
  );
});

test('tracking waits for router readiness and deduplicates private query/hash changes', async () => {
  router.isReady = false;
  await renderTracker();
  expect(client.trackPageview).not.toHaveBeenCalled();
  router.isReady = true;
  router.asPath = '/docs?secret=token#heading';
  await renderTracker();
  router.asPath = '/docs?another=token#other';
  await renderTracker();
  expect(client.trackPageview).toHaveBeenCalledExactlyOnceWith({
    url: 'https://chakra-docs.dev/docs',
  });

  router.asPath = '/docs/installation';
  await renderTracker();
  router.asPath = '/docs';
  await renderTracker();
  expect(
    client.trackPageview.mock.calls.map(([options]) => options.url),
  ).toEqual([
    'https://chakra-docs.dev/docs',
    'https://chakra-docs.dev/docs/installation',
    'https://chakra-docs.dev/docs',
  ]);
});

test('capture routes are never tracked, but returning to docs is tracked', async () => {
  for (const asPath of [
    '/og-image',
    '/og-image/docs/installation',
    '/docs/social-image',
    '/docs/social-image.png',
  ]) {
    router.asPath = asPath;
    await renderTracker();
  }
  expect(client.trackPageview).not.toHaveBeenCalled();
  router.asPath = '/docs';
  await renderTracker();
  expect(client.trackPageview).toHaveBeenCalledTimes(1);
});

test('an absent site ID leaves analytics disabled', async () => {
  vi.stubEnv('NEXT_PUBLIC_FATHOM_SITE_ID', '');
  await act(() =>
    root.render(
      createElement(Analytics, null, createElement('p', null, 'Docs')),
    ),
  );
  expect(container.textContent).toBe('Docs');
  expect(document.querySelector('script[src*="fathom"]')).toBeNull();
  expect(client.trackPageview).not.toHaveBeenCalled();
});
