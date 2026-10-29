import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractQuickstart, validateSiteUrl } from './onboarding-check.mjs';

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
