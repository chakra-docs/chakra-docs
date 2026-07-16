import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync } from 'node:fs';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { syncGitRepositories, syncGitRepository } from './index.js';
import type { DocsGitRepositoryConfig } from '@chakra-docs/core';

const CACHE_MARKER_NAME = 'chakra-docs-source-git.json';

const execFileMock = vi.hoisted(() =>
  vi.fn(
    (
      _file: string,
      _args: readonly string[],
      _options: Record<string, unknown>,
      callback: (
        error: Error | null,
        result: { stdout: string; stderr: string },
      ) => void,
    ) => {
      callback(null, { stdout: '', stderr: '' });
    },
  ),
);

vi.mock('node:child_process', () => ({
  execFile: execFileMock,
}));

const tempDirs: string[] = [];
const defaultExecOptions = (cwd: string, timeout = 60_000) => ({
  cwd,
  windowsHide: true,
  timeout,
  maxBuffer: 4 * 1024 * 1024,
});

async function createRootDir(): Promise<string> {
  const rootDir = await mkdtemp(
    path.join(os.tmpdir(), 'chakra-docs-source-git-'),
  );
  tempDirs.push(rootDir);
  return rootDir;
}

function createRepository(
  overrides: Partial<DocsGitRepositoryConfig> = {},
): DocsGitRepositoryConfig {
  return {
    id: 'docs',
    type: 'git',
    url: 'https://example.com/docs.git',
    ref: 'v1.0.0',
    ...overrides,
  };
}

async function createOwnedCache(
  cacheDir: string,
  repositoryId = 'docs',
): Promise<void> {
  const gitDir = path.join(cacheDir, '.git');
  await mkdir(gitDir, { recursive: true });
  await writeFile(
    path.join(gitDir, CACHE_MARKER_NAME),
    `${JSON.stringify({ version: 1, repositoryId })}\n`,
  );
}

function simulateSuccessfulGitCommand(
  args: readonly string[],
  callback: (
    error: Error | null,
    result: { stdout: string; stderr: string },
  ) => void,
): void {
  if (args[0] === 'clone') {
    const destination = args.at(-1);

    if (!destination) {
      callback(new Error('missing clone destination'), {
        stdout: '',
        stderr: '',
      });
      return;
    }

    mkdirSync(path.join(destination, '.git'), { recursive: true });
  }

  callback(null, { stdout: '', stderr: '' });
}

beforeEach(() => {
  execFileMock.mockReset();
  execFileMock.mockImplementation((_file, args, _options, callback) => {
    simulateSuccessfulGitCommand(args, callback);
  });
});

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe('syncGitRepository', () => {
  it('clones into the default cache dir and checks out the ref', async () => {
    const rootDir = await createRootDir();
    const cacheDir = path.join(rootDir, '.chakra-docs', 'git', 'docs');

    const result = await syncGitRepository({
      repository: createRepository(),
      rootDir,
    });

    expect(result).toEqual({
      repositoryId: 'docs',
      rootDir: cacheDir,
      ref: 'v1.0.0',
    });
    expect(execFileMock).toHaveBeenCalledTimes(4);
    expect(execFileMock).toHaveBeenNthCalledWith(
      1,
      'git',
      [
        'clone',
        '--no-checkout',
        '--no-tags',
        '--depth=1',
        '--single-branch',
        '--',
        'https://example.com/docs.git',
        expect.stringMatching(/\.docs\.chakra-docs-clone-[^/\\]+$/),
      ],
      defaultExecOptions(rootDir),
      expect.any(Function),
    );
    expect(execFileMock).toHaveBeenNthCalledWith(
      2,
      'git',
      [
        'fetch',
        '--force',
        '--prune',
        '--no-tags',
        '--depth=1',
        'origin',
        'v1.0.0',
      ],
      defaultExecOptions(cacheDir),
      expect.any(Function),
    );
    expect(execFileMock).toHaveBeenNthCalledWith(
      3,
      'git',
      ['checkout', '--detach', '--force', 'FETCH_HEAD', '--'],
      defaultExecOptions(cacheDir),
      expect.any(Function),
    );
  });

  it('fetches instead of cloning when the cache already has a checkout', async () => {
    const rootDir = await createRootDir();
    const cacheDir = path.join(rootDir, '.chakra-docs', 'git', 'docs');
    await createOwnedCache(cacheDir);

    await syncGitRepository({ repository: createRepository(), rootDir });

    expect(execFileMock).toHaveBeenCalledTimes(4);
    expect(execFileMock).toHaveBeenNthCalledWith(
      1,
      'git',
      ['remote', 'set-url', 'origin', 'https://example.com/docs.git'],
      defaultExecOptions(cacheDir),
      expect.any(Function),
    );
    expect(execFileMock).toHaveBeenNthCalledWith(
      2,
      'git',
      [
        'fetch',
        '--force',
        '--prune',
        '--no-tags',
        '--depth=1',
        'origin',
        'v1.0.0',
      ],
      defaultExecOptions(cacheDir),
      expect.any(Function),
    );
  });

  it('sanitizes repository ids when building the cache path', async () => {
    const rootDir = await createRootDir();

    const result = await syncGitRepository({
      repository: createRepository({ id: 'my repo!' }),
      rootDir,
    });

    expect(result.rootDir).toBe(
      path.join(rootDir, '.chakra-docs', 'git', 'my-repo-'),
    );
  });

  it('joins repository subdirs and resolves custom cache dirs', async () => {
    const rootDir = await createRootDir();
    const cacheDir = path.join(rootDir, 'vendor', 'docs-cache');
    await createOwnedCache(cacheDir);
    await mkdir(path.join(cacheDir, 'docs/content'), { recursive: true });

    const result = await syncGitRepository({
      repository: createRepository({
        subdir: 'docs/content',
        cacheDir: 'vendor/docs-cache',
      }),
      rootDir,
    });

    expect(result.rootDir).toBe(path.join(cacheDir, 'docs/content'));
    expect(execFileMock).toHaveBeenNthCalledWith(
      3,
      'git',
      ['checkout', '--detach', '--force', 'FETCH_HEAD', '--'],
      defaultExecOptions(cacheDir),
      expect.any(Function),
    );
  });

  it('rejects repository urls that look like git options', async () => {
    const rootDir = await createRootDir();

    await expect(
      syncGitRepository({
        repository: createRepository({ url: '--upload-pack=evil' }),
        rootDir,
      }),
    ).rejects.toThrow('Invalid git repository url');
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it('rejects repository refs that look like git options', async () => {
    const rootDir = await createRootDir();

    await expect(
      syncGitRepository({
        repository: createRepository({ ref: '-b' }),
        rootDir,
      }),
    ).rejects.toThrow('Invalid git repository ref');
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it('wraps git failures with the attempted command', async () => {
    const rootDir = await createRootDir();
    execFileMock.mockImplementationOnce((_file, _args, _options, callback) => {
      callback(new Error('fatal: repository not found'), {
        stdout: '',
        stderr: '',
      });
    });

    await expect(
      syncGitRepository({ repository: createRepository(), rootDir }),
    ).rejects.toThrow(
      'Git clone failed for repository "docs": fatal: repository not found',
    );
  });

  it('contains configured cache directories and repository subdirs', async () => {
    const rootDir = await createRootDir();

    await expect(
      syncGitRepository({
        repository: createRepository({ cacheDir: '../outside' }),
        rootDir,
      }),
    ).rejects.toThrow('path must stay within');
    await expect(
      syncGitRepository({
        repository: createRepository({ subdir: '../../outside' }),
        rootDir,
      }),
    ).rejects.toThrow('path must stay within');
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it('rejects rootDir itself as a cache directory', async () => {
    const rootDir = await createRootDir();

    await expect(
      syncGitRepository({
        repository: createRepository(),
        rootDir,
        cacheDir: '.',
      }),
    ).rejects.toThrow('must not equal rootDir');
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it('refuses a pre-existing unowned Git checkout', async () => {
    const rootDir = await createRootDir();
    const cacheDir = path.join(rootDir, '.chakra-docs', 'git', 'docs');
    await mkdir(path.join(cacheDir, '.git'), { recursive: true });

    await expect(
      syncGitRepository({ repository: createRepository(), rootDir }),
    ).rejects.toThrow('not an owned Chakra Docs Git cache');
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it('refuses a cache owned by a different repository id', async () => {
    const rootDir = await createRootDir();
    const cacheDir = path.join(rootDir, '.chakra-docs', 'git', 'docs');
    await createOwnedCache(cacheDir, 'other-docs');

    await expect(
      syncGitRepository({ repository: createRepository(), rootDir }),
    ).rejects.toThrow('not an owned Chakra Docs Git cache');
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it('passes a bounded timeout to every Git command', async () => {
    const rootDir = await createRootDir();

    await syncGitRepository({
      repository: createRepository(),
      rootDir,
      timeoutMs: 2500,
    });

    for (const call of execFileMock.mock.calls) {
      expect(call[2]).toMatchObject({ timeout: 2500 });
    }
  });

  it('redacts repository credentials from Git errors', async () => {
    const rootDir = await createRootDir();
    const url = 'https://user:secret@example.com/private.git?token=secret';
    execFileMock.mockImplementationOnce((_file, _args, _options, callback) => {
      callback(new Error(`fatal: unable to access '${url}'`), {
        stdout: '',
        stderr: '',
      });
    });

    let message = '';

    try {
      await syncGitRepository({
        repository: createRepository({ url }),
        rootDir,
      });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain('<repository-url>');
    expect(message).not.toContain('user');
    expect(message).not.toContain('secret');
  });

  it('cleans staging and lock directories after clone failure', async () => {
    const rootDir = await createRootDir();
    const cacheParent = path.join(rootDir, '.chakra-docs', 'git');
    execFileMock.mockImplementationOnce((_file, _args, _options, callback) => {
      callback(new Error('fatal: clone interrupted'), {
        stdout: '',
        stderr: '',
      });
    });

    await expect(
      syncGitRepository({ repository: createRepository(), rootDir }),
    ).rejects.toThrow('fatal: clone interrupted');

    await expect(readdir(cacheParent)).resolves.toEqual([]);
  });

  it('serializes concurrent syncs and initializes the cache only once', async () => {
    const rootDir = await createRootDir();
    const cacheParent = path.join(rootDir, '.chakra-docs', 'git');

    execFileMock.mockImplementation((_file, args, _options, callback) => {
      if (args[0] === 'clone') {
        const destination = args.at(-1);

        if (!destination) {
          callback(new Error('missing clone destination'), {
            stdout: '',
            stderr: '',
          });
          return;
        }

        mkdirSync(path.join(destination, '.git'), { recursive: true });
        setTimeout(() => callback(null, { stdout: '', stderr: '' }), 40);
        return;
      }

      callback(null, { stdout: '', stderr: '' });
    });

    const [first, second] = await Promise.all([
      syncGitRepository({ repository: createRepository(), rootDir }),
      syncGitRepository({ repository: createRepository(), rootDir }),
    ]);

    expect(first).toEqual(second);
    expect(
      execFileMock.mock.calls.filter((call) => call[1][0] === 'clone'),
    ).toHaveLength(1);
    await expect(readdir(cacheParent)).resolves.toEqual(['docs']);
  });
});

describe('syncGitRepositories', () => {
  it('syncs only git repositories from the discovery config', async () => {
    const rootDir = await createRootDir();

    const results = await syncGitRepositories({
      rootDir,
      collections: [],
      repositories: [
        { id: 'local-docs', type: 'local', rootDir: '.' },
        createRepository(),
      ],
    });

    expect(results).toEqual([
      {
        repositoryId: 'docs',
        rootDir: path.join(rootDir, '.chakra-docs', 'git', 'docs'),
        ref: 'v1.0.0',
      },
    ]);
    expect(execFileMock).toHaveBeenCalledTimes(4);
  });

  it('returns an empty list when no repositories are configured', async () => {
    const rootDir = await createRootDir();

    await expect(
      syncGitRepositories({ rootDir, collections: [] }),
    ).resolves.toEqual([]);
    expect(execFileMock).not.toHaveBeenCalled();
  });

  it('rejects repository ids that collide after sanitization', async () => {
    const rootDir = await createRootDir();

    await expect(
      syncGitRepositories({
        rootDir,
        collections: [],
        repositories: [
          createRepository({ id: 'docs one' }),
          createRepository({ id: 'docs?one' }),
        ],
      }),
    ).rejects.toThrow('resolve to the same cache directory');
    expect(execFileMock).not.toHaveBeenCalled();
  });
});
