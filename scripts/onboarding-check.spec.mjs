import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  extractQuickstart,
  validateReadmeAttribution,
  validateSiteUrl,
} from './onboarding-check.mjs';
import {
  discoveryLinkTargets,
  hasExactLink,
  markdownLinkTargets,
} from './documentation-links.mjs';

const example =
  '<!-- quickstart:start -->\n```tsx\nexport default () => <h1>Hello</h1>;\n```\n<!-- quickstart:end -->';
test('onboarding examples are extracted unchanged with explicit TS/TSX boundaries', () => {
  assert.deepEqual(extractQuickstart(example, 'README.md'), {
    language: 'tsx',
    source: 'export default () => <h1>Hello</h1>;\n',
  });
  assert.equal(
    extractQuickstart(example.replaceAll('\n', '\r\n'), 'README.md').language,
    'tsx',
  );
  assert.equal(
    extractQuickstart(example.replace('```tsx', '```ts'), 'README.md').language,
    'ts',
  );
  for (const source of [
    '',
    example + example,
    example.replace('quickstart:end', 'missing'),
    example.replace('```tsx', '```sh'),
    example.replace('export default () => <h1>Hello</h1>;', ''),
  ]) {
    assert.throws(() => extractQuickstart(source, 'README.md'), /README\.md/);
  }
});

test('homepage checks require canonical hosts, real routes, and real heading fragments', () => {
  const manifest = {
    byRoute: { '/docs/guide': { headings: [{ id: 'install' }] } },
  };
  validateSiteUrl(
    'https://chakra-docs.dev/docs/guide#install',
    manifest,
    'test',
  );
  validateSiteUrl('https://chakra-docs.dev/showcase', manifest, 'test');
  for (const href of [
    'https://evil.example/docs/guide',
    'http://chakra-docs.dev/docs/guide',
    'https://user@chakra-docs.dev/docs/guide',
    'https://chakra-docs.dev/docs/missing',
    'https://chakra-docs.dev/docs/guide#missing',
    'https://chakra-docs.dev/#invented',
  ]) {
    assert.throws(() => validateSiteUrl(href, manifest, 'test'));
  }
});

test('URL checks compare complete parsed URLs rather than substrings', () => {
  const expected = 'https://chakra-docs.dev/docs/app-router';
  assert.equal(hasExactLink([expected], expected), true);
  assert.equal(
    hasExactLink(['https://CHAKRA-DOCS.dev:443/docs/app-router'], expected),
    true,
  );
  for (const href of [
    'https://chakra-docs.dev.evil.example/docs/app-router',
    'https://evil.example/https://chakra-docs.dev/docs/app-router',
    'https://evil.example/?next=https://chakra-docs.dev/docs/app-router',
    'https://evil.example/#https://chakra-docs.dev/docs/app-router',
    'https://chakra-docs.dev@evil.example/docs/app-router',
    'https://user@chakra-docs.dev/docs/app-router',
    'http://chakra-docs.dev/docs/app-router',
    'https://chakra-docs.dev:444/docs/app-router',
    `${expected}-other`,
    `${expected}?next=other`,
    `${expected}#other`,
    'not a URL',
  ]) {
    assert.equal(hasExactLink([href], expected), false, href);
  }
});

test('attribution requires actual canonical links outside example fences', () => {
  const credits =
    '[Ryan](https://www.ryanhefner.com) and [Commune](https://commune.software)';
  validateReadmeAttribution(credits, 'fixture');
  validateReadmeAttribution(
    credits
      .replaceAll('.com)', '.com/)')
      .replaceAll('.software)', '.software/)'),
    'fixture',
  );
  for (const markdown of [
    '',
    'https://www.ryanhefner.com https://commune.software',
    `\`\`\`md\n${credits}\n\`\`\``,
    credits.replace(
      'https://www.ryanhefner.com',
      'https://www.ryanhefner.com.evil.example',
    ),
    credits.replace(
      'https://commune.software',
      'https://evil.example/?next=https://commune.software',
    ),
    credits.replace(
      'https://commune.software',
      'https://user@commune.software',
    ),
  ]) {
    assert.throws(
      () => validateReadmeAttribution(markdown, 'fixture'),
      /attribution link/,
    );
  }
  assert.deepEqual(
    markdownLinkTargets(`\`\`\`md\n${credits}\n\`\`\`\n${credits}`),
    ['https://www.ryanhefner.com', 'https://commune.software'],
  );
});

test('discovery checks extract complete XML, Markdown, and source-line destinations', () => {
  const expected = 'https://chakra-docs.dev/docs/app-router';
  const formats = [
    [
      'sitemap.xml',
      (href) =>
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${href}</loc></url></urlset>`,
    ],
    ['llms.txt', (href) => `[App Router](${href})`],
    ['llms-full.txt', (href) => `## App Router\n\nSource: ${href}\n`],
  ];
  for (const [filename, render] of formats) {
    assert.equal(
      hasExactLink(discoveryLinkTargets(render(expected), filename), expected),
      true,
      filename,
    );
    for (const href of [
      `https://evil.example/${expected}`,
      'https://chakra-docs.dev.evil.example/docs/app-router',
      `${expected}-other`,
    ]) {
      assert.equal(
        hasExactLink(discoveryLinkTargets(render(href), filename), expected),
        false,
        `${filename}: ${href}`,
      );
    }
  }
  assert.deepEqual(
    discoveryLinkTargets(
      `<urlset><!-- ${expected} --></urlset>`,
      'sitemap.xml',
    ),
    [],
  );
  assert.deepEqual(
    discoveryLinkTargets(`Only prose: ${expected}`, 'llms.txt'),
    [],
  );
  assert.deepEqual(
    discoveryLinkTargets(`[not a source](${expected})`, 'llms-full.txt'),
    [],
  );
  assert.throws(() => discoveryLinkTargets('<broken>', 'sitemap.xml'));
  assert.throws(
    () => discoveryLinkTargets('', 'unknown.txt'),
    /Unsupported discovery/,
  );
});
