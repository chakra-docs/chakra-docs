import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const expectedVersion = process.argv[2];

if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(expectedVersion ?? '')) {
  throw new Error('Expected a stable release version to verify.');
}

const workspaceRoot = path.resolve(import.meta.dirname, '..');
const npmEnvironment = {
  ...process.env,
  // setup-node writes an npmrc that references this variable. Keep public
  // verification tokenless while ensuring npm can resolve that placeholder.
  NODE_AUTH_TOKEN: process.env.NODE_AUTH_TOKEN ?? '',
};
const nxConfig = JSON.parse(
  await readFile(path.join(workspaceRoot, 'nx.json'), 'utf8'),
);
const projects = nxConfig.release?.projects ?? [];
const attempts = 6;
let failures = [];

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  failures = (
    await Promise.all(projects.map((project) => verifyProject(project)))
  ).filter(Boolean);

  if (failures.length === 0) {
    process.stdout.write(
      `Verified ${projects.length} public packages at ${expectedVersion}.\n`,
    );
    process.exit(0);
  }

  if (attempt < attempts) {
    process.stderr.write(
      `Registry verification attempt ${attempt}/${attempts} incomplete; retrying in 10 seconds.\n`,
    );
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
}

throw new Error(
  `Release verification failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}`,
);

async function verifyProject(project) {
  try {
    const [{ stdout: publishedOutput }, { stdout: latestOutput }] =
      await Promise.all([
        execFileAsync(
          'npm',
          ['view', `${project}@${expectedVersion}`, 'version', '--json'],
          {
            cwd: workspaceRoot,
            env: npmEnvironment,
            maxBuffer: 1024 * 1024,
          },
        ),
        execFileAsync('npm', ['view', project, 'dist-tags.latest', '--json'], {
          cwd: workspaceRoot,
          env: npmEnvironment,
          maxBuffer: 1024 * 1024,
        }),
      ]);
    const publishedVersion = JSON.parse(publishedOutput);
    const latestVersion = JSON.parse(latestOutput);

    if (publishedVersion !== expectedVersion) {
      return `${project}@${expectedVersion} is not publicly readable.`;
    }
    if (latestVersion !== expectedVersion) {
      return `${project} has latest=${String(latestVersion)} instead of ${expectedVersion}.`;
    }
    return undefined;
  } catch (error) {
    const stderr =
      error && typeof error === 'object' && 'stderr' in error
        ? String(error.stderr).trim()
        : '';
    const message =
      stderr || (error instanceof Error ? error.message : String(error));
    return `${project}: ${message}`;
  }
}
