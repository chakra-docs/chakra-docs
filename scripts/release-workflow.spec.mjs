import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { parse as parseYaml } from 'yaml';
import { bracesException } from './audit-dependencies.mjs';

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

test('development and release tooling remain pinned to Node 24 and pnpm', async () => {
  const manifest = JSON.parse(await read('package.json'));
  const nodeVersion = (await read('.nvmrc')).trim();
  assert.match(nodeVersion, /^24\.\d+\.\d+$/);
  assert.equal(manifest.packageManager, 'pnpm@11.25.0');
  for (const file of ['ci.yml', 'release.yml']) {
    const workflow = await read(`.github/workflows/${file}`);
    assert.match(workflow, /node-version-file: '\.nvmrc'/);
    assert.match(workflow, /corepack enable/);
    assert.match(workflow, /pnpm install --frozen-lockfile/);
    assert.doesNotMatch(workflow, /npm ci|cache: npm/);
  }
  const springbar = await read('springbar.toml');
  assert.match(springbar, /package_manager = "pnpm"/);
  assert.ok(springbar.includes(`version = "${nodeVersion}"`));
});

test('Nx tooling is aligned and known vulnerable transitive versions stay out of the lockfile', async () => {
  const manifest = JSON.parse(await read('package.json'));
  const lock = parseYaml(await read('pnpm-lock.yaml'));
  for (const [name, version] of Object.entries(manifest.devDependencies)) {
    if (name === 'nx' || name.startsWith('@nx/')) {
      assert.equal(
        version,
        '22.7.10',
        `${name} must share the patched Nx version`,
      );
    }
  }
  for (const key of [
    'nx@22.7.8',
    'nx@22.7.9',
    'smol-toml@1.7.1',
    'smol-toml@1.8.0',
    'source-map-js@1.2.1',
    'proxy-addr@2.0.7',
    'compression@1.8.1',
    'postcss-selector-parser@7.1.5',
    'sharp@0.35.4',
    'shell-quote@1.10.0',
  ]) {
    assert.equal(lock.packages[key], undefined, `${key} must not be installed`);
  }
});

test('packed consumers include pinned DOM declarations without weakening compatibility checks', async () => {
  const manifest = JSON.parse(await read('package.json'));
  const lock = parseYaml(await read('pnpm-lock.yaml'));
  const domTypes = lock.importers['.'].devDependencies['@typescript/lib-dom'];
  assert.equal(
    domTypes.specifier,
    manifest.devDependencies['@typescript/lib-dom'],
  );
  assert.equal(domTypes.version, '@types/web@0.0.356');

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
  const lock = parseYaml(await read('pnpm-lock.yaml'));
  const version = manifest.dependencies['@postkit/react'];
  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.equal(
    lock.importers['apps/docs'].dependencies['@postkit/react'].specifier,
    version,
  );
  for (const name of ['react', 'core', 'unfurl']) {
    const packageKey = Object.keys(lock.packages).find((key) =>
      key.startsWith(`@postkit/${name}@${version}`),
    );
    assert.ok(packageKey, `pnpm must lock @postkit/${name}@${version}`);
    const entry = lock.packages[packageKey];
    assert.ok(entry.resolution.integrity);
  }
});

test('docs and workspace UI packages share one Chakra runtime', async () => {
  const lock = parseYaml(await read('pnpm-lock.yaml'));
  const docsChakra =
    lock.importers['apps/docs'].dependencies['@chakra-ui/react'].version;
  const packageChakra =
    lock.importers['packages/chakra'].dependencies['@chakra-ui/react'].version;

  assert.equal(
    packageChakra,
    docsChakra,
    'pnpm peer contexts must not install a second Chakra runtime for the workspace package',
  );
});

test('the Next adapter excludes the vulnerable 16.3 framework releases', () => {
  const next = publicPackages.find(({ name }) => name === '@chakra-docs/next');
  assert.equal(next.peerDependencies.next, '>=15.5.24 <16 || >=16.3.6 <17');
});

test('production audits remain unfiltered and the development mitigation gate runs in CI', async () => {
  const ci = await read('.github/workflows/ci.yml');
  assert.match(ci, /run: pnpm audit --prod --audit-level=moderate\n/);
  assert.match(ci, /run: pnpm run audit:dependencies\n/);
  assert.doesNotMatch(
    ci,
    /pnpm audit[^\n]*--ignore(?:-unfixable|-registry-errors)?\b/,
  );
  const manifest = JSON.parse(await read('package.json'));
  assert.equal(
    manifest.scripts['audit:dependencies'],
    'node scripts/audit-dependencies.mjs',
  );
  assert.match(
    manifest.nx.targets['release-validation'].options.command,
    /audit-dependencies\.spec\.mjs/,
  );
});

test('dependency review accepts only the verified time-bounded braces mitigation', async () => {
  const ci = parseYaml(await read('.github/workflows/ci.yml'));
  const job = ci.jobs['dependency-review'];
  const steps = job.steps;
  const reviewIndex = steps.findIndex((step) =>
    step.uses?.startsWith('actions/dependency-review-action@'),
  );
  assert.ok(reviewIndex >= 0);
  const review = steps[reviewIndex];
  assert.deepEqual(review.with, {
    'fail-on-severity': 'moderate',
    'allow-ghsas': bracesException.id,
  });
  assert.equal(review.if, undefined);
  assert.equal(review['continue-on-error'], undefined);
  assert.deepEqual(job.permissions, { contents: 'read' });
  assert.equal(job.if, "github.event_name == 'pull_request'");
  assert.equal(steps[0].with['persist-credentials'], false);

  const installIndex = steps.findIndex(
    (step) => step.run === 'pnpm install --frozen-lockfile --ignore-scripts',
  );
  const gateIndex = steps.findIndex(
    (step) => step.run === 'pnpm run audit:dependencies',
  );
  const productionIndex = steps.findIndex(
    (step) => step.run === 'pnpm audit --prod --audit-level=moderate',
  );
  assert.ok(installIndex >= 0 && installIndex < gateIndex);
  assert.ok(gateIndex < productionIndex && productionIndex < reviewIndex);
  for (const step of [
    steps[installIndex],
    steps[gateIndex],
    steps[productionIndex],
  ]) {
    assert.equal(step.if, undefined);
    assert.equal(step['continue-on-error'], undefined);
  }
  assert.equal(bracesException.expires, '2026-11-04T00:00:00.000Z');
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
  assert.match(releaseWorkflow, /pnpm nx release publish/);
  assert.match(releaseWorkflow, /corepack enable/);
  assert.match(releaseWorkflow, /pnpm install --frozen-lockfile/);
  assert.doesNotMatch(
    releaseWorkflow,
    /npm ci|npm install --global|package-lock\.json/,
  );
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
    /create-github-app-token|RELEASE_APP_|contents:\s*write|persist-credentials:\s*true|git push|pnpm nx release (?:version|changelog)|gh release(?:\s|$)/,
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
    /pnpm whoami --registry=https:\/\/registry\.npmjs\.org/,
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
  assert.match(publishedVersionVerifier, /credentials: 'omit'/);
  assert.match(publishedVersionVerifier, /https:\/\/registry\.npmjs\.org/);
  assert.doesNotMatch(
    publishedVersionVerifier,
    /execFile|process\.env|Authorization/,
  );
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
