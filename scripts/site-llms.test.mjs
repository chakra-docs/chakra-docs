import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getDocsManifest } from '../apps/docs/src/docs/manifest.ts';
import { createSiteLlmsText } from '../apps/docs/src/lib/llms.ts';

test('LLM documents include every published page, canonical links, and source Markdown', async () => {
  const manifest = await getDocsManifest();
  const origin = 'https://chakra-docs.dev';
  const index = createSiteLlmsText(manifest, origin);
  const full = createSiteLlmsText(manifest, origin, true);
  assert.match(index, /^# Chakra Docs\n/);
  assert.ok(index.includes(`${origin}/llms-full.txt`));
  for (const page of manifest.pages) {
    if (page.frontmatter.draft || page.frontmatter.hidden) continue;
    assert.ok(index.includes(`](${origin}${page.route})`), page.route);
    assert.ok(full.includes(`Source: ${origin}${page.route}`), page.route);
    assert.ok(full.includes(page.body.trim()), page.route);
  }
  const privatePages = ['draft', 'hidden'].map((flag) => ({
    ...manifest.pages[0],
    id: flag,
    route: `/docs/${flag}`,
    frontmatter: { [flag]: true },
    body: `private-${flag}-body`,
  }));
  const withPrivatePages = {
    ...manifest,
    pages: [...manifest.pages, ...privatePages],
  };
  for (const full of [false, true]) {
    assert.doesNotMatch(
      createSiteLlmsText(withPrivatePages, origin, full),
      /private-(draft|hidden)-body|\/docs\/(draft|hidden)/,
    );
  }
});

test('both serverless LLM routes trace documentation sources and serve text', () => {
  const read = (path) =>
    readFileSync(new URL(`../apps/docs/${path}`, import.meta.url), 'utf8');
  for (const route of ['llms.txt', 'llms-full.txt']) {
    assert.ok(
      read('next.config.js').includes(`'/${route}': ['src/content/docs/**/*']`),
    );
    const source = read(`src/pages/${route}.ts`);
    assert.match(source, /text\/plain; charset=utf-8/);
    assert.match(source, /getPublicSiteUrl\(\)/);
    assert.match(source, /notFound: true/);
  }
});
