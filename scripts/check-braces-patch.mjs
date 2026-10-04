import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { parse } from 'yaml';

const root = path.resolve(import.meta.dirname, '..');
const patchPath = 'patches/braces@3.0.3.patch';
const patchHash =
  '9e207104471995e0cb49be3ad8d07dc238aa8dcf5bd3e127e5338d452ef1767d';
const depthError = /Brace nesting exceeds maximum depth \(128\)/;

/** Audit acceptance requires both the locked patch and its installed behavior. */
export function checkBracesPatch() {
  const read = (file) => readFileSync(path.join(root, file), 'utf8');
  const settings = parse(read('pnpm-workspace.yaml'));
  const lock = parse(read('pnpm-lock.yaml'));
  assert.equal(settings.patchedDependencies?.['braces@3.0.3'], patchPath);
  assert.equal(
    createHash('sha256').update(read(patchPath)).digest('hex'),
    patchHash,
  );
  assert.equal(lock.patchedDependencies?.['braces@3.0.3'], patchHash);
  assert.deepEqual(
    Object.keys(lock.packages).filter((key) => key.startsWith('braces@')),
    ['braces@3.0.3'],
  );
  assert.deepEqual(
    Object.keys(lock.snapshots).filter((key) => key.startsWith('braces@')),
    [`braces@3.0.3(patch_hash=${patchHash})`],
  );

  // Resolve the real transitive copy used by Next's lint tooling, not a test mock.
  const require = createRequire(path.join(root, 'package.json'));
  const nextRequire = createRequire(
    require.resolve('@next/eslint-plugin-next'),
  );
  const globRequire = createRequire(nextRequire.resolve('fast-glob'));
  const matchRequire = createRequire(globRequire.resolve('micromatch'));
  const braces = matchRequire('braces');
  assert.equal(matchRequire('braces/package.json').version, '3.0.3');

  for (const pattern of [
    '{'.repeat(2000) + 'a,b' + '}'.repeat(2000),
    '{'.repeat(2000) + 'a,b',
    '('.repeat(2000) + 'x' + ')'.repeat(2000),
    '{('.repeat(1000) + 'a,b' + ')}'.repeat(1000),
    '{'.repeat(2000) + '1..3,a' + '}'.repeat(2000),
  ]) {
    for (const method of [
      'parse',
      'create',
      'compile',
      'expand',
      'stringify',
    ]) {
      assert.throws(
        () => braces[method](pattern),
        depthError,
        `${method} must reject deep patterns before recursive traversal`,
      );
    }
  }

  // AST overloads bypass parsing and need their own walker depth limits.
  for (const method of ['compile', 'expand', 'stringify']) {
    let ast = { type: 'text', value: 'x', nodes: [] };
    for (let i = 0; i < 2000; i++) ast = { type: 'root', nodes: [ast] };
    assert.throws(() => braces[method](ast), depthError);
    const cyclic = { type: 'root', nodes: [] };
    cyclic.nodes.push(cyclic);
    assert.throws(() => braces[method](cyclic), depthError);
  }

  assert.equal(
    braces.compile('src/{pages,components}/**/*.{ts,tsx}'),
    'src/(pages|components)/**/*.(ts|tsx)',
  );
  assert.deepEqual(braces.expand('a/{b,{c,d}}'), ['a/b', 'a/c', 'a/d']);
  assert.deepEqual(braces.expand('file-{1..3}'), [
    'file-1',
    'file-2',
    'file-3',
  ]);
  assert.equal(braces.stringify(braces.parse('a/{b,{c,d}}')), 'a/{b,{c,d}}');
  assert.doesNotThrow(() => braces.compile('\\{'.repeat(2000)));
  assert.doesNotThrow(() => braces.compile('"' + '{'.repeat(2000) + '"'));
  assert.doesNotThrow(() =>
    braces.compile('{'.repeat(127) + 'a,b' + '}'.repeat(127)),
  );
  return true;
}
