import type {
  CreateDocsManifestOptions,
  DocsCollection,
  DocsCollectionOption,
  DocsConfig,
  DocsFeedEntry,
  DocsManifest,
  DocsPage,
  DocsRepository,
  DocsSearchRecord,
  DocsSitemapEntry,
} from './types.js';
import { normalizeRoute, slugToKey } from './slug.js';
import { getDocsMarkdownHeadings } from './markdown-headings.js';

export function createDocsManifest(
  options: CreateDocsManifestOptions,
): DocsManifest {
  const pages = options.collections.flatMap((collection) => collection.pages);
  const nav =
    options.nav ?? options.collections.flatMap((collection) => collection.nav);
  const byCollection = createCollectionIndex(options.collections);
  validateCollectionPageMembership(options.collections);
  validateUniquePageIds(pages);
  const bySlug = createSlugIndex(pages);
  const byRoute = createRouteIndex(pages);

  return {
    repositories: options.repositories?.map(toPublicDocsRepository),
    collections: options.collections,
    pages,
    nav,
    byCollection,
    bySlug,
    byRoute,
    search: createSearchRecords(pages),
    sitemap: createSitemapEntries(pages, options.config ?? {}),
    feeds: createFeedEntries(pages, options.config ?? {}),
  };
}

export function validateCollectionPageMembership(
  collections: DocsCollection[],
): void {
  for (const collection of collections) {
    for (const page of collection.pages) {
      const pageCollectionId = page.collectionId ?? 'default';

      if (pageCollectionId !== collection.id) {
        throw new Error(
          `Docs page "${page.id}" belongs to collection "${pageCollectionId}" but was provided in collection "${collection.id}".`,
        );
      }
    }
  }
}

export function sanitizeRepositoryId(value: string): string {
  const sanitized = value.trim().replace(/[^a-zA-Z0-9._-]/g, '-');

  if (!sanitized || sanitized === '.' || sanitized === '..') {
    throw new Error(
      `Invalid docs repository id "${value}": expected at least one letter, number, "_", or "-".`,
    );
  }

  return sanitized;
}

export function sanitizeRepositoryUrl(
  value: string | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return undefined;
  }

  if (
    !url.hostname ||
    !['git:', 'http:', 'https:', 'ssh:'].includes(url.protocol)
  ) {
    return undefined;
  }

  url.username = '';
  url.password = '';
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function toPublicDocsRepository(
  repository: DocsRepository,
): DocsRepository {
  const metadata = {
    id: repository.id,
    type: repository.type,
  };

  if (repository.type === 'workspace') {
    return {
      ...metadata,
      ...(repository.packageName
        ? { packageName: repository.packageName }
        : {}),
    };
  }

  if (repository.type === 'git') {
    const url = sanitizeRepositoryUrl(repository.url);

    return {
      ...metadata,
      ...(url ? { url } : {}),
      ...(repository.ref ? { ref: repository.ref } : {}),
      ...(repository.subdir ? { subdir: repository.subdir } : {}),
    };
  }

  return metadata;
}

export function toPublicDocsManifest(manifest: DocsManifest): DocsManifest {
  return {
    ...manifest,
    repositories: manifest.repositories?.map(toPublicDocsRepository),
  };
}

export function validateUniquePageIds(pages: DocsPage[]): void {
  const ids = new Set<string>();

  for (const page of pages) {
    if (ids.has(page.id)) {
      throw new Error(`Duplicate docs page id "${page.id}".`);
    }

    ids.add(page.id);
  }
}

export function getDocsCollection(
  manifest: DocsManifest,
  collectionId: string,
): DocsCollection | null {
  return getOwnValue(manifest.byCollection, collectionId) ?? null;
}

export function getPageBySlug(
  manifest: DocsManifest,
  collectionId: string,
  slug: string[],
): DocsPage | null {
  const collection = getOwnValue(manifest.bySlug, collectionId);
  return collection ? (getOwnValue(collection, slugToKey(slug)) ?? null) : null;
}

export function getPageByRoute(
  manifest: DocsManifest,
  route: string,
): DocsPage | null {
  return getOwnValue(manifest.byRoute, normalizeRoute(route)) ?? null;
}

export function getPagesByCollection(
  manifest: DocsManifest,
  collectionId: string,
): DocsPage[] {
  return getOwnValue(manifest.byCollection, collectionId)?.pages ?? [];
}

export function createCollectionOptions(
  collections: DocsCollection[],
): DocsCollectionOption[] {
  return collections.map((collection) => ({
    id: collection.id,
    label: collection.name ?? collection.id,
  }));
}

export function getPublishedPages(
  pages: DocsPage[],
  options: { includeDrafts?: boolean; includeHidden?: boolean } = {},
): DocsPage[] {
  return pages.filter((page) => {
    if (!options.includeDrafts && page.frontmatter.draft) {
      return false;
    }

    if (!options.includeHidden && page.frontmatter.hidden) {
      return false;
    }

    return true;
  });
}

export function createSearchRecords(pages: DocsPage[]): DocsSearchRecord[] {
  return getPublishedPages(pages).flatMap((page) => [
    createPageSearchRecord(page),
    ...createHeadingSearchRecords(page),
  ]);
}

function createPageSearchRecord(page: DocsPage): DocsSearchRecord {
  return {
    id: page.id,
    kind: 'page',
    pageId: page.id,
    collectionId: page.collectionId,
    sourceId: page.sourceId,
    route: normalizeRoute(page.route),
    title: page.title,
    pageTitle: page.title,
    description: page.description,
    headings: page.headings ?? [],
    text: joinSearchText([
      page.title,
      page.description,
      page.body,
      ...(page.headings ?? []).map((heading) => heading.title),
    ]),
    tags: page.frontmatter.tags,
    aliases: page.frontmatter.aliases,
    searchPriority: page.frontmatter.searchPriority,
  };
}

function createHeadingSearchRecords(page: DocsPage): DocsSearchRecord[] {
  const route = normalizeRoute(page.route);
  const headings = (page.headings ?? []).filter(
    (heading) => heading.level >= 2,
  );
  const sectionTextByHeadingId = createSectionTextByHeadingId(page.body ?? '');

  return headings.map((heading) => ({
    id: `${page.id}#${heading.id}`,
    kind: 'heading',
    pageId: page.id,
    collectionId: page.collectionId,
    sourceId: page.sourceId,
    route: `${route}#${heading.id}`,
    title: heading.title,
    pageTitle: page.title,
    sectionTitle: heading.title,
    headingId: heading.id,
    headingLevel: heading.level,
    description: page.title,
    headings: [heading],
    text: joinSearchText([
      page.title,
      page.description,
      heading.title,
      sectionTextByHeadingId.get(heading.id),
    ]),
    tags: page.frontmatter.tags,
    aliases: page.frontmatter.aliases,
    searchPriority: page.frontmatter.searchPriority,
  }));
}

function createSectionTextByHeadingId(body: string): Map<string, string> {
  const headings = getDocsMarkdownHeadings(body);
  return new Map(
    headings.map((heading, index) => [
      heading.id,
      joinSearchText([
        heading.title,
        stripMarkdown(body.slice(heading.end, headings[index + 1]?.start)),
      ]),
    ]),
  );
}

export function stripMarkdown(value: string): string {
  return value
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[*_~]/g, '')
    .trim();
}

function joinSearchText(values: Array<string | undefined>): string {
  return values
    .filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    )
    .join('\n');
}

export function createSitemapEntries(
  pages: DocsPage[],
  config: DocsConfig,
): DocsSitemapEntry[] {
  return getPublishedPages(pages).map((page) => ({
    url: joinUrl(config.siteUrl, normalizeRoute(page.route)),
    lastModified: page.frontmatter.updated ?? page.frontmatter.date,
  }));
}

export function createFeedEntries(
  pages: DocsPage[],
  config: DocsConfig,
): DocsFeedEntry[] {
  return getPublishedPages(pages)
    .map((page) => ({
      id: page.id,
      url: joinUrl(config.siteUrl, normalizeRoute(page.route)),
      title: page.title,
      description: page.description,
      date:
        page.frontmatter.publishedAt ??
        page.frontmatter.date ??
        page.frontmatter.updated,
      author: page.frontmatter.author,
      tags: page.frontmatter.tags,
    }))
    .filter((entry) => entry.date !== undefined);
}

export function createCollectionIndex(
  collections: DocsCollection[],
): Record<string, DocsCollection> {
  const index = createNullPrototypeRecord<DocsCollection>();

  for (const collection of collections) {
    if (Object.hasOwn(index, collection.id)) {
      throw new Error(`Duplicate docs collection id "${collection.id}".`);
    }

    index[collection.id] = collection;
  }

  return index;
}

export function createSlugIndex(
  pages: DocsPage[],
): Record<string, Record<string, DocsPage>> {
  const index = createNullPrototypeRecord<Record<string, DocsPage>>();

  for (const page of pages) {
    const collectionId = page.collectionId ?? 'default';
    const slugKey = slugToKey(page.slug);

    index[collectionId] ??= createNullPrototypeRecord<DocsPage>();

    if (Object.hasOwn(index[collectionId], slugKey)) {
      throw new Error(
        `Duplicate docs slug "${slugKey}" in collection "${collectionId}".`,
      );
    }

    index[collectionId][slugKey] = page;
  }

  return index;
}

export function createRouteIndex(pages: DocsPage[]): Record<string, DocsPage> {
  const index = createNullPrototypeRecord<DocsPage>();

  for (const page of pages) {
    const route = normalizeRoute(page.route);

    if (Object.hasOwn(index, route)) {
      throw new Error(`Duplicate docs route "${route}".`);
    }

    index[route] = page;
  }

  return index;
}

function createNullPrototypeRecord<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>;
}

function getOwnValue<T>(record: Record<string, T>, key: string): T | undefined {
  return Object.hasOwn(record, key) ? record[key] : undefined;
}

function joinUrl(siteUrl: string | undefined, route: string): string {
  if (!siteUrl) {
    return route;
  }

  return `${siteUrl.replace(/\/+$/, '')}${route}`;
}
