import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const workspaceRoot = path.resolve(import.meta.dirname, '..');
const requestedVersion = process.argv[2] || undefined;
const previousVersion = process.argv[3] || undefined;
const nxConfig = JSON.parse(
  await readFile(path.join(workspaceRoot, 'nx.json'), 'utf8'),
);
const releaseProjects = new Set(nxConfig.release?.projects ?? []);

if (releaseProjects.size === 0) {
  throw new Error('nx.json does not define any release projects.');
}

const packageDirectories = await readdir(path.join(workspaceRoot, 'packages'), {
  withFileTypes: true,
});
const versions = new Map();

for (const directory of packageDirectories) {
  if (!directory.isDirectory()) {
    continue;
  }

  const packageJsonPath = path.join(
    workspaceRoot,
    'packages',
    directory.name,
    'package.json',
  );
  let packageJson;
  try {
    packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') {
      continue;
    }
    throw error;
  }

  if (releaseProjects.has(packageJson.name)) {
    versions.set(packageJson.name, packageJson.version);
  }
}

const missingProjects = [...releaseProjects].filter(
  (project) => !versions.has(project),
);
if (missingProjects.length > 0) {
  throw new Error(
    `Release package manifests are missing for: ${missingProjects.join(', ')}`,
  );
}

const uniqueVersions = new Set(versions.values());
if (uniqueVersions.size !== 1) {
  throw new Error(
    `Release packages must have one fixed version; found ${[...uniqueVersions].join(', ')}.`,
  );
}

const [version] = uniqueVersions;
if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
  throw new Error(`Release version must be stable semver; found ${version}.`);
}

if (version === '0.0.0') {
  throw new Error('0.0.0 is a development placeholder and cannot be released.');
}

if (previousVersion) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(previousVersion)) {
    throw new Error(
      `Previous package version must be stable semver; found ${previousVersion}.`,
    );
  }

  if (compareStableVersions(version, previousVersion) <= 0) {
    throw new Error(
      `Release version ${version} must be greater than the current version ${previousVersion}.`,
    );
  }
}

if (
  requestedVersion &&
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(requestedVersion) &&
  version !== requestedVersion
) {
  throw new Error(
    `Nx Release resolved ${version}, but the workflow requested ${requestedVersion}.`,
  );
}

process.stdout.write(`${version}\n`);

function compareStableVersions(left, right) {
  const leftParts = left.split('.').map(BigInt);
  const rightParts = right.split('.').map(BigInt);

  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] > rightParts[index]) {
      return 1;
    }

    if (leftParts[index] < rightParts[index]) {
      return -1;
    }
  }

  return 0;
}
