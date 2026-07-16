import { execFile } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  rmdir,
  stat,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { sanitizeRepositoryId } from '@chakra-docs/core';
import type {
  DocsDiscoveryConfig,
  DocsGitRepositoryConfig,
} from '@chakra-docs/core';

const execFileAsync = promisify(execFile);
const DEFAULT_GIT_TIMEOUT_MS = 60_000;
const CACHE_MARKER_NAME = 'chakra-docs-source-git.json';
const CACHE_MARKER_VERSION = 1;
const LOCK_RETRY_INTERVAL_MS = 25;

interface GitCacheMarker {
  version: typeof CACHE_MARKER_VERSION;
  repositoryId: string;
}

export interface SyncGitRepositoryOptions {
  repository: DocsGitRepositoryConfig;
  rootDir?: string;
  cacheDir?: string;
  timeoutMs?: number;
}

export interface SyncGitRepositoriesOptions {
  timeoutMs?: number;
}

export interface SyncedGitRepository {
  repositoryId: string;
  rootDir: string;
  ref: string;
}

export async function syncGitRepository(
  options: SyncGitRepositoryOptions,
): Promise<SyncedGitRepository> {
  const rootDir = path.resolve(options.rootDir ?? process.cwd());
  const cacheDir = resolveGitCacheDir(
    options.repository,
    rootDir,
    options.cacheDir,
  );
  const checkoutRoot = resolveContainedPath(
    cacheDir,
    options.repository.subdir ?? '.',
    `subdir for Git repository "${options.repository.id}"`,
  );
  const url = assertSafeGitArgument('url', options.repository.url);
  const ref = assertSafeGitArgument('ref', options.repository.ref);
  const timeoutMs = normalizeTimeout(options.timeoutMs);

  await mkdir(path.dirname(cacheDir), { recursive: true });
  const releaseLock = await acquireCacheLock(
    cacheDir,
    options.repository,
    timeoutMs,
  );

  try {
    const cacheExists = await pathExists(cacheDir);

    if (cacheExists) {
      await assertOwnedGitCache(cacheDir, options.repository);
    } else {
      await initializeOwnedGitCache(
        cacheDir,
        rootDir,
        url,
        options.repository,
        timeoutMs,
      );
    }

    if (cacheExists) {
      await runGit(
        ['remote', 'set-url', 'origin', url],
        cacheDir,
        options.repository,
        'update origin',
        timeoutMs,
      );
    }

    await runGit(
      ['fetch', '--force', '--prune', '--no-tags', '--depth=1', 'origin', ref],
      cacheDir,
      options.repository,
      'fetch configured ref',
      timeoutMs,
    );
    await runGit(
      ['checkout', '--detach', '--force', 'FETCH_HEAD', '--'],
      cacheDir,
      options.repository,
      'check out configured ref',
      timeoutMs,
    );
    await runGit(
      ['clean', '-ffdx'],
      cacheDir,
      options.repository,
      'clean checkout',
      timeoutMs,
    );

    assertRealPathContained(
      cacheDir,
      checkoutRoot,
      `subdir for Git repository "${options.repository.id}"`,
    );

    if (options.repository.subdir) {
      let checkoutStat;

      try {
        checkoutStat = await stat(checkoutRoot);
      } catch {
        throw new Error(
          `Git repository "${options.repository.id}" does not contain configured subdir "${options.repository.subdir}" at ref "${options.repository.ref}".`,
        );
      }

      if (!checkoutStat.isDirectory()) {
        throw new Error(
          `Configured subdir "${options.repository.subdir}" for Git repository "${options.repository.id}" is not a directory.`,
        );
      }
    }
  } finally {
    await releaseLock();
  }

  return {
    repositoryId: options.repository.id,
    rootDir: checkoutRoot,
    ref: options.repository.ref,
  };
}

export async function syncGitRepositories(
  config: DocsDiscoveryConfig,
  options: SyncGitRepositoriesOptions = {},
): Promise<SyncedGitRepository[]> {
  const repositories =
    config.repositories?.filter(
      (repository): repository is DocsGitRepositoryConfig =>
        repository.type === 'git',
    ) ?? [];

  assertUniqueGitCacheDirectories(repositories, path.resolve(config.rootDir));

  const results: SyncedGitRepository[] = [];

  for (const repository of repositories) {
    results.push(
      await syncGitRepository({
        repository,
        rootDir: config.rootDir,
        timeoutMs: options.timeoutMs,
      }),
    );
  }

  return results;
}

export function resolveGitCacheDir(
  repository: DocsGitRepositoryConfig,
  rootDir: string,
  cacheDirOverride?: string,
): string {
  const configuredCacheDir =
    cacheDirOverride ??
    repository.cacheDir ??
    path.join('.chakra-docs', 'git', sanitizeRepositoryId(repository.id));

  const resolvedRoot = path.resolve(rootDir);
  const resolvedCacheDir = resolveContainedPath(
    resolvedRoot,
    configuredCacheDir,
    `cacheDir for Git repository "${repository.id}"`,
  );

  if (pathsEqual(resolvedRoot, resolvedCacheDir)) {
    throw new Error(
      `Invalid cacheDir for Git repository "${repository.id}": cacheDir must be a dedicated directory below ${resolvedRoot} and must not equal rootDir.`,
    );
  }

  return resolvedCacheDir;
}

async function initializeOwnedGitCache(
  cacheDir: string,
  rootDir: string,
  url: string,
  repository: DocsGitRepositoryConfig,
  timeoutMs: number,
): Promise<void> {
  const stagingDir = await mkdtemp(
    path.join(
      path.dirname(cacheDir),
      `.${path.basename(cacheDir)}.chakra-docs-clone-`,
    ),
  );

  try {
    await runGit(
      [
        'clone',
        '--no-checkout',
        '--no-tags',
        '--depth=1',
        '--single-branch',
        '--',
        url,
        stagingDir,
      ],
      rootDir,
      repository,
      'clone',
      timeoutMs,
    );

    await assertGitDirectory(stagingDir, repository, 'newly cloned cache');
    await writeCacheMarker(stagingDir, repository);
    await rename(stagingDir, cacheDir);
    await assertOwnedGitCache(cacheDir, repository);
  } finally {
    await rm(stagingDir, { recursive: true, force: true });
  }
}

async function assertOwnedGitCache(
  cacheDir: string,
  repository: DocsGitRepositoryConfig,
): Promise<void> {
  const cacheStat = await lstat(cacheDir);

  if (!cacheStat.isDirectory() || cacheStat.isSymbolicLink()) {
    throw unownedCacheError(cacheDir, repository);
  }

  await assertGitDirectory(cacheDir, repository, 'cache directory');

  const markerPath = path.join(cacheDir, '.git', CACHE_MARKER_NAME);
  let markerStat;

  try {
    markerStat = await lstat(markerPath);
  } catch {
    throw unownedCacheError(cacheDir, repository);
  }

  if (!markerStat.isFile() || markerStat.isSymbolicLink()) {
    throw unownedCacheError(cacheDir, repository);
  }

  let marker: unknown;

  try {
    marker = JSON.parse(await readFile(markerPath, 'utf8'));
  } catch {
    throw unownedCacheError(cacheDir, repository);
  }

  if (!isGitCacheMarker(marker) || marker.repositoryId !== repository.id) {
    throw unownedCacheError(cacheDir, repository);
  }
}

async function assertGitDirectory(
  cacheDir: string,
  repository: DocsGitRepositoryConfig,
  label: string,
): Promise<void> {
  const gitDir = path.join(cacheDir, '.git');
  let gitStat;

  try {
    gitStat = await lstat(gitDir);
  } catch {
    throw new Error(
      `Git ${label} for repository "${repository.id}" does not contain a .git directory.`,
    );
  }

  if (!gitStat.isDirectory() || gitStat.isSymbolicLink()) {
    throw new Error(
      `Git ${label} for repository "${repository.id}" must contain a non-symbolic .git directory.`,
    );
  }
}

async function writeCacheMarker(
  cacheDir: string,
  repository: DocsGitRepositoryConfig,
): Promise<void> {
  const marker: GitCacheMarker = {
    version: CACHE_MARKER_VERSION,
    repositoryId: repository.id,
  };

  await writeFile(
    path.join(cacheDir, '.git', CACHE_MARKER_NAME),
    `${JSON.stringify(marker)}\n`,
    { encoding: 'utf8', flag: 'wx', mode: 0o600 },
  );
}

function isGitCacheMarker(value: unknown): value is GitCacheMarker {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    value.version === CACHE_MARKER_VERSION &&
    'repositoryId' in value &&
    typeof value.repositoryId === 'string'
  );
}

function unownedCacheError(
  cacheDir: string,
  repository: DocsGitRepositoryConfig,
): Error {
  return new Error(
    `Refusing to modify cacheDir "${cacheDir}" for Git repository "${repository.id}": the directory is not an owned Chakra Docs Git cache. Choose an empty, non-existent cacheDir or remove the directory after verifying it is safe to delete.`,
  );
}

async function acquireCacheLock(
  cacheDir: string,
  repository: DocsGitRepositoryConfig,
  timeoutMs: number,
): Promise<() => Promise<void>> {
  const lockDir = path.join(
    path.dirname(cacheDir),
    `.${path.basename(cacheDir)}.chakra-docs-source-git.lock`,
  );
  const deadline = Date.now() + timeoutMs;

  while (true) {
    try {
      await mkdir(lockDir);
      break;
    } catch (error) {
      if (!isNodeError(error, 'EEXIST')) {
        throw error;
      }

      const remainingMs = deadline - Date.now();

      if (remainingMs <= 0) {
        throw new Error(
          `Timed out waiting for the Git cache lock for repository "${repository.id}". If no Chakra Docs process is syncing this cache, remove stale lock directory "${lockDir}" and retry.`,
        );
      }

      await delay(Math.min(LOCK_RETRY_INTERVAL_MS, remainingMs));
    }
  }

  return async () => {
    try {
      await rmdir(lockDir);
    } catch (error) {
      if (!isNodeError(error, 'ENOENT')) {
        throw error;
      }
    }
  };
}

async function pathExists(candidate: string): Promise<boolean> {
  try {
    await lstat(candidate);
    return true;
  } catch (error) {
    if (isNodeError(error, 'ENOENT')) {
      return false;
    }

    throw error;
  }
}

function isNodeError(
  error: unknown,
  code: string,
): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && error.code === code;
}

function pathsEqual(left: string, right: string): boolean {
  if (process.platform === 'darwin' || process.platform === 'win32') {
    return left.toLowerCase() === right.toLowerCase();
  }

  return left === right;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function assertUniqueGitCacheDirectories(
  repositories: DocsGitRepositoryConfig[],
  rootDir: string,
): void {
  const cacheKeys = new Map<string, string>();

  for (const repository of repositories) {
    const cacheDir = resolveGitCacheDir(repository, rootDir);
    const key =
      process.platform === 'darwin' || process.platform === 'win32'
        ? cacheDir.toLowerCase()
        : cacheDir;
    const existingId = cacheKeys.get(key);

    if (existingId) {
      throw new Error(
        `Git repositories "${existingId}" and "${repository.id}" resolve to the same cache directory. Configure distinct ids or cacheDir values.`,
      );
    }

    cacheKeys.set(key, repository.id);
  }
}

function resolveContainedPath(
  parent: string,
  candidate: string,
  label: string,
): string {
  if (path.isAbsolute(candidate)) {
    throw new Error(`Invalid ${label}: absolute paths are not allowed.`);
  }

  const resolvedParent = path.resolve(parent);
  const resolved = path.resolve(resolvedParent, candidate);
  const relative = path.relative(resolvedParent, resolved);

  if (
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error(
      `Invalid ${label}: path must stay within ${resolvedParent}.`,
    );
  }

  assertRealPathContained(resolvedParent, resolved, label);

  return resolved;
}

function assertRealPathContained(
  parent: string,
  candidate: string,
  label: string,
): void {
  if (!existsSync(parent)) {
    return;
  }

  const realParent = realpathSync(parent);
  let existingAncestor = candidate;

  while (!existsSync(existingAncestor)) {
    const next = path.dirname(existingAncestor);

    if (next === existingAncestor) {
      return;
    }

    existingAncestor = next;
  }

  const realAncestor = realpathSync(existingAncestor);
  const relative = path.relative(realParent, realAncestor);

  if (
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error(
      `Invalid ${label}: symbolic links must stay within ${parent}.`,
    );
  }
}

async function runGit(
  args: string[],
  cwd: string,
  repository: DocsGitRepositoryConfig,
  operation: string,
  timeoutMs: number,
): Promise<void> {
  try {
    await execFileAsync('git', args, {
      cwd,
      windowsHide: true,
      timeout: timeoutMs,
      maxBuffer: 4 * 1024 * 1024,
    });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    const message = redactGitError(rawMessage, repository.url);
    throw new Error(
      `Git ${operation} failed for repository "${repository.id}": ${message}`,
    );
  }
}

function normalizeTimeout(value: number | undefined): number {
  if (value === undefined) {
    return DEFAULT_GIT_TIMEOUT_MS;
  }

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(
      'Invalid Git timeout: expected a positive number of milliseconds.',
    );
  }

  return value;
}

function redactGitError(message: string, repositoryUrl: string): string {
  return message
    .split(repositoryUrl)
    .join('<repository-url>')
    .replace(/(https?:\/\/)[^\s/@]+(?::[^\s/@]*)?@/gi, '$1<credentials>@')
    .replace(/\b[^\s/@:]+:[^\s/@]+@(?=[^\s/]+)/g, '<credentials>@')
    .replace(
      /([?&](?:access_token|auth|key|password|token)=)[^&\s]+/gi,
      '$1<redacted>',
    );
}

function assertSafeGitArgument(name: string, value: string): string {
  if (!value || value.startsWith('-') || /[\0\r\n]/.test(value)) {
    throw new Error(
      `Invalid git repository ${name}: value must be non-empty, must not start with "-", and must not contain control characters.`,
    );
  }

  return value;
}
