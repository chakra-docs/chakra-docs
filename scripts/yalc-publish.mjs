import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const workspaceRoot = process.cwd();
const packageOrder = [
  '@chakra-docs/core',
  '@chakra-docs/search',
  '@chakra-docs/source-filesystem',
  '@chakra-docs/source-git',
  '@chakra-docs/chakra',
  '@chakra-docs/feed',
  '@chakra-docs/search-pagefind',
  '@chakra-docs/next',
  '@chakra-docs/astro',
  '@chakra-docs/react-router',
  '@chakra-docs/cli',
];

const packageRoots = new Map([
  ['@chakra-docs/core', 'packages/core'],
  ['@chakra-docs/search', 'packages/search'],
  ['@chakra-docs/source-filesystem', 'packages/source-filesystem'],
  ['@chakra-docs/source-git', 'packages/source-git'],
  ['@chakra-docs/chakra', 'packages/chakra'],
  ['@chakra-docs/feed', 'packages/feed'],
  ['@chakra-docs/search-pagefind', 'packages/search-pagefind'],
  ['@chakra-docs/next', 'packages/next'],
  ['@chakra-docs/astro', 'packages/astro'],
  ['@chakra-docs/react-router', 'packages/react-router'],
  ['@chakra-docs/cli', 'packages/cli'],
]);

const args = new Set(process.argv.slice(2));
const skipBuild = args.has('--skip-build');
const push = !args.has('--no-push');

if (!skipBuild) {
  await run('npm', [
    'exec',
    'nx',
    '--',
    'run-many',
    '-t',
    'build',
    '--projects',
    packageOrder.join(','),
  ]);
}

for (const packageName of packageOrder) {
  const packageRoot = packageRoots.get(packageName);

  if (!packageRoot) {
    throw new Error(`Missing package root for ${packageName}.`);
  }

  const manifest = await readJson(path.join(packageRoot, 'package.json'));

  if (manifest.private) {
    throw new Error(
      `${packageName} is private and cannot be published to yalc.`,
    );
  }

  await run(
    'npm',
    ['exec', 'yalc', '--', 'publish', ...(push ? ['--push'] : [])],
    path.join(workspaceRoot, packageRoot),
  );
}

async function readJson(filePath) {
  return JSON.parse(await readFile(path.join(workspaceRoot, filePath), 'utf8'));
}

async function run(command, args, cwd = workspaceRoot) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `${command} ${args.join(' ')} failed with exit code ${code}.`,
          ),
        );
      }
    });
  });
}
