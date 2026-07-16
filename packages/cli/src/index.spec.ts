import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  buildDocsManifest,
  loadDocsConfig,
  runCli,
  writeGeneratedManifest,
} from './index.js';

const tempDirs: string[] = [];
let logSpy: MockInstance;
let errorSpy: MockInstance;

beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function createWorkspace(): Promise<string> {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'chakra-docs-cli-'));
  tempDirs.push(cwd);

  await mkdir(path.join(cwd, 'content/docs'), { recursive: true });
  await writeFile(
    path.join(cwd, 'content/docs/getting-started.mdx'),
    [
      '---',
      'title: Getting started',
      'description: Install and configure docs.',
      '---',
      '',
      '## Install',
      '',
      'Run the installer.',
      '',
    ].join('\n'),
    'utf8',
  );
  await writeFile(
    path.join(cwd, 'chakra-docs.config.json'),
    JSON.stringify({
      rootDir: '.',
      outDir: '.chakra-docs/generated',
      collections: [
        {
          id: 'docs',
          contentDir: 'content/docs',
          basePath: '/docs',
        },
      ],
    }),
    'utf8',
  );

  return cwd;
}

describe('runCli', () => {
  it('rejects when no command is provided and prints usage', async () => {
    const cwd = await createWorkspace();

    await expect(runCli({ argv: [], cwd })).rejects.toThrow(
      'Expected a chakra-docs command: build, dev, validate, inspect, or sync.',
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Usage: chakra-docs <command>'),
    );
  });

  it('rejects unknown commands', async () => {
    const cwd = await createWorkspace();

    await expect(runCli({ argv: ['publish'], cwd })).rejects.toThrow(
      'Expected a chakra-docs command',
    );
  });

  it('rejects non-numeric --interval values before running dev', async () => {
    const cwd = await createWorkspace();

    await expect(
      runCli({ argv: ['dev', '--once', '--interval', 'abc'], cwd }),
    ).rejects.toThrow(
      'Invalid --interval value "abc": expected a positive number of milliseconds.',
    );
  });

  it('rejects zero and negative --interval values', async () => {
    const cwd = await createWorkspace();

    await expect(
      runCli({ argv: ['dev', '--once', '--interval', '0'], cwd }),
    ).rejects.toThrow('Invalid --interval value "0"');
    await expect(
      runCli({ argv: ['dev', '--once', '--interval', '-50'], cwd }),
    ).rejects.toThrow('Invalid --interval value "-50"');
  });

  it('rejects unknown, missing, repeated, conflicting, and command-specific flags', async () => {
    const cwd = await createWorkspace();

    await expect(runCli({ argv: ['build', '--wat'], cwd })).rejects.toThrow(
      'Unknown option or argument "--wat"',
    );
    await expect(runCli({ argv: ['build', '--out-dir'], cwd })).rejects.toThrow(
      'Option --out-dir requires a value',
    );
    await expect(
      runCli({ argv: ['build', '--out-dir', '--compact'], cwd }),
    ).rejects.toThrow('Option --out-dir requires a value');
    await expect(
      runCli({ argv: ['build', '--compact', '--compact'], cwd }),
    ).rejects.toThrow('Option --compact may only be specified once');
    await expect(
      runCli({ argv: ['build', '--pretty', '--compact'], cwd }),
    ).rejects.toThrow('cannot be used together');
    await expect(runCli({ argv: ['validate', '--once'], cwd })).rejects.toThrow(
      'only valid for the dev command',
    );
  });

  it('validates collections and reports the page count', async () => {
    const cwd = await createWorkspace();

    await runCli({ argv: ['validate'], cwd });

    expect(logSpy).toHaveBeenCalledWith(
      'Validated 1 page(s) across 1 collection(s).',
    );
  });

  it('builds a compact manifest into the requested out dir', async () => {
    const cwd = await createWorkspace();
    const outDir = path.join(cwd, 'generated');

    await runCli({
      argv: ['build', '--compact', '--out-dir', outDir],
      cwd,
    });

    const manifestJson = await readFile(
      path.join(outDir, 'manifest.json'),
      'utf8',
    );
    const manifest = JSON.parse(manifestJson) as { pages: unknown[] };

    expect(logSpy).toHaveBeenCalledWith(
      `Chakra Docs manifest written to ${outDir}`,
    );
    expect(manifest.pages).toHaveLength(1);
    expect(manifestJson.trim()).not.toContain('\n');
  });

  it('runs dev once and writes the generated manifest', async () => {
    const cwd = await createWorkspace();

    await runCli({ argv: ['dev', '--once'], cwd });

    const manifestJson = await readFile(
      path.join(cwd, '.chakra-docs/generated/manifest.json'),
      'utf8',
    );

    expect(JSON.parse(manifestJson)).toMatchObject({
      pages: [expect.objectContaining({ title: 'Getting started' })],
    });
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('[chakra-docs] built 1 page(s)'),
    );
  });

  it('inspects only public repository metadata', async () => {
    const cwd = await createWorkspace();
    await writeFile(
      path.join(cwd, 'chakra-docs.config.json'),
      JSON.stringify({
        rootDir: '.',
        repositories: [{ id: 'local', type: 'local', rootDir: 'content/docs' }],
        collections: [
          {
            id: 'docs',
            repository: 'local',
            contentPath: '.',
            basePath: '/docs',
          },
        ],
      }),
      'utf8',
    );

    await runCli({ argv: ['inspect', '--compact'], cwd });

    const output = logSpy.mock.calls.at(-1)?.[0];
    expect(typeof output).toBe('string');
    expect(JSON.parse(String(output)).repositories).toEqual([
      { id: 'local', type: 'local' },
    ]);
    expect(output).not.toContain(cwd);
    expect(output).not.toContain('rootDir');
  });
});

describe('loadDocsConfig', () => {
  it('loads the default JSON config and resolves rootDir against cwd', async () => {
    const cwd = await createWorkspace();

    const config = await loadDocsConfig(cwd);

    expect(config.rootDir).toBe(cwd);
    expect(config.collections).toEqual([
      { id: 'docs', contentDir: 'content/docs', basePath: '/docs' },
    ]);
  });

  it('loads module configs via import and honors the default export', async () => {
    const cwd = await createWorkspace();
    await writeFile(
      path.join(cwd, 'chakra-docs.config.mjs'),
      [
        'export default {',
        "  rootDir: 'content',",
        "  collections: [{ id: 'docs', contentDir: 'docs', basePath: '/docs' }],",
        '};',
        '',
      ].join('\n'),
      'utf8',
    );

    const config = await loadDocsConfig(cwd, 'chakra-docs.config.mjs');

    expect(config.rootDir).toBe(path.join(cwd, 'content'));
    expect(config.collections[0].id).toBe('docs');
  });
});

describe('buildDocsManifest and writeGeneratedManifest', () => {
  it('writes manifest.json, manifest.d.ts, and index.ts into the out dir', async () => {
    const cwd = await createWorkspace();
    const config = await loadDocsConfig(cwd);
    const manifest = await buildDocsManifest({ config });

    expect(manifest.pages).toHaveLength(1);
    expect(manifest.pages[0].route).toBe('/docs/getting-started');

    const outDir = await writeGeneratedManifest(config, manifest);

    expect(outDir).toBe(path.join(cwd, '.chakra-docs/generated'));

    const manifestJson = await readFile(
      path.join(outDir, 'manifest.json'),
      'utf8',
    );
    const manifestTypes = await readFile(
      path.join(outDir, 'manifest.d.ts'),
      'utf8',
    );
    const indexModule = await readFile(path.join(outDir, 'index.ts'), 'utf8');

    expect(manifestJson).toContain('\n  "pages"');
    expect(JSON.parse(manifestJson)).toMatchObject({
      pages: [expect.objectContaining({ id: 'docs:getting-started' })],
    });
    expect(manifestTypes).toContain('declare const manifest: DocsManifest;');
    expect(indexModule).toContain('export const docsManifest = manifest;');
    expect((await readdir(outDir)).some((file) => file.endsWith('.tmp'))).toBe(
      false,
    );
  });

  it('writes single-line JSON when pretty output is disabled', async () => {
    const cwd = await createWorkspace();
    const config = await loadDocsConfig(cwd);
    const manifest = await buildDocsManifest({ config });

    const outDir = await writeGeneratedManifest(config, manifest, false);
    const manifestJson = await readFile(
      path.join(outDir, 'manifest.json'),
      'utf8',
    );

    expect(manifestJson.endsWith('\n')).toBe(true);
    expect(manifestJson.trim()).not.toContain('\n');
  });

  it('removes operational paths and credentials at the JSON write boundary', async () => {
    const cwd = await createWorkspace();
    const config = await loadDocsConfig(cwd);
    const manifest = await buildDocsManifest({ config });
    const unsafeManifest = {
      ...manifest,
      repositories: [
        Object.assign(
          {
            id: 'remote',
            type: 'git' as const,
            url: 'https://build-user:s3cr3t@example.com/docs.git?token=hidden',
            ref: 'main',
          },
          {
            rootDir: path.join(cwd, 'private/repository'),
            cacheDir: path.join(cwd, 'private/cache'),
          },
        ),
      ],
    };

    const outDir = await writeGeneratedManifest(config, unsafeManifest);
    const manifestJson = await readFile(
      path.join(outDir, 'manifest.json'),
      'utf8',
    );

    expect(JSON.parse(manifestJson).repositories).toEqual([
      {
        id: 'remote',
        type: 'git',
        url: 'https://example.com/docs.git',
        ref: 'main',
      },
    ]);
    expect(manifestJson).not.toContain(cwd);
    expect(manifestJson).not.toContain('s3cr3t');
    expect(manifestJson).not.toContain('token=hidden');
    expect(manifestJson).not.toContain('rootDir');
    expect(manifestJson).not.toContain('cacheDir');
  });

  it('can rebuild from an already-synced Git cache without syncing again', async () => {
    const cwd = await createWorkspace();
    const config = {
      rootDir: cwd,
      repositories: [
        {
          id: 'remote',
          type: 'git' as const,
          url: 'https://invalid.example.test/docs.git',
          ref: 'v1',
        },
      ],
      collections: [],
    };

    await expect(
      buildDocsManifest({ config, syncGit: false }),
    ).resolves.toMatchObject({ pages: [], collections: [] });
  });
});
