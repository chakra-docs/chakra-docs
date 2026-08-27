import { describe, expect, it } from 'vitest';
import { createDocsManifest } from './helpers.js';
import {
  createDocsLlmsFullText,
  createDocsLlmsText,
  createDocsMarkdown,
} from './documents.js';
import type { DocsCollection, DocsPage } from './types.js';

const guide: DocsPage = {
  id: 'docs:guide',
  collectionId: 'docs',
  slug: ['guide'],
  path: 'docs/guide.mdx',
  route: '/docs/guide',
  title: 'Guide [start]',
  description: 'Build the\nfirst page.',
  frontmatter: {
    author: 'Docs team',
    date: new Date('2026-08-27T12:00:00.000Z'),
    tags: ['guide', 'setup'],
  },
  body: '# Guide\n\nUse the guide.',
};

const optional: DocsPage = {
  ...guide,
  id: 'docs:reference',
  slug: ['reference'],
  route: '/docs/reference',
  title: 'Reference',
  description: undefined,
  frontmatter: {},
  body: '## API\n\nDetails.',
};

const draft: DocsPage = {
  ...guide,
  id: 'docs:draft',
  slug: ['draft'],
  route: '/docs/draft',
  title: 'Draft',
  frontmatter: { draft: true },
};

const collection: DocsCollection = {
  id: 'docs',
  name: 'Guides',
  basePath: '/docs',
  pages: [guide, optional, draft],
  nav: [],
};

const manifest = createDocsManifest({ collections: [collection] });

describe('createDocsMarkdown', () => {
  it('creates deterministic public frontmatter and preserves the body', () => {
    expect(createDocsMarkdown(guide)).toBe(
      [
        '---',
        'title: "Guide [start]"',
        'description: "Build the\\nfirst page."',
        'author: "Docs team"',
        'date: "2026-08-27T12:00:00.000Z"',
        'tags: ["guide","setup"]',
        '---',
        '',
        '# Guide',
        '',
        'Use the guide.',
        '',
      ].join('\n'),
    );
  });

  it('supports a transformed body and frontmatter-free output', () => {
    expect(
      createDocsMarkdown(guide, {
        body: '# Plain Markdown',
        includeFrontmatter: false,
      }),
    ).toBe('# Plain Markdown\n');
  });

  it('falls back to a title heading when a page has no body', () => {
    expect(
      createDocsMarkdown(
        { ...optional, body: undefined },
        {
          includeFrontmatter: false,
        },
      ),
    ).toBe('# Reference\n');
  });
});

describe('createDocsLlmsText', () => {
  it('creates collection file lists with Markdown page URLs', () => {
    expect(
      createDocsLlmsText(manifest, {
        title: '# Example Docs',
        description: 'Documentation for\nExample.',
        details: 'Prefer the guides in order.',
        siteUrl: 'https://example.com/base/',
        optionalPageIds: [optional.id],
      }),
    ).toBe(
      [
        '# Example Docs',
        '',
        '> Documentation for Example.',
        '',
        'Prefer the guides in order.',
        '',
        '## Guides',
        '',
        '- [Guide \\[start\\]](https://example.com/docs/guide.md): Build the first page.',
        '',
        '## Optional',
        '',
        '- [Reference](https://example.com/docs/reference.md)',
        '',
      ].join('\n'),
    );
  });

  it('omits drafts by default and can include them explicitly', () => {
    expect(createDocsLlmsText(manifest)).not.toContain('Draft');
    expect(createDocsLlmsText(manifest, { includeDrafts: true })).toContain(
      '[Draft](/docs/draft.md)',
    );
  });
});

describe('createDocsLlmsFullText', () => {
  it('includes the full body of every published page', () => {
    const text = createDocsLlmsFullText(manifest, {
      title: 'Example Docs',
      siteUrl: 'https://example.com',
    });

    expect(text).toContain('## Guide [start]');
    expect(text).toContain('Source: https://example.com/docs/guide.md');
    expect(text).toContain('Use the guide.');
    expect(text).toContain('## Reference');
    expect(text).not.toContain('## Draft');
  });
});
