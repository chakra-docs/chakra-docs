import { Fragment, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, test, vi } from 'vitest';
import { SiteMetadata } from './site-metadata';
import { OG_IMAGE_DEFAULTS } from '../lib/og-image';

vi.mock('next/head.js', () => ({
  default: ({ children }: { children: ReactNode }) => (
    <Fragment>{children}</Fragment>
  ),
}));

afterEach(() => vi.unstubAllEnvs());

function render(props: Parameters<typeof SiteMetadata>[0]) {
  return new DOMParser().parseFromString(
    renderToStaticMarkup(<SiteMetadata {...props} />),
    'text/html',
  );
}

test('renders one branded title, canonical, social card, and PNG through next-meta', () => {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://chakra-docs.dev');
  const doc = render({
    title: 'Installation - Chakra Docs',
    description: 'Install the packages.',
    path: '/docs/installation/?private=value#install',
    article: true,
  });
  expect(doc.querySelectorAll('title')).toHaveLength(1);
  expect(doc.title).toBe('Installation - Chakra Docs');
  expect(doc.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
  expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
    'https://chakra-docs.dev/docs/installation',
  );
  const content = (selector: string) =>
    doc.querySelector(selector)?.getAttribute('content');
  expect(content('meta[property="og:site_name"]')).toBe('Chakra Docs');
  expect(content('meta[property="og:title"]')).toBe(doc.title);
  expect(content('meta[property="og:type"]')).toBe('article');
  expect(content('meta[property="og:image"]')).toBe(
    'https://chakra-docs.dev/api/social-image',
  );
  expect(content('meta[property="og:image:width"]')).toBe('1200');
  expect(content('meta[property="og:image:height"]')).toBe('630');
  expect(content('meta[property="og:image:type"]')).toBe('image/png');
  expect(content('meta[name="twitter:image"]')).toBe(
    'https://chakra-docs.dev/api/social-image',
  );
  expect(content('meta[name="twitter:card"]')).toBe('summary_large_image');
  expect(content('meta[name="twitter:creator"]')).toBe('@ryanhefner');
  expect(content('meta[name="description"]')).toBe('Install the packages.');
});

test('preserves description fallback and omits public URLs without a configured origin', () => {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
  vi.stubEnv('CHAKRA_DOCS_REQUIRE_SITE_URL', 'false');
  const doc = render({ title: 'Chakra Docs', path: '/' });
  expect(
    doc.querySelector('meta[name="description"]')?.getAttribute('content'),
  ).toBe(OG_IMAGE_DEFAULTS.description);
  expect(
    doc.querySelector('meta[property="og:type"]')?.getAttribute('content'),
  ).toBe('website');
  expect(doc.querySelector('link[rel="canonical"]')).toBeNull();
  expect(doc.querySelector('meta[property="og:image"]')).toBeNull();
  expect(doc.querySelector('meta[name="twitter:image"]')).toBeNull();
});

test.each([
  '//attacker.example/path',
  '/\\attacker.example/path',
  'https://attacker.example/path',
])('retains canonical path validation for %s', (path) => {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://chakra-docs.dev');
  expect(() => render({ title: 'Chakra Docs', path })).toThrow(
    'Canonical paths must be local absolute paths.',
  );
});
