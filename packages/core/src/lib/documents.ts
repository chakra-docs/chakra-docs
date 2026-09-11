import type { DocsManifest, DocsPage } from './types.js';
import { getPublishedPages } from './helpers.js';

export interface DocsMarkdownOptions {
  body?: string;
  includeFrontmatter?: boolean;
}

export interface DocsLlmsTextOptions {
  description?: string;
  details?: string;
  includeDrafts?: boolean;
  includeHidden?: boolean;
  markdownUrl?: (page: DocsPage) => string;
  optionalPageIds?: readonly string[];
  siteUrl?: string;
  title?: string;
}

export function createDocsMarkdown(
  page: DocsPage,
  options: DocsMarkdownOptions = {},
): string {
  const body = (options.body ?? page.body ?? `# ${page.title}`).trim();
  const parts: string[] = [];

  if (options.includeFrontmatter !== false) {
    parts.push(createMarkdownFrontmatter(page));
  }

  if (body) {
    parts.push(body);
  }

  return `${parts.join('\n\n')}\n`;
}

export function createDocsLlmsText(
  manifest: DocsManifest,
  options: DocsLlmsTextOptions = {},
): string {
  const title = options.title ?? 'Documentation';
  const publishedPages = getPublishedPages(manifest.pages, options);
  const optionalPageIds = new Set(options.optionalPageIds ?? []);
  const primaryPages = publishedPages.filter(
    (page) => !optionalPageIds.has(page.id),
  );
  const optionalPages = publishedPages.filter((page) =>
    optionalPageIds.has(page.id),
  );
  const parts = [`# ${escapeHeading(title)}`];

  if (options.description) {
    parts.push(`> ${normalizeLine(options.description)}`);
  }

  if (options.details) {
    parts.push(options.details.trim());
  }

  for (const collection of manifest.collections) {
    const pages = primaryPages.filter(
      (page) => page.collectionId === collection.id,
    );

    if (pages.length > 0) {
      parts.push(
        createLlmsFileList(collection.name ?? collection.id, pages, options),
      );
    }
  }

  const ungroupedPages = primaryPages.filter(
    (page) => !page.collectionId || !manifest.byCollection[page.collectionId],
  );

  if (ungroupedPages.length > 0) {
    parts.push(createLlmsFileList('Documentation', ungroupedPages, options));
  }

  if (optionalPages.length > 0) {
    parts.push(createLlmsFileList('Optional', optionalPages, options));
  }

  return `${parts.join('\n\n')}\n`;
}

export function createDocsLlmsFullText(
  manifest: DocsManifest,
  options: DocsLlmsTextOptions = {},
): string {
  const pages = getPublishedPages(manifest.pages, options);
  const parts = [`# ${escapeHeading(options.title ?? 'Documentation')}`];

  if (options.description) {
    parts.push(`> ${normalizeLine(options.description)}`);
  }

  if (options.details) {
    parts.push(options.details.trim());
  }

  for (const page of pages) {
    const sourceUrl = resolveMarkdownUrl(page, options);
    const heading = `## ${escapeHeading(page.title)}`;
    const source = sourceUrl ? `Source: ${sourceUrl}` : undefined;
    const body = createDocsMarkdown(page, {
      includeFrontmatter: false,
    }).trim();

    parts.push([heading, source, body].filter(Boolean).join('\n\n'));
  }

  return `${parts.join('\n\n')}\n`;
}

function createMarkdownFrontmatter(page: DocsPage): string {
  const values: Array<[string, unknown]> = [
    ['title', page.title],
    ['description', page.description],
    ['author', page.frontmatter.author],
    ['date', page.frontmatter.date],
    ['updated', page.frontmatter.updated],
    ['publishedAt', page.frontmatter.publishedAt],
    ['tags', page.frontmatter.tags],
  ];
  const lines = values.flatMap(([key, value]) => {
    const serialized = serializeFrontmatterValue(value);
    return serialized === undefined ? [] : [`${key}: ${serialized}`];
  });

  return ['---', ...lines, '---'].join('\n');
}

function serializeFrontmatterValue(value: unknown): string | undefined {
  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    Array.isArray(value)
  ) {
    return JSON.stringify(value);
  }

  return undefined;
}

function createLlmsFileList(
  title: string,
  pages: readonly DocsPage[],
  options: DocsLlmsTextOptions,
): string {
  const items = pages.map((page) => {
    const url = resolveMarkdownUrl(page, options);
    const description = page.description
      ? `: ${normalizeLine(page.description)}`
      : '';

    return `- [${escapeLinkLabel(page.title)}](${escapeLinkUrl(url)})${description}`;
  });

  return `## ${escapeHeading(title)}\n\n${items.join('\n')}`;
}

function resolveMarkdownUrl(
  page: DocsPage,
  options: DocsLlmsTextOptions,
): string {
  const path = options.markdownUrl?.(page) ?? `${page.route}.md`;

  if (!options.siteUrl) {
    return path;
  }

  try {
    return new URL(path, options.siteUrl).toString();
  } catch {
    return path;
  }
}

function normalizeLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function escapeHeading(value: string): string {
  return normalizeLine(value).replace(/^#+\s*/, '');
}

function escapeLinkLabel(value: string): string {
  return normalizeLine(value).replace(/(\\|\[|\])/g, '\\$1');
}

function escapeLinkUrl(value: string): string {
  return value
    .replace(/\s/g, (character) => encodeURIComponent(character))
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}
