import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const firstRelease = process.argv[2] === 'true';
const workspaceRoot = path.resolve(import.meta.dirname, '..');
const nxConfig = JSON.parse(
  await readFile(path.join(workspaceRoot, 'nx.json'), 'utf8'),
);
const releaseProjects = new Set(nxConfig.release?.projects ?? []);
const versions = new Map();

for (const directory of await readdir(path.join(workspaceRoot, 'packages'), {
  withFileTypes: true,
})) {
  if (!directory.isDirectory()) {
    continue;
  }

  const manifest = JSON.parse(
    await readFile(
      path.join(workspaceRoot, 'packages', directory.name, 'package.json'),
      'utf8',
    ),
  );
  if (releaseProjects.has(manifest.name)) {
    versions.set(manifest.name, manifest.version);
  }
}

const missing = [...releaseProjects].filter((name) => !versions.has(name));
if (missing.length > 0) {
  throw new Error(`Missing release package manifests: ${missing.join(', ')}.`);
}

const uniqueVersions = new Set(versions.values());
if (uniqueVersions.size !== 1) {
  throw new Error(
    `Release package manifests have drifted: ${[...uniqueVersions].join(', ')}.`,
  );
}

const [currentVersion] = uniqueVersions;
if (!isStableVersion(currentVersion)) {
  throw new Error(
    `Current package version is not stable semver: ${currentVersion}.`,
  );
}

const tags = execFileSync(
  'git',
  ['tag', '--list', 'v*', '--merged', 'HEAD', '--sort=-version:refname'],
  { cwd: workspaceRoot, encoding: 'utf8' },
)
  .split(/\r?\n/)
  .map((tag) => tag.trim())
  .filter((tag) => /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(tag));

if (firstRelease) {
  if (tags.length > 0) {
    throw new Error(
      `First-release mode is invalid because tag ${tags[0]} exists.`,
    );
  }
  if (currentVersion !== '0.0.0') {
    throw new Error(
      `First-release mode requires 0.0.0 package placeholders; found ${currentVersion}.`,
    );
  }
} else {
  if (tags.length === 0) {
    throw new Error(
      'No reachable stable release tag exists; use first-release mode.',
    );
  }

  const taggedVersion = tags[0].slice(1);
  if (currentVersion !== taggedVersion) {
    throw new Error(
      `Package manifests are ${currentVersion}, but the latest release tag is ${tags[0]}.`,
    );
  }
}

process.stdout.write(`${currentVersion}\n`);

function isStableVersion(value) {
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value);
}
