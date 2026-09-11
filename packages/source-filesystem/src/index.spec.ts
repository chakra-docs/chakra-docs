import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  buildFilesystemManifest,
  createFilesystemSource,
  DEFAULT_FILESYSTEM_CONTENT_LIMITS,
} from './index.js';
import type { FilesystemContentLimits } from './index.js';
import type {
  DocsFrontmatter,
  DocsManifest,
  DocsPage,
  DocsStandardSchemaV1,
} from '@chakra-docs/core';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function createFixture(
  files: Record<string, string>,
): Promise<{ rootDir: string; contentRoot: string }> {
  const rootDir = await mkdtemp(
    path.join(os.tmpdir(), 'chakra-docs-source-filesystem-'),
  );
  tempDirs.push(rootDir);
  const contentRoot = path.join(rootDir, 'content/docs');

  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(contentRoot, relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, 'utf8');
  }

  return { rootDir, contentRoot };
}

async function buildFixtureManifest(
  files: Record<string, string>,
  limits?: FilesystemContentLimits,
): Promise<DocsManifest> {
  const { rootDir } = await createFixture(files);

  return buildFilesystemManifest({
    limits,
    config: {
      rootDir,
      collections: [
        {
          id: 'docs',
          contentDir: 'content/docs',
          basePath: '/docs',
        },
      ],
    },
  });
}

function getPage(manifest: DocsManifest, id: string): DocsPage {
  const page = manifest.pages.find((candidate) => candidate.id === id);

  if (!page) {
    throw new Error(`Expected page "${id}" in manifest.`);
  }

  return page;
}

describe('buildFilesystemManifest frontmatter parsing', () => {
  it('parses scalar values, quoted strings, and inline arrays', async () => {
    const manifest = await buildFixtureManifest({
      'getting-started.mdx': [
        '---',
        'title: "Getting started"',
        "subtitle: 'Install the docs'",
        'order: 2',
        'version: 1.5',
        'negative: -3',
        'draft: false',
        'featured: true',
        'owner: null',
        'tags: [docs, guide, api]',
        '# a comment that must be skipped',
        '',
        'plain: Hello world',
        '---',
        '',
        'Body text.',
        '',
      ].join('\n'),
    });

    const page = getPage(manifest, 'docs:getting-started');

    expect(page.title).toBe('Getting started');
    expect(page.frontmatter).toMatchObject({
      title: 'Getting started',
      subtitle: 'Install the docs',
      order: 2,
      version: 1.5,
      negative: -3,
      draft: false,
      featured: true,
      owner: null,
      tags: ['docs', 'guide', 'api'],
      plain: 'Hello world',
    });
    expect(page.frontmatter).not.toHaveProperty('# a comment');
    expect(page.body).toBe('\nBody text.\n');
  });

  it('rejects a document without a closing frontmatter delimiter', async () => {
    const raw = ['---', 'title: Broken', 'Body without closing fence.'].join(
      '\n',
    );
    await expect(
      buildFixtureManifest({ 'broken-doc.md': raw }),
    ).rejects.toThrow('Unterminated frontmatter');
  });

  it('parses frontmatter and body with CRLF line endings', async () => {
    const manifest = await buildFixtureManifest({
      'windows.md': [
        '---',
        'title: Windows',
        'order: 1',
        '---',
        '',
        '## Section',
        '',
        'Body line.',
        '',
      ].join('\r\n'),
    });

    const page = getPage(manifest, 'docs:windows');

    expect(page.title).toBe('Windows');
    expect(page.frontmatter.order).toBe(1);
    expect(page.body).toContain('Body line.');
    expect(page.headings).toEqual([
      { id: 'section', title: 'Section', level: 2 },
    ]);
  });

  it('parses block YAML, nested objects, and block arrays', async () => {
    const manifest = await buildFixtureManifest({
      'yaml.md': [
        '---',
        'title: YAML',
        'description: >-',
        '  A folded',
        '  description.',
        'tags:',
        '  - docs',
        '  - guide',
        'extra:',
        '  owner: team-docs',
        '  stable: true',
        '---',
        '# YAML',
      ].join('\n'),
    });

    expect(getPage(manifest, 'docs:yaml').frontmatter).toMatchObject({
      description: 'A folded description.',
      tags: ['docs', 'guide'],
      extra: { owner: 'team-docs', stable: true },
    });
  });

  it.each([
    ['title', 'true', 'a string'],
    ['order', 'first', 'a finite number'],
    ['draft', 'yes', 'a boolean'],
    ['tags', '[docs, 3]', 'an array of strings'],
    ['date', 'not-a-date', 'a valid date string or Date'],
  ])('rejects an invalid %s field', async (key, value, expected) => {
    await expect(
      buildFixtureManifest({
        'invalid.md': `---\n${key}: ${value}\n---\n# Invalid\n`,
      }),
    ).rejects.toThrow(`"${key}" must be ${expected}`);
  });

  it('applies Standard Schema validation and transformed output', async () => {
    const { rootDir } = await createFixture({
      'schema.md': '---\ntitle: Schema\nrank: 3\n---\n# Schema\n',
    });
    const schema: DocsStandardSchemaV1<DocsFrontmatter> = {
      '~standard': {
        version: 1,
        vendor: 'test',
        validate(value) {
          const frontmatter = value as DocsFrontmatter;
          return {
            value: { ...frontmatter, order: Number(frontmatter.rank) },
          };
        },
      },
    };

    const manifest = await buildFilesystemManifest({
      config: {
        rootDir,
        collections: [
          {
            id: 'docs',
            contentDir: 'content/docs',
            schema,
          },
        ],
      },
    });

    expect(getPage(manifest, 'docs:schema').frontmatter.order).toBe(3);
  });

  it('reports Standard Schema issues with their field paths', async () => {
    const { rootDir } = await createFixture({
      'schema.md': '---\ntitle: Schema\n---\n# Schema\n',
    });
    const schema: DocsStandardSchemaV1<DocsFrontmatter> = {
      '~standard': {
        version: 1,
        vendor: 'test',
        validate() {
          return { issues: [{ path: ['title'], message: 'must be approved' }] };
        },
      },
    };

    await expect(
      buildFilesystemManifest({
        config: {
          rootDir,
          collections: [{ id: 'docs', contentDir: 'content/docs', schema }],
        },
      }),
    ).rejects.toThrow('title: must be approved');
  });
});

describe('buildFilesystemManifest headings', () => {
  it('aligns CommonMark headings, page titles and search sections', async () => {
    const manifest = await buildFixtureManifest({
      'commonmark.md':
        'Page\n====\n\nSection\n-------\n\nFirst body\n\n  ## **Section** ##\n\nSecond body\n\n## [Guide][ref]\n\n[ref]: /docs/guide',
    });
    const page = getPage(manifest, 'docs:commonmark');
    expect(page.title).toBe('Page');
    expect(page.headings).toEqual([
      { id: 'section', title: 'Section', level: 2 },
      { id: 'section-2', title: 'Section', level: 2 },
      { id: 'guide', title: 'Guide', level: 2 },
    ]);
    expect(
      manifest.search.find((record) => record.headingId === 'section')?.text,
    ).toContain('First body');
    expect(
      manifest.search.find((record) => record.headingId === 'section')?.text,
    ).not.toContain('Second body');
  });

  it('extracts h2-h6, skips fenced code, strips markdown, and dedupes ids', async () => {
    const manifest = await buildFixtureManifest({
      'headings.md': [
        '---',
        'title: Headings',
        '---',
        '',
        '# Page title',
        '',
        '## Install',
        '',
        '```bash',
        '## not a heading',
        '```',
        '',
        '~~~',
        '### also not a heading',
        '~~~',
        '',
        '### Usage',
        '',
        '## Usage',
        '',
        '#### The **Install** [step](https://example.com)',
        '',
        '###### Deep',
        '',
      ].join('\n'),
    });

    const page = getPage(manifest, 'docs:headings');

    expect(page.headings).toEqual([
      { id: 'install', title: 'Install', level: 2 },
      { id: 'usage', title: 'Usage', level: 3 },
      { id: 'usage-2', title: 'Usage', level: 2 },
      { id: 'the-install-step', title: 'The Install step', level: 4 },
      { id: 'deep', title: 'Deep', level: 6 },
    ]);
  });

  it('only closes fenced code with a matching marker', async () => {
    const manifest = await buildFixtureManifest({
      'mixed-fences.md': [
        '# Page',
        '',
        '```tsx',
        '~~~',
        '## Hidden in backticks',
        '```',
        '## Visible after backticks',
        '~~~md',
        '```',
        '## Hidden in tildes',
        '~~~',
        '## Visible after tildes',
      ].join('\n'),
      'title-fence.md': [
        '```md',
        '~~~',
        '# Hidden title',
        '```',
        '# Visible title',
      ].join('\n'),
    });

    expect(getPage(manifest, 'docs:mixed-fences').headings).toEqual([
      {
        id: 'visible-after-backticks',
        title: 'Visible after backticks',
        level: 2,
      },
      {
        id: 'visible-after-tildes',
        title: 'Visible after tildes',
        level: 2,
      },
    ]);
    expect(getPage(manifest, 'docs:title-fence').title).toBe('Visible title');
  });
});

describe('buildFilesystemManifest titles', () => {
  it('resolves titles from frontmatter, meta, first h1, then the slug', async () => {
    const manifest = await buildFixtureManifest({
      '_meta.json': JSON.stringify({
        'meta-title': 'From Meta',
      }),
      'fm-title.md': '---\ntitle: From Frontmatter\n---\n\n# Ignored\n',
      'meta-title.md': '# Ignored By Meta\n',
      'h1-title.md': '# From Heading One\n\nIntro paragraph.\n',
      'plain-file.md': 'Just a paragraph, no headings.\n',
    });

    expect(getPage(manifest, 'docs:fm-title').title).toBe('From Frontmatter');
    expect(getPage(manifest, 'docs:meta-title').title).toBe('From Meta');
    expect(getPage(manifest, 'docs:h1-title').title).toBe('From Heading One');
    expect(getPage(manifest, 'docs:plain-file').title).toBe('Plain File');
  });
});

describe('buildFilesystemManifest meta files', () => {
  it('applies string, number, and object meta entries to pages and nav', async () => {
    const manifest = await buildFixtureManifest({
      '_meta.json': JSON.stringify({
        intro: 'Introduction',
        setup: 2,
        secret: { hidden: true },
        extras: { title: 'Extras', badge: 'New', order: 5 },
      }),
      'intro.md': 'Intro body.\n',
      'setup.md': 'Setup body.\n',
      'secret.md': 'Secret body.\n',
      'extras.md': 'Extras body.\n',
    });

    expect(getPage(manifest, 'docs:intro').frontmatter.order).toBe(0);
    expect(getPage(manifest, 'docs:setup').frontmatter.order).toBe(2);
    expect(getPage(manifest, 'docs:secret').frontmatter.hidden).toBe(true);
    expect(getPage(manifest, 'docs:extras').frontmatter.order).toBe(5);

    expect(manifest.nav).toEqual([
      expect.objectContaining({
        id: 'docs:intro',
        title: 'Introduction',
        href: '/docs/intro',
      }),
      expect.objectContaining({ id: 'docs:setup', href: '/docs/setup' }),
      expect.objectContaining({
        id: 'docs:extras',
        title: 'Extras',
        href: '/docs/extras',
        badge: 'New',
      }),
    ]);
  });

  it('throws a descriptive error for malformed meta files', async () => {
    const { rootDir, contentRoot } = await createFixture({
      '_meta.json': '{ definitely not json',
      'intro.md': 'Intro body.\n',
    });

    await expect(
      buildFilesystemManifest({
        config: {
          rootDir,
          collections: [
            { id: 'docs', contentDir: 'content/docs', basePath: '/docs' },
          ],
        },
      }),
    ).rejects.toThrow(
      `Failed to parse meta file ${path.join(contentRoot, '_meta.json')}`,
    );
  });
});

describe('buildFilesystemManifest slugs and routes', () => {
  it('collapses index files and nests directory slugs', async () => {
    const manifest = await buildFixtureManifest({
      'index.md': '# Home\n',
      'guides/index.md': '# Guides\n',
      'guides/setup.md': '# Setup\n',
    });

    const home = getPage(manifest, 'docs:index');
    const guides = getPage(manifest, 'docs:guides');
    const setup = getPage(manifest, 'docs:guides/setup');

    expect(home.slug).toEqual([]);
    expect(home.route).toBe('/docs');
    expect(guides.slug).toEqual(['guides']);
    expect(guides.route).toBe('/docs/guides');
    expect(setup.slug).toEqual(['guides', 'setup']);
    expect(setup.route).toBe('/docs/guides/setup');
    expect(setup.path).toBe('guides/setup.md');
  });

  it('joins root and trailing-slash base paths and encodes slug segments', async () => {
    const { rootDir } = await createFixture({
      'index.md': '# Home\n',
      'space #?%.md': '# Special\n',
      '%2e%2e.md': '# Encoded traversal\n',
    });
    const rootManifest = await buildFilesystemManifest({
      config: {
        rootDir,
        collections: [
          { id: 'docs', contentDir: 'content/docs', basePath: '////' },
        ],
      },
    });

    expect(rootManifest.collections[0].basePath).toBe('/');
    expect(getPage(rootManifest, 'docs:index').route).toBe('/');
    expect(getPage(rootManifest, 'docs:space #?%').route).toBe(
      '/space%20%23%3F%25',
    );
    expect(getPage(rootManifest, 'docs:%2e%2e').route).toBe('/%252e%252e');

    const nestedManifest = await buildFilesystemManifest({
      config: {
        rootDir,
        collections: [
          {
            id: 'docs',
            contentDir: 'content/docs',
            basePath: '//docs///reference///',
          },
        ],
      },
    });

    expect(nestedManifest.collections[0].basePath).toBe('/docs/reference');
    expect(getPage(nestedManifest, 'docs:space #?%').route).toBe(
      '/docs/reference/space%20%23%3F%25',
    );
  });

  it('keeps hidden pages out of nav and draft pages out of search', async () => {
    const manifest = await buildFixtureManifest({
      'visible.md': '# Visible\n\nVisible body.\n',
      'stealth.md': '---\nhidden: true\n---\n\n# Stealth\n',
      'draft.md': '---\ndraft: true\n---\n\n# Draft\n',
    });

    expect(manifest.pages.map((page) => page.id).sort()).toEqual([
      'docs:draft',
      'docs:stealth',
      'docs:visible',
    ]);
    expect(manifest.nav.map((item) => item.id)).toEqual(['docs:visible']);
    expect(
      manifest.search.every((record) => record.pageId !== 'docs:draft'),
    ).toBe(true);
    expect(
      manifest.search.some((record) => record.pageId === 'docs:visible'),
    ).toBe(true);
  });
});

describe('buildFilesystemManifest content limits', () => {
  it('publishes conservative defaults and accepts optional overrides', async () => {
    expect(DEFAULT_FILESYSTEM_CONTENT_LIMITS).toEqual({
      maxFiles: 5_000,
      maxFileBytes: 1_048_576,
      maxTotalBytes: 52_428_800,
    });
    expect(Object.isFrozen(DEFAULT_FILESYSTEM_CONTENT_LIMITS)).toBe(true);

    const manifest = await buildFixtureManifest(
      { 'index.md': '# Home\n' },
      { maxFiles: 1, maxFileBytes: 16, maxTotalBytes: 16 },
    );

    expect(manifest.pages).toHaveLength(1);
  });

  it('rejects non-positive, non-integer, and non-object limits', async () => {
    const { rootDir } = await createFixture({ 'index.md': '# Home\n' });
    const config = {
      rootDir,
      collections: [{ id: 'docs', contentDir: 'content/docs' }],
    };

    for (const name of ['maxFiles', 'maxFileBytes', 'maxTotalBytes'] as const) {
      await expect(
        buildFilesystemManifest({ config, limits: { [name]: 0 } }),
      ).rejects.toThrow(`Invalid filesystem content limit "${name}"`);
    }

    await expect(
      buildFilesystemManifest({ config, limits: { maxFiles: 1.5 } }),
    ).rejects.toThrow('expected a positive safe integer');
    await expect(
      buildFilesystemManifest({ config, limits: [] as never }),
    ).rejects.toThrow('expected an object');
  });

  it('enforces the cumulative file limit before parsing any content', async () => {
    const malformed = '---\ntitle: [unterminated\n---\n';

    await expect(
      buildFixtureManifest(
        {
          'a-broken.md': malformed,
          'b.md': '# B\n',
        },
        { maxFiles: 1 },
      ),
    ).rejects.toThrow('Filesystem content limit "maxFiles" exceeded');
  });

  it('accumulates file and byte budgets across collections', async () => {
    const { rootDir } = await createFixture({ 'a.md': '# A\n' });
    await mkdir(path.join(rootDir, 'content/api'), { recursive: true });
    await writeFile(path.join(rootDir, 'content/api/b.md'), '# B\n', 'utf8');
    const config = {
      rootDir,
      collections: [
        { id: 'docs', contentDir: 'content/docs' },
        { id: 'api', contentDir: 'content/api' },
      ],
    };

    await expect(
      buildFilesystemManifest({ config, limits: { maxFiles: 1 } }),
    ).rejects.toThrow('2 files > 1 file');
    await expect(
      buildFilesystemManifest({
        config,
        limits: { maxFiles: 2, maxFileBytes: 4, maxTotalBytes: 7 },
      }),
    ).rejects.toThrow('8 bytes > 7 bytes');
  });

  it('enforces individual and total UTF-8 byte limits before parsing', async () => {
    const malformed = '---\ntitle: [unterminated\n---\n';
    const malformedBytes = Buffer.byteLength(malformed);

    await expect(
      buildFixtureManifest(
        { 'oversized.md': malformed },
        { maxFileBytes: malformedBytes - 1 },
      ),
    ).rejects.toThrow('Filesystem content limit "maxFileBytes" exceeded');

    await expect(
      buildFixtureManifest(
        {
          'a-broken.md': malformed,
          'b-broken.md': malformed,
        },
        {
          maxFileBytes: malformedBytes,
          maxTotalBytes: malformedBytes * 2 - 1,
        },
      ),
    ).rejects.toThrow('Filesystem content limit "maxTotalBytes" exceeded');

    await expect(
      buildFixtureManifest({ 'unicode.md': '😀' }, { maxFileBytes: 3 }),
    ).rejects.toThrow('4 bytes > 3 bytes');
  });

  it('budgets the selected metadata file before JSON parsing', async () => {
    const metadata = '{ definitely not valid JSON because it is oversized';
    const content = '# Home\n';
    const metadataBytes = Buffer.byteLength(metadata);
    const contentBytes = Buffer.byteLength(content);
    const { rootDir } = await createFixture({
      'index.md': content,
      'navigation.json': metadata,
    });
    const config = {
      rootDir,
      collections: [
        {
          id: 'docs',
          contentDir: 'content/docs',
          metaFileNames: ['missing.json', 'navigation.json'],
        },
      ],
    };

    await expect(
      buildFilesystemManifest({
        config,
        limits: { maxFileBytes: metadataBytes - 1 },
      }),
    ).rejects.toThrow(
      'Filesystem content limit "maxFileBytes" exceeded for metadata file "navigation.json"',
    );
    await expect(
      buildFilesystemManifest({
        config,
        limits: {
          maxFileBytes: metadataBytes,
          maxTotalBytes: contentBytes + metadataBytes - 1,
        },
      }),
    ).rejects.toThrow(
      'Filesystem content limit "maxTotalBytes" exceeded while discovering metadata',
    );
  });

  it('counts selected metadata bytes once without treating it as content', async () => {
    const metadata = '{"index":"Metadata title"}';
    const content = '# Content title\n';
    const { rootDir } = await createFixture({
      'index.md': content,
      'navigation.json': metadata,
    });
    const manifest = await buildFilesystemManifest({
      config: {
        rootDir,
        collections: [
          {
            id: 'docs',
            contentDir: 'content/docs',
            include: ['**/*'],
            metaFileNames: ['navigation.json'],
          },
        ],
      },
      limits: {
        maxFiles: 1,
        maxFileBytes: Buffer.byteLength(metadata),
        maxTotalBytes: Buffer.byteLength(metadata) + Buffer.byteLength(content),
      },
    });

    expect(manifest.pages).toHaveLength(1);
    expect(manifest.pages[0].title).toBe('Metadata title');
  });

  it('applies limits passed through createFilesystemSource', async () => {
    const { rootDir } = await createFixture({ 'oversized.md': '12345' });
    const source = createFilesystemSource({
      config: {
        rootDir,
        collections: [{ id: 'docs', contentDir: 'content/docs' }],
      },
      limits: { maxFileBytes: 4 },
    });

    await expect(source.getPages()).rejects.toThrow(
      'Filesystem content limit "maxFileBytes" exceeded',
    );
  });
});

describe('buildFilesystemManifest repository resolution', () => {
  it('rejects missing content roots and unknown repository references', async () => {
    const { rootDir } = await createFixture({ 'index.md': '# Home\n' });

    await expect(
      buildFilesystemManifest({
        config: {
          rootDir,
          collections: [{ id: 'missing', contentDir: 'does-not-exist' }],
        },
      }),
    ).rejects.toThrow('Content root for collection "missing" does not exist');

    await expect(
      buildFilesystemManifest({
        config: {
          rootDir,
          collections: [{ id: 'docs', repository: 'unknown' }],
        },
      }),
    ).rejects.toThrow(
      'Collection "docs" references unknown repository "unknown"',
    );
  });

  it('resolves workspace repositories by package name', async () => {
    const { rootDir } = await createFixture({ 'unused.md': '# Unused\n' });
    const packageRoot = path.join(
      rootDir,
      'node_modules/@fixture/workspace-docs',
    );
    await mkdir(path.join(packageRoot, 'content'), { recursive: true });
    await writeFile(
      path.join(packageRoot, 'package.json'),
      JSON.stringify({
        name: '@fixture/workspace-docs',
        version: '1.0.0',
        exports: { './package.json': './package.json' },
      }),
    );
    await writeFile(path.join(packageRoot, 'content/index.md'), '# Package\n');

    const manifest = await buildFilesystemManifest({
      config: {
        rootDir,
        repositories: [
          {
            id: 'workspace',
            type: 'workspace',
            packageName: '@fixture/workspace-docs',
          },
        ],
        collections: [
          {
            id: 'docs',
            repository: 'workspace',
            contentPath: 'content',
          },
        ],
      },
    });

    expect(manifest.pages[0]).toMatchObject({ title: 'Package', slug: [] });
    const resolvedPackageRoot = await realpath(packageRoot);
    const serialized = JSON.stringify(manifest);

    expect(manifest.repositories).toEqual([
      {
        id: 'workspace',
        type: 'workspace',
        packageName: '@fixture/workspace-docs',
      },
    ]);
    expect(serialized).not.toContain(resolvedPackageRoot);
    expect(serialized).not.toContain('rootDir');
  });

  it('uses the canonical Git cache regardless of generated outDir', async () => {
    const { rootDir } = await createFixture({ 'unused.md': '# Unused\n' });
    const repositoryRoot = path.join(rootDir, '.chakra-docs/git/my-repo-/docs');
    await mkdir(repositoryRoot, { recursive: true });
    await writeFile(path.join(repositoryRoot, 'index.md'), '# Git docs\n');

    const manifest = await buildFilesystemManifest({
      config: {
        rootDir,
        outDir: 'somewhere/entirely/different',
        repositories: [
          {
            id: 'my repo!',
            type: 'git',
            url: 'https://build-user:s3cr3t@example.com/docs.git?token=hidden#private',
            ref: 'v1',
            subdir: 'docs',
          },
        ],
        collections: [{ id: 'docs', repository: 'my repo!', contentPath: '.' }],
      },
    });

    expect(manifest.pages[0].title).toBe('Git docs');
    expect(manifest.repositories).toEqual([
      {
        id: 'my repo!',
        type: 'git',
        url: 'https://example.com/docs.git',
        ref: 'v1',
        subdir: 'docs',
      },
    ]);

    const serialized = JSON.stringify(manifest);
    expect(serialized).not.toContain(repositoryRoot);
    expect(serialized).not.toContain('s3cr3t');
    expect(serialized).not.toContain('token=hidden');
    expect(serialized).not.toContain('rootDir');
    expect(serialized).not.toContain('cacheDir');
  });

  it('rejects repository and content paths that escape their roots', async () => {
    const { rootDir } = await createFixture({ 'index.md': '# Home\n' });

    await expect(
      buildFilesystemManifest({
        config: {
          rootDir,
          repositories: [
            {
              id: 'git',
              type: 'git',
              url: 'https://example.com/docs.git',
              ref: 'v1',
              cacheDir: '../outside',
            },
          ],
          collections: [{ id: 'docs', repository: 'git' }],
        },
      }),
    ).rejects.toThrow('path must stay within');

    await expect(
      buildFilesystemManifest({
        config: {
          rootDir,
          collections: [{ id: 'docs', contentDir: '../outside' }],
        },
      }),
    ).rejects.toThrow('path must stay within');
  });
});
