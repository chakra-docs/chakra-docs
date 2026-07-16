import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';

const execFileAsync = promisify(execFile);
const workspaceRoot = process.cwd();
const peerProfile = process.env.CHAKRA_DOCS_PEER_PROFILE ?? 'current';

if (!['current', 'minimum'].includes(peerProfile)) {
  throw new Error(
    `CHAKRA_DOCS_PEER_PROFILE must be "current" or "minimum"; received ${peerProfile}.`,
  );
}

const publicPackages = [
  '@chakra-docs/core',
  '@chakra-docs/search',
  '@chakra-docs/source-filesystem',
  '@chakra-docs/source-git',
  '@chakra-docs/chakra',
  '@chakra-docs/cli',
  '@chakra-docs/next',
  '@chakra-docs/astro',
  '@chakra-docs/react-router',
  '@chakra-docs/search-pagefind',
  '@chakra-docs/feed',
];

const packageRoots = new Map([
  ['@chakra-docs/core', 'packages/core'],
  ['@chakra-docs/search', 'packages/search'],
  ['@chakra-docs/source-filesystem', 'packages/source-filesystem'],
  ['@chakra-docs/source-git', 'packages/source-git'],
  ['@chakra-docs/chakra', 'packages/chakra'],
  ['@chakra-docs/cli', 'packages/cli'],
  ['@chakra-docs/next', 'packages/next'],
  ['@chakra-docs/astro', 'packages/astro'],
  ['@chakra-docs/react-router', 'packages/react-router'],
  ['@chakra-docs/search-pagefind', 'packages/search-pagefind'],
  ['@chakra-docs/feed', 'packages/feed'],
]);

const nxJson = await readJson('nx.json');
assert.deepEqual(
  [...nxJson.release.projects].sort(),
  [...publicPackages].sort(),
);

const docsWorkspaceManifest = await readJson('apps/docs/package.json');
for (const [packageName, versionRange] of Object.entries(
  docsWorkspaceManifest.dependencies ?? {},
)) {
  if (packageName.startsWith('@chakra-docs/')) {
    assert.equal(
      versionRange,
      '*',
      `${packageName} must remain linked after release versioning`,
    );
  }
}

for (const packageName of publicPackages) {
  const root = packageRoots.get(packageName);
  const manifest = await readJson(`${root}/package.json`);

  assert.equal(
    manifest.private,
    undefined,
    `${packageName} must be publishable`,
  );
  assert.equal(
    manifest.license,
    'MIT',
    `${packageName} must declare the MIT license`,
  );
  assert.equal(
    manifest.publishConfig?.access,
    'public',
    `${packageName} must publish publicly`,
  );
  assert.ok(
    manifest.repository?.url,
    `${packageName} must declare a repository`,
  );
  assert.ok(manifest.bugs?.url, `${packageName} must declare a bugs URL`);
  assert.ok(manifest.homepage, `${packageName} must declare a homepage`);
  assert.ok(
    Array.isArray(manifest.keywords),
    `${packageName} must declare keywords`,
  );
  assert.ok(manifest.author, `${packageName} must declare an author`);
  assert.ok(
    Array.isArray(manifest.funding) && manifest.funding.length > 0,
    `${packageName} must declare funding`,
  );
  assert.equal(
    hasSourceCondition(manifest.exports),
    false,
    `${packageName} must not export src`,
  );
  await readFile(`${root}/LICENSE`, 'utf8');
}

const core = await import('@chakra-docs/core');
const search = await import('@chakra-docs/search');
const sourceFilesystem = await import('@chakra-docs/source-filesystem');
const sourceGit = await import('@chakra-docs/source-git');
const chakra = await import('@chakra-docs/chakra');
const cli = await import('@chakra-docs/cli');
const nextApp = await import('@chakra-docs/next/app');
const nextPages = await import('@chakra-docs/next/pages');
const astro = await import('@chakra-docs/astro');
const reactRouter = await import('@chakra-docs/react-router');
const pagefind = await import('@chakra-docs/search-pagefind');
const feed = await import('@chakra-docs/feed');

const tempDir = await mkdtemp(path.join(os.tmpdir(), 'chakra-docs-smoke-'));

try {
  await mkdir(path.join(tempDir, 'content/docs'), { recursive: true });
  await writeFile(
    path.join(tempDir, 'content/docs/_meta.json'),
    JSON.stringify({
      'getting-started': 'Getting started',
      hidden: { hidden: true },
    }),
    'utf8',
  );
  await writeFile(
    path.join(tempDir, 'content/docs/getting-started.mdx'),
    `---
title: Getting started
description: Install and configure docs.
date: 2026-01-01
tags: [docs, guide]
---

# Getting started

Install and configure docs.

## Install

Run the installer.
`,
    'utf8',
  );
  await writeFile(
    path.join(tempDir, 'content/docs/hidden.md'),
    '# Hidden\n\nThis should not publish.',
    'utf8',
  );

  const discoveryConfig = {
    rootDir: tempDir,
    outDir: '.chakra-docs/generated',
    collections: [
      {
        id: 'docs',
        contentDir: 'content/docs',
        basePath: '/docs',
      },
    ],
  };

  const manifest = await sourceFilesystem.buildFilesystemManifest({
    config: discoveryConfig,
  });
  assert.equal(manifest.pages.length, 2);
  assert.equal(manifest.search.length, 2);
  assert.deepEqual(
    manifest.search.map((record) => record.kind),
    ['page', 'heading'],
  );
  assert.equal(manifest.pages[0].title, 'Getting started');
  assert.equal(manifest.pages[0].headings[0].id, 'install');

  const searchEngine = search.createDocsSearchEngine(manifest.search);
  assert.deepEqual(
    searchEngine
      .search({ query: 'install', limit: 1 })
      .results.map((result) => ({
        route: result.route,
        title: result.title,
      })),
    [{ route: '/docs/getting-started#install', title: 'Install' }],
  );

  const generatedManifest = await cli.buildDocsManifest({
    config: discoveryConfig,
  });
  assert.equal(generatedManifest.pages.length, 2);
  const generatedOutDir = await cli.writeGeneratedManifest(
    discoveryConfig,
    generatedManifest,
  );
  await readFile(path.join(generatedOutDir, 'manifest.json'), 'utf8');
  await writeFile(
    path.join(tempDir, 'chakra-docs.config.json'),
    JSON.stringify(discoveryConfig),
    'utf8',
  );
  await cli.runCli({
    cwd: tempDir,
    argv: [
      'validate',
      '--config',
      path.join(tempDir, 'chakra-docs.config.json'),
    ],
  });

  assert.deepEqual(await sourceGit.syncGitRepositories(discoveryConfig), []);

  assert.equal(
    core.getPageByRoute(manifest, '/docs/getting-started')?.title,
    'Getting started',
  );
  assert.deepEqual(nextApp.createGenerateStaticParams({ manifest })(), [
    { slug: ['getting-started'] },
  ]);
  assert.deepEqual(nextPages.createGetStaticPaths({ manifest })().paths, [
    { params: { slug: ['getting-started'] } },
  ]);
  assert.deepEqual(astro.createAstroStaticPaths(manifest), [
    { params: { slug: 'getting-started' } },
  ]);
  assert.deepEqual(
    reactRouter.createDocsRoutes(manifest).map((route) => route.path),
    ['/docs/getting-started'],
  );
  const pagefindRecords = pagefind.createPagefindDocumentRecords(
    manifest.search,
  );
  assert.equal(pagefindRecords[0].url, '/docs/getting-started');
  assert.equal(pagefindRecords[0].title, 'Getting started');
  assert.match(pagefindRecords[0].content, /Install and configure docs/);
  assert.deepEqual(pagefindRecords[0].meta, {
    id: 'docs:getting-started',
    kind: 'page',
    pageId: 'docs:getting-started',
    pageTitle: 'Getting started',
    sectionTitle: '',
    headingId: '',
    collectionId: 'docs',
  });

  const feedArtifacts = feed.createFeedArtifacts(manifest.feeds, {
    title: 'Docs',
    siteUrl: 'https://example.com',
  });
  assert.match(feedArtifacts.rss, /<rss version="2.0">/);
  assert.match(
    feedArtifacts.atom,
    /<feed xmlns="http:\/\/www.w3.org\/2005\/Atom">/,
  );
  assert.equal(
    JSON.parse(feedArtifacts.json).items[0].url,
    'https://example.com/docs/getting-started',
  );

  const markup = renderToStaticMarkup(
    createElement(
      ChakraProvider,
      { value: defaultSystem },
      createElement(
        chakra.DocsProvider,
        null,
        createElement(
          chakra.DocsLayout,
          {
            page: manifest.pages[0],
            nav: manifest.nav,
            headings: manifest.pages[0].headings,
          },
          createElement(chakra.Callout, { title: 'Note' }, 'Rendered'),
        ),
      ),
    ),
  );
  assert.match(markup, /Getting started/);
  assert.match(markup, /Rendered/);

  assert.throws(
    () =>
      core.createDocsManifest({
        collections: [
          {
            id: 'docs',
            basePath: '/docs',
            pages: [
              manifest.pages[0],
              {
                ...manifest.pages[0],
                id: 'docs:duplicate',
                slug: ['duplicate'],
              },
            ],
            nav: [],
          },
        ],
      }),
    /Duplicate docs route/,
  );
} finally {
  await rm(tempDir, { recursive: true, force: true });
}

await smokePackedConsumer();

async function smokePackedConsumer() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'chakra-docs-consumer-'));
  const packDir = path.join(root, 'packs');
  const consumerDir = path.join(root, 'consumer');
  const npmEnv = {
    ...process.env,
    npm_config_cache: path.join(root, '.npm-cache'),
  };

  try {
    await mkdir(packDir, { recursive: true });
    await mkdir(consumerDir, { recursive: true });

    const dependencies = {};

    for (const packageName of publicPackages) {
      const packageRoot = packageRoots.get(packageName);
      assert.ok(packageRoot, `Missing package root for ${packageName}`);
      const absolutePackageRoot = path.resolve(workspaceRoot, packageRoot);
      const { stdout } = await execFileAsync(
        'npm',
        ['pack', absolutePackageRoot, '--pack-destination', packDir, '--json'],
        { cwd: workspaceRoot, env: npmEnv, maxBuffer: 10 * 1024 * 1024 },
      );
      const [packResult] = parseNpmPackOutput(stdout);
      assert.ok(packResult?.filename, `${packageName} must produce a tarball`);
      assert.ok(
        packResult.size <= 2 * 1024 * 1024,
        `${packageName} tarball exceeds the 2 MiB release budget`,
      );
      assert.ok(
        packResult.unpackedSize <= 8 * 1024 * 1024,
        `${packageName} unpacked package exceeds the 8 MiB release budget`,
      );
      assert.equal(
        packResult.files.some((file) => file.path.endsWith('.d.ts.map')),
        false,
        `${packageName} must not publish declaration maps without sources`,
      );

      const unexpectedFiles = packResult.files
        .map((file) => file.path)
        .filter(
          (filePath) =>
            filePath !== 'LICENSE' &&
            filePath !== 'README.md' &&
            filePath !== 'package.json' &&
            !filePath.startsWith('dist/'),
        );
      assert.deepEqual(
        unexpectedFiles,
        [],
        `${packageName} packed unexpected files`,
      );

      dependencies[packageName] =
        `file:${path.join(packDir, packResult.filename)}`;
    }

    for (const dependencyName of [
      '@types/node',
      '@types/react',
      '@types/react-dom',
      '@chakra-ui/react',
      '@emotion/react',
      'next',
      'react',
      'react-dom',
      'typescript',
    ]) {
      const installedManifest = await readJson(
        `node_modules/${dependencyName}/package.json`,
      );
      dependencies[dependencyName] = installedManifest.version;
    }

    if (peerProfile === 'minimum') {
      Object.assign(dependencies, {
        // 4.1 is the first 4.x release whose React type peers can coexist with
        // the type surface used by Next 15.5 in this combined consumer.
        '@astrojs/react': '4.1.0',
        '@chakra-ui/react': '3.36.0',
        '@emotion/react': '11.0.0',
        astro: '5.0.0',
        next: '15.5.18',
        pagefind: '1.0.0',
        react: '18.2.0',
        'react-dom': '18.2.0',
        'react-router': '7.0.0',
        '@types/node': '22.20.1',
        // Next 15.5 itself is developed against the React 19 type surface even
        // when exercising its supported React 18 runtime floor.
        '@types/react': '19.0.8',
        '@types/react-dom': '19.0.3',
        typescript: '5.9.2',
      });
    } else {
      for (const dependencyName of ['astro', 'react-router']) {
        const installedManifest = await readJson(
          `node_modules/${dependencyName}/package.json`,
        );
        dependencies[dependencyName] = installedManifest.version;
      }
    }

    await writeFile(
      path.join(consumerDir, 'package.json'),
      `${JSON.stringify(
        {
          name: 'chakra-docs-packed-consumer',
          private: true,
          type: 'module',
          dependencies,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    await execFileAsync(
      'npm',
      [
        'install',
        '--ignore-scripts',
        '--strict-peer-deps',
        '--no-audit',
        '--no-fund',
        '--no-package-lock',
      ],
      { cwd: consumerDir, env: npmEnv, maxBuffer: 20 * 1024 * 1024 },
    );

    const publicEntryPoints = [
      ...publicPackages,
      '@chakra-docs/search/client',
      '@chakra-docs/search/http',
      '@chakra-docs/next/app',
      '@chakra-docs/next/link',
      '@chakra-docs/next/pages',
      '@chakra-docs/next/search',
    ];
    await writeFile(
      path.join(consumerDir, 'imports.mjs'),
      `const entryPoints = ${JSON.stringify(publicEntryPoints)};
for (const entryPoint of entryPoints) {
  await import(entryPoint);
}

const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const { ChakraProvider, defaultSystem } = await import('@chakra-ui/react');
const { Callout, CodeBlock, DocsProvider } = await import('@chakra-docs/chakra');
const markup = renderToStaticMarkup(
  createElement(
    ChakraProvider,
    { value: defaultSystem },
    createElement(
      DocsProvider,
      null,
      createElement(Callout, { title: 'Packed' }, 'Rendered'),
      createElement(CodeBlock, {
        code: 'const packed = true;',
        language: 'ts',
        title: 'Packed code',
      }),
    ),
  ),
);
if (
  !markup.includes('Packed') ||
  !markup.includes('Rendered') ||
  !markup.includes('const packed = true;')
) {
  throw new Error('Packed Chakra peer combination did not render correctly.');
}
`,
      'utf8',
    );
    await execFileAsync(process.execPath, ['imports.mjs'], {
      cwd: consumerDir,
      maxBuffer: 10 * 1024 * 1024,
    });

    await writeFile(
      path.join(consumerDir, 'tsconfig.json'),
      `${JSON.stringify(
        {
          compilerOptions: {
            jsx: 'react-jsx',
            lib: ['ESNext', 'DOM', 'DOM.Iterable'],
            module: 'ESNext',
            moduleResolution: 'Bundler',
            noEmit: true,
            skipLibCheck: false,
            strict: true,
            target: 'ES2022',
          },
          include: ['types.tsx'],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    await writeFile(
      path.join(consumerDir, 'types.tsx'),
      `import { DocsProvider, DocsSearch } from '@chakra-docs/chakra';
import type { DocsManifest } from '@chakra-docs/core';
import { createFeedArtifacts } from '@chakra-docs/feed';
import { createGenerateStaticParams } from '@chakra-docs/next/app';
import { NextLink } from '@chakra-docs/next/link';
import { createGetStaticPaths } from '@chakra-docs/next/pages';
import { createAstroStaticPaths } from '@chakra-docs/astro';
import { createDocsRoutes } from '@chakra-docs/react-router';
import { createPagefindDocumentRecords } from '@chakra-docs/search-pagefind';
import { createDocsSearchEngine } from '@chakra-docs/search';
import { createHttpSearchProvider } from '@chakra-docs/search/client';
import { createFetchSearchHandler } from '@chakra-docs/search/http';
import { createAppRouterSearchHandler } from '@chakra-docs/next/search';

declare const manifest: DocsManifest;

createGenerateStaticParams({ manifest })();
createGetStaticPaths({ manifest })();
createAstroStaticPaths(manifest);
createDocsRoutes(manifest);
createPagefindDocumentRecords(manifest.search);
const searchEngine = createDocsSearchEngine(manifest.search);
searchEngine.search({ query: 'docs', collectionIds: ['docs'], limit: 8 });
createHttpSearchProvider('/api/docs/search');
createFetchSearchHandler(searchEngine);
createAppRouterSearchHandler(searchEngine);
createFeedArtifacts(manifest.feeds, { title: 'Docs', siteUrl: 'https://example.com', updated: '2026-01-01' });

const tree = (
  <DocsProvider config={{ linkComponent: NextLink }}>
    <DocsSearch records={manifest.search} />
  </DocsProvider>
);
void tree;
`,
      'utf8',
    );
    const tscPath = path.join(
      consumerDir,
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'tsc.cmd' : 'tsc',
    );
    await execFileAsync(tscPath, ['--noEmit', '-p', 'tsconfig.json'], {
      cwd: consumerDir,
      maxBuffer: 20 * 1024 * 1024,
    });

    await mkdir(path.join(consumerDir, 'content/docs'), { recursive: true });
    await writeFile(
      path.join(consumerDir, 'content/docs/index.md'),
      '# Packed consumer\n\nInstalled from tarballs.',
      'utf8',
    );
    await writeFile(
      path.join(consumerDir, 'chakra-docs.config.json'),
      JSON.stringify({
        rootDir: consumerDir,
        collections: [
          { id: 'docs', contentPath: 'content/docs', basePath: '/docs' },
        ],
      }),
      'utf8',
    );

    const cliName =
      process.platform === 'win32' ? 'chakra-docs.cmd' : 'chakra-docs';
    const cliPath = path.join(consumerDir, 'node_modules', '.bin', cliName);
    const { stdout: cliOutput } = await execFileAsync(
      cliPath,
      ['validate', '--config', 'chakra-docs.config.json'],
      { cwd: consumerDir, maxBuffer: 10 * 1024 * 1024 },
    );
    assert.match(cliOutput, /Validated 1 page\(s\) across 1 collection\(s\)\./);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function hasSourceCondition(value) {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (Object.hasOwn(value, '@chakra-docs/source')) {
    return true;
  }

  return Object.values(value).some((child) => hasSourceCondition(child));
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function parseNpmPackOutput(output) {
  const starts = [0];

  for (let index = 0; index < output.length; index += 1) {
    if (output[index] === '\n') {
      starts.push(index + 1);
    }
  }

  for (const start of starts.reverse()) {
    const candidate = output.slice(start).trim();

    if (!candidate.startsWith('[')) {
      continue;
    }

    try {
      const parsed = JSON.parse(candidate);

      if (
        Array.isArray(parsed) &&
        parsed.every(
          (entry) =>
            typeof entry === 'object' &&
            entry !== null &&
            typeof entry.filename === 'string',
        )
      ) {
        return parsed;
      }
    } catch {
      // Continue searching earlier line boundaries for the final JSON array.
    }
  }

  throw new Error('npm pack did not emit a valid JSON result array.');
}
