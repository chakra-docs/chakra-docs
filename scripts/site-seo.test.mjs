import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createSitemapEntries } from '@chakra-docs/core';
import {
  canonicalUrl,
  createSiteRobots,
  createSiteSitemap,
} from '../apps/docs/src/lib/site-seo.ts';

const origin = 'https://chakra-docs.dev';
const read = (file) =>
  readFileSync(new URL(`../apps/docs/${file}`, import.meta.url), 'utf8');

test('canonical URLs remove tracking, fragments, and trailing slashes without accepting foreign hosts', () => {
  assert.equal(
    canonicalUrl('/docs/installation/?utm_source=test#install', origin),
    `${origin}/docs/installation`,
  );
  assert.equal(canonicalUrl('/', origin), `${origin}/`);
  for (const path of [
    '//evil.example/page',
    '/\\evil.example/page',
    'https://evil.example/page',
    'docs',
  ]) {
    assert.throws(() => canonicalUrl(path, origin));
  }
});

test('sitemap includes public site pages and published docs, deduplicates and XML-escapes URLs', () => {
  const page = (route, frontmatter = {}) => ({
    id: route,
    title: route,
    route,
    path: '',
    slug: [],
    frontmatter,
  });
  const entries = createSitemapEntries(
    [
      page('/docs'),
      page('/docs/installation'),
      page('/docs/installation/'),
      page('/docs/draft', { draft: true }),
      page('/docs/hidden', { hidden: true }),
      page('/docs/a&b'),
    ],
    {},
  );
  const xml = createSiteSitemap(
    origin,
    entries.map(({ url }) => url),
  );
  for (const path of [
    '/',
    '/showcase',
    '/withoss',
    '/docs',
    '/docs/installation',
  ]) {
    assert.ok(xml.includes(`<loc>${origin}${path}</loc>`));
  }
  assert.equal(
    xml.match(/<loc>https:\/\/chakra-docs.dev\/docs\/installation<\/loc>/g)
      .length,
    1,
  );
  assert.match(xml, /a&amp;b/);
  assert.doesNotMatch(xml, /draft|hidden|og-image|\/404|\/api\//);
});

test('robots advertises the sitemap and allows the PNG card but excludes API and capture pages', () => {
  const robots = createSiteRobots(origin);
  assert.match(robots, /Sitemap: https:\/\/chakra-docs.dev\/sitemap.xml/);
  assert.match(robots, /Allow: \/api\/social-image/);
  assert.match(robots, /Disallow: \/api\//);
  assert.match(robots, /Disallow: \/og-image/);
  assert.equal(createSiteRobots(undefined), 'User-agent: *\nDisallow: /\n');
});

test('public pages share complete social metadata while error and capture pages stay noindex', () => {
  const ci = readFileSync(
    new URL('../.github/workflows/ci.yml', import.meta.url),
    'utf8',
  );
  assert.match(ci, /NEXT_PUBLIC_SITE_URL: https:\/\/chakra-docs.dev/);
  assert.match(ci, /CHAKRA_DOCS_REQUIRE_SITE_URL: 'true'/);
  for (const path of [
    'index.tsx',
    'showcase.tsx',
    'withoss.tsx',
    'docs/[[...slug]].tsx',
  ]) {
    assert.match(read(`src/pages/${path}`), /<SiteMetadata/);
  }
  const component = read('src/components/site-metadata.tsx');
  for (const name of [
    'canonical',
    'og:title',
    'og:description',
    'og:url',
    'og:image',
    'twitter:card',
    'twitter:image',
  ]) {
    assert.ok(component.includes(`"${name}"`));
  }
  assert.match(component, /\/api\/social-image/);
  assert.match(read('src/pages/404.tsx'), /content="noindex"/);
  assert.match(read('src/pages/og-image/[[...slug]].tsx'), /noindex, nofollow/);
  assert.match(read('src/pages/api/social-image.tsx'), /new ImageResponse/);
  assert.match(
    read('next.config.js'),
    /'\/sitemap.xml': \['src\/content\/docs\/\*\*\/\*'\]/,
  );
});

test('Vercel installs the frozen workspace and builds Next with a required canonical origin', () => {
  const config = JSON.parse(read('vercel.json'));
  assert.equal(config.framework, 'nextjs');
  assert.equal(
    config.installCommand,
    'cd ../.. && corepack enable && pnpm install --frozen-lockfile',
  );
  assert.equal(
    config.buildCommand,
    'cd ../.. && CHAKRA_DOCS_REQUIRE_SITE_URL=true pnpm nx run docs:build',
  );
  assert.equal(config.outputDirectory, '.next');
  assert.match(
    read('.env.example'),
    /NEXT_PUBLIC_SITE_URL=https:\/\/chakra-docs.dev/,
  );
  assert.doesNotMatch(read('next.config.js'), /output:\s*['"]export/);
});
