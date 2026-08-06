import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const workspaceRoot = path.resolve(import.meta.dirname, '..');
const requestedVersion = process.argv[2];

if (!isStableVersion(requestedVersion)) {
  throw new Error(
    'The requested release version must be an exact stable semantic version.',
  );
}
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
if (!isStableVersion(version)) {
  throw new Error(`Release version must be stable semver; found ${version}.`);
}

if (version === '0.0.0') {
  throw new Error('0.0.0 is a development placeholder and cannot be released.');
}

if (version !== requestedVersion) {
  throw new Error(
    `The workflow requested ${requestedVersion}, but the committed package version is ${version}.`,
  );
}

process.stdout.write(
  `Validated ${releaseProjects.size} committed packages at ${version}.\n`,
);

function isStableVersion(value) {
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value ?? '');
}
