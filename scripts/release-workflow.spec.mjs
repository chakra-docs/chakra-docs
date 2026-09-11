import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const workspaceRoot = path.resolve(import.meta.dirname, '..');
const releaseWorkflow = await read('.github/workflows/release.yml');
const publishedVersionVerifier = await read(
  'scripts/verify-published-version.mjs',
);
const nxConfig = JSON.parse(await read('nx.json'));
const releaseProjects = new Set(nxConfig.release?.projects ?? []);
const packageDirectories = await readdir(path.join(workspaceRoot, 'packages'), {
  withFileTypes: true,
});
const publicPackages = [];

for (const directory of packageDirectories) {
  if (!directory.isDirectory()) continue;

  const manifest = JSON.parse(
    await read(path.join('packages', directory.name, 'package.json')),
  );
  if (manifest.private !== true) publicPackages.push(manifest);
}

const versions = new Set(publicPackages.map(({ version }) => version));
const [committedVersion] = versions;

test('packed consumers include pinned DOM declarations without weakening compatibility checks', async () => {
  const manifest = JSON.parse(await read('package.json'));
  const lock = JSON.parse(await read('package-lock.json'));
  const domTypes = lock.packages['node_modules/@typescript/lib-dom'];
  assert.equal(
    manifest.devDependencies['@typescript/lib-dom'],
    `npm:@types/web@${domTypes.version}`,
  );
  assert.equal(
    lock.packages[''].devDependencies['@typescript/lib-dom'],
    manifest.devDependencies['@typescript/lib-dom'],
  );

  const smoke = await read('scripts/release-smoke.mjs');
  assert.match(smoke, /dependencies\['@typescript\/lib-dom'\]/);
  assert.match(smoke, /'@types\/node': '22\.20\.1'/);
  assert.match(smoke, /skipLibCheck: false/);
  const ci = await read('.github/workflows/ci.yml');
  assert.match(ci, /node-version-file: '\.nvmrc'/);
  assert.match(ci, /node-version: '22\.22\.0'/);
  assert.match(ci, /CHAKRA_DOCS_PEER_PROFILE: minimum/);
});

test('docs Postkit dependencies resolve from the registry without yalc', async () => {
  const manifest = JSON.parse(await read('apps/docs/package.json'));
  const lock = JSON.parse(await read('package-lock.json'));
  const version = manifest.dependencies['@postkit/react'];
  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.equal(
    lock.packages['apps/docs'].dependencies['@postkit/react'],
    version,
  );
  for (const name of ['react', 'core', 'unfurl']) {
    const entry = lock.packages[`node_modules/@postkit/${name}`];
    assert.equal(entry.version, version);
    assert.equal(
      entry.resolved,
      `https://registry.npmjs.org/@postkit/${name}/-/${name}-${version}.tgz`,
    );
    assert.ok(entry.integrity);
    assert.notEqual(entry.link, true);
  }
});

test('all public packages form one fixed, committed release group', () => {
  assert.equal(publicPackages.length, 12);
  assert.deepEqual(
    [...releaseProjects].sort(),
    publicPackages.map(({ name }) => name).sort(),
  );
  assert.equal(versions.size, 1);
  assert.match(committedVersion, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
  assert.notEqual(committedVersion, '0.0.0');

  for (const manifest of publicPackages) {
    for (const field of [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'optionalDependencies',
    ]) {
      for (const [dependency, range] of Object.entries(manifest[field] ?? {})) {
        if (releaseProjects.has(dependency)) {
          assert.equal(
            range,
            committedVersion,
            `${manifest.name} must pin ${dependency} to the fixed version`,
          );
        }
      }
    }
  }
});

test('release version validation accepts only the committed stable version', () => {
  const valid = runVersionAssertion(committedVersion);
  assert.equal(valid.status, 0, valid.stderr);
  assert.match(
    valid.stdout,
    new RegExp(
      `Validated ${publicPackages.length} committed packages at ${escapeRegex(committedVersion)}`,
    ),
  );

  for (const invalidVersion of ['', 'patch', '1.2', '1.2.3-beta.1']) {
    const result = runVersionAssertion(invalidVersion);
    assert.notEqual(result.status, 0, `${invalidVersion} must be rejected`);
    assert.match(result.stderr, /exact stable semantic version/);
  }

  const otherVersion =
    committedVersion === '99.99.99' ? '99.99.98' : '99.99.99';
  const mismatch = runVersionAssertion(otherVersion);
  assert.notEqual(mismatch.status, 0);
  assert.match(mismatch.stderr, /committed package version/);
});

test('release workflow publishes an immutable, CI-verified commit', () => {
  assert.match(
    releaseWorkflow,
    /version:\n\s+description: 'Exact package version already committed/,
  );
  assert.match(releaseWorkflow, /head_sha="\$VERIFIED_SHA"/);
  assert.match(releaseWorkflow, /-f event=push/);
  assert.match(releaseWorkflow, /-f status=success/);
  assert.match(releaseWorkflow, /ref: \$\{\{ github\.sha \}\}/);
  assert.match(releaseWorkflow, /default_branch_sha/);
  assert.match(releaseWorkflow, /npm exec nx -- release publish/);
  assert.match(releaseWorkflow, /node scripts\/verify-published-version\.mjs/);

  const disabledGitOperations = {
    commit: false,
    stageChanges: false,
    tag: false,
    push: false,
  };

  assert.equal(nxConfig.release?.git, undefined);
  assert.equal(
    nxConfig.release?.version?.fallbackCurrentVersionResolver,
    'disk',
  );
  assert.deepEqual(nxConfig.release?.version?.git, disabledGitOperations);
  assert.deepEqual(nxConfig.release?.changelog?.git, disabledGitOperations);
  assert.equal(
    nxConfig.release?.changelog?.workspaceChangelog?.createRelease,
    false,
  );

  assert.doesNotMatch(
    releaseWorkflow,
    /create-github-app-token|RELEASE_APP_|contents:\s*write|persist-credentials:\s*true|git push|npm exec nx -- release (?:version|changelog)|gh release(?:\s|$)/,
  );
});

test('first release uses only the protected bootstrap credential', () => {
  const publishStep = releaseWorkflow.slice(
    releaseWorkflow.indexOf('- name: Publish packages'),
  );

  assert.match(releaseWorkflow, /environment: npm-publish/);
  assert.match(releaseWorkflow, /id-token: write/);
  assert.match(releaseWorkflow, /secrets\.NPM_BOOTSTRAP_TOKEN/);
  assert.match(
    releaseWorkflow,
    /npm whoami --registry=https:\/\/registry\.npmjs\.org/,
  );
  assert.match(releaseWorkflow, /--first-release/);
  assert.doesNotMatch(releaseWorkflow, /secrets\.NPM_TOKEN/);
  assert.doesNotMatch(publishStep, /--first-release/);
  assert.match(publishStep, /registry existence check enabled/);
});

test('public registry verification does not require an npm token', () => {
  const verificationStep = releaseWorkflow.slice(
    releaseWorkflow.indexOf('- name: Verify all packages are public'),
  );

  assert.match(verificationStep, /NODE_AUTH_TOKEN: ''/);
  assert.match(
    publishedVersionVerifier,
    /NODE_AUTH_TOKEN: process\.env\.NODE_AUTH_TOKEN \?\? ''/,
  );
  assert.match(publishedVersionVerifier, /String\(error\.stderr\)\.trim\(\)/);
});

function runVersionAssertion(version) {
  return spawnSync(
    process.execPath,
    [path.join(workspaceRoot, 'scripts/assert-release-version.mjs'), version],
    { cwd: workspaceRoot, encoding: 'utf8' },
  );
}

function read(relativePath) {
  return readFile(path.join(workspaceRoot, relativePath), 'utf8');
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
