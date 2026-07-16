import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { globSync } from 'tinyglobby';
import { JSON_SCHEMA, load as parseYaml } from 'js-yaml';
import {
  createDocsManifest,
  createHeadingIdGenerator,
  encodeRouteSegment,
  getPageBySlug,
  getPagesByCollection,
  normalizeRoute,
  sanitizeRepositoryUrl,
  sanitizeRepositoryId,
  stripMarkdown,
} from '@chakra-docs/core';
import type {
  DocsCollection,
  DocsCollectionConfig,
  DocsDiscoveryConfig,
  DocsFrontmatter,
  DocsHeading,
  DocsManifest,
  DocsNavItem,
  DocsPage,
  DocsRepository,
  DocsRepositoryConfig,
  DocsSource,
  DocsStandardSchemaV1,
} from '@chakra-docs/core';

export interface FilesystemSourceOptions {
  config: DocsDiscoveryConfig;
  manifest?: DocsManifest;
  limits?: FilesystemContentLimits;
}

export interface BuildFilesystemManifestOptions {
  config: DocsDiscoveryConfig;
  limits?: FilesystemContentLimits;
}

export interface FilesystemContentLimits {
  /** Maximum number of Markdown/MDX files across all filesystem collections. */
  maxFiles?: number;
  /** Maximum byte size of one content file or selected metadata file. */
  maxFileBytes?: number;
  /** Maximum combined bytes across content and selected metadata files. */
  maxTotalBytes?: number;
}

type ResolvedFilesystemContentLimits = Required<FilesystemContentLimits>;

export const DEFAULT_FILESYSTEM_CONTENT_LIMITS: Readonly<ResolvedFilesystemContentLimits> =
  Object.freeze({
    maxFiles: 5_000,
    maxFileBytes: 1_048_576,
    maxTotalBytes: 52_428_800,
  });

interface CollectionFile {
  absolutePath: string;
  relativePath: string;
  slug: string[];
  route: string;
  frontmatter: DocsFrontmatter;
  body: string;
  title: string;
  description?: string;
  headings: DocsHeading[];
}

interface PlannedContentFile {
  absolutePath: string;
  relativePath: string;
}

interface PreparedContentFile extends PlannedContentFile {
  raw: string;
}

interface PlannedCollectionContent {
  files: PlannedContentFile[];
  metadata?: PlannedContentFile;
}

interface PreparedCollectionContent {
  files: PreparedContentFile[];
  metadata?: PreparedContentFile;
}

interface MetaEntry {
  title?: string;
  order?: number;
  hidden?: boolean;
  badge?: string;
}

export function defineDocsDiscoveryConfig<TConfig extends DocsDiscoveryConfig>(
  config: TConfig,
): TConfig {
  return config;
}

export async function buildFilesystemManifest(
  options: BuildFilesystemManifestOptions,
): Promise<DocsManifest> {
  const rootDir = path.resolve(options.config.rootDir);
  const limits = resolveFilesystemContentLimits(options.limits);
  validateDiscoveryConfig(options.config);
  const repositories = createRepositoryRecords(options.config);
  const preparedContent = prepareFilesystemContent(
    options.config,
    rootDir,
    limits,
  );
  const collections: DocsCollection[] = [];

  for (const collectionConfig of options.config.collections) {
    collections.push(
      await buildCollection(
        options.config,
        collectionConfig,
        rootDir,
        preparedContent.get(collectionConfig),
      ),
    );
  }

  return createDocsManifest({
    repositories,
    collections,
    config: {
      basePath: '/',
    },
  });
}

export function createFilesystemSource(
  options: FilesystemSourceOptions,
): DocsSource {
  let manifestPromise: Promise<DocsManifest> | undefined;

  const getManifest = async () => {
    manifestPromise ??= options.manifest
      ? Promise.resolve(options.manifest)
      : buildFilesystemManifest({
          config: options.config,
          limits: options.limits,
        });

    return manifestPromise;
  };

  return {
    async getPage(args) {
      const manifest = await getManifest();
      return getPageBySlug(manifest, args.collectionId ?? 'default', args.slug);
    },
    async getPages(args) {
      const manifest = await getManifest();
      return args?.collectionId
        ? getPagesByCollection(manifest, args.collectionId)
        : manifest.pages;
    },
    async getCollections() {
      const manifest = await getManifest();
      return manifest.collections;
    },
    getManifest,
    async getNav(args) {
      const manifest = await getManifest();

      if (!args?.collectionId) {
        return manifest.nav;
      }

      return manifest.byCollection[args.collectionId]?.nav ?? [];
    },
  };
}

async function buildCollection(
  config: DocsDiscoveryConfig,
  collectionConfig: DocsCollectionConfig,
  rootDir: string,
  preparedContent: PreparedCollectionContent | undefined,
): Promise<DocsCollection> {
  const repository = getCollectionRepository(config, collectionConfig);
  const customSource =
    repository?.type === 'custom' ? repository.source : undefined;

  if (customSource) {
    const sourcePages = await customSource.getPages({
      collectionId: collectionConfig.id,
    });
    const pages = await Promise.all(
      sourcePages.map(async (page) => ({
        ...page,
        collectionId: page.collectionId ?? collectionConfig.id,
        frontmatter: await validateFrontmatter(
          page.frontmatter,
          collectionConfig.schema,
          page.path || page.id,
        ),
      })),
    );
    const sourceNav = await customSource.getNav?.({
      collectionId: collectionConfig.id,
    });
    const excludedPageIds = new Set(
      pages
        .filter((page) => page.frontmatter.hidden || page.frontmatter.draft)
        .map((page) => page.id),
    );
    const nav = sourceNav
      ? filterNavItems(sourceNav, excludedPageIds)
      : createNavItems(collectionConfig, pages);

    return {
      id: collectionConfig.id,
      name: collectionConfig.name,
      sourceId: collectionConfig.repository,
      repository: collectionConfig.repository
        ? {
            repositoryId: collectionConfig.repository,
            contentPath: collectionConfig.contentPath,
          }
        : undefined,
      basePath: normalizeRoute(
        collectionConfig.basePath ?? `/${collectionConfig.id}`,
      ),
      pages,
      nav,
    };
  }

  const contentRoot = resolveCollectionRoot(
    collectionConfig,
    repository,
    rootDir,
  );
  assertContentRoot(contentRoot, collectionConfig.id);
  if (!preparedContent) {
    throw new Error(
      `Missing prepared filesystem content for collection "${collectionConfig.id}".`,
    );
  }

  const meta = readMeta(preparedContent.metadata);
  const collectionFiles = await Promise.all(
    preparedContent.files.map((file) =>
      readCollectionFile(file, collectionConfig, meta),
    ),
  );
  const pages = collectionFiles
    .map((file) => createPage(collectionConfig, file))
    .sort(comparePages);

  return {
    id: collectionConfig.id,
    name: collectionConfig.name,
    sourceId: collectionConfig.repository,
    repository: collectionConfig.repository
      ? {
          repositoryId: collectionConfig.repository,
          contentPath: collectionConfig.contentPath,
        }
      : undefined,
    basePath: normalizeRoute(
      collectionConfig.basePath ?? `/${collectionConfig.id}`,
    ),
    pages,
    nav: createNavItems(collectionConfig, pages, meta),
  };
}

function discoverFiles(
  contentRoot: string,
  collectionConfig: DocsCollectionConfig,
): string[] {
  const include = collectionConfig.include ?? ['**/*.{md,mdx}'];
  const ignore = [
    '**/_meta.{json,js,ts}',
    '**/node_modules/**',
    ...(collectionConfig.exclude ?? []),
  ];

  return globSync(include, {
    cwd: contentRoot,
    ignore,
    onlyFiles: true,
    dot: false,
  }).sort((a, b) => a.localeCompare(b));
}

function resolveFilesystemContentLimits(
  configured: FilesystemContentLimits | undefined,
): ResolvedFilesystemContentLimits {
  if (
    configured !== undefined &&
    (typeof configured !== 'object' ||
      configured === null ||
      Array.isArray(configured))
  ) {
    throw new Error(
      'Invalid filesystem content limits: expected an object with positive integer limits.',
    );
  }

  const resolved = {
    maxFiles:
      configured?.maxFiles ?? DEFAULT_FILESYSTEM_CONTENT_LIMITS.maxFiles,
    maxFileBytes:
      configured?.maxFileBytes ??
      DEFAULT_FILESYSTEM_CONTENT_LIMITS.maxFileBytes,
    maxTotalBytes:
      configured?.maxTotalBytes ??
      DEFAULT_FILESYSTEM_CONTENT_LIMITS.maxTotalBytes,
  };

  for (const [name, value] of Object.entries(resolved)) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error(
        `Invalid filesystem content limit "${name}": expected a positive safe integer; received ${String(value)}.`,
      );
    }
  }

  return resolved;
}

function prepareFilesystemContent(
  config: DocsDiscoveryConfig,
  rootDir: string,
  limits: ResolvedFilesystemContentLimits,
): Map<DocsCollectionConfig, PreparedCollectionContent> {
  const plans = new Map<DocsCollectionConfig, PlannedCollectionContent>();
  let fileCount = 0;
  let totalBytes = 0;

  for (const collectionConfig of config.collections) {
    const repository = getCollectionRepository(config, collectionConfig);

    if (repository?.type === 'custom') {
      continue;
    }

    const contentRoot = resolveCollectionRoot(
      collectionConfig,
      repository,
      rootDir,
    );
    assertContentRoot(contentRoot, collectionConfig.id);
    const metadata = selectMetaFile(
      contentRoot,
      collectionConfig.metaFileNames,
    );
    const files = discoverFiles(contentRoot, collectionConfig)
      .map((relativePath) => ({
        absolutePath: resolveContainedPath(
          contentRoot,
          relativePath,
          `discovered file "${relativePath}"`,
        ),
        relativePath,
      }))
      .filter((file) => file.absolutePath !== metadata?.absolutePath);
    fileCount += files.length;
    assertContentLimit(
      'maxFiles',
      fileCount,
      limits.maxFiles,
      `while discovering collection "${collectionConfig.id}"`,
      'files',
    );

    for (const file of files) {
      const fileBytes = statSync(file.absolutePath).size;
      assertContentLimit(
        'maxFileBytes',
        fileBytes,
        limits.maxFileBytes,
        `for "${file.relativePath}" in collection "${collectionConfig.id}"`,
        'bytes',
      );
      totalBytes += fileBytes;
      assertContentLimit(
        'maxTotalBytes',
        totalBytes,
        limits.maxTotalBytes,
        `while discovering collection "${collectionConfig.id}"`,
        'bytes',
      );
    }

    if (metadata) {
      const metadataBytes = statSync(metadata.absolutePath).size;
      assertContentLimit(
        'maxFileBytes',
        metadataBytes,
        limits.maxFileBytes,
        `for metadata file "${metadata.relativePath}" in collection "${collectionConfig.id}"`,
        'bytes',
      );
      totalBytes += metadataBytes;
      assertContentLimit(
        'maxTotalBytes',
        totalBytes,
        limits.maxTotalBytes,
        `while discovering metadata for collection "${collectionConfig.id}"`,
        'bytes',
      );
    }

    plans.set(collectionConfig, { files, metadata });
  }

  const prepared = new Map<DocsCollectionConfig, PreparedCollectionContent>();
  totalBytes = 0;

  for (const [collectionConfig, plan] of plans) {
    const files = plan.files.map((file) => {
      const preparedFile = readPreparedFile(file);
      assertContentLimit(
        'maxFileBytes',
        preparedFile.bytes,
        limits.maxFileBytes,
        `for "${file.relativePath}" in collection "${collectionConfig.id}"`,
        'bytes',
      );
      totalBytes += preparedFile.bytes;
      assertContentLimit(
        'maxTotalBytes',
        totalBytes,
        limits.maxTotalBytes,
        `while reading collection "${collectionConfig.id}"`,
        'bytes',
      );
      return preparedFile.file;
    });
    let metadata: PreparedContentFile | undefined;

    if (plan.metadata) {
      const preparedMetadata = readPreparedFile(plan.metadata);
      assertContentLimit(
        'maxFileBytes',
        preparedMetadata.bytes,
        limits.maxFileBytes,
        `for metadata file "${plan.metadata.relativePath}" in collection "${collectionConfig.id}"`,
        'bytes',
      );
      totalBytes += preparedMetadata.bytes;
      assertContentLimit(
        'maxTotalBytes',
        totalBytes,
        limits.maxTotalBytes,
        `while reading metadata for collection "${collectionConfig.id}"`,
        'bytes',
      );
      metadata = preparedMetadata.file;
    }

    prepared.set(collectionConfig, { files, metadata });
  }

  return prepared;
}

function readPreparedFile(file: PlannedContentFile): {
  bytes: number;
  file: PreparedContentFile;
} {
  const raw = readFileSync(file.absolutePath);
  return {
    bytes: raw.byteLength,
    file: { ...file, raw: raw.toString('utf8') },
  };
}

function selectMetaFile(
  contentRoot: string,
  metaFileNames = ['_meta.json'],
): PlannedContentFile | undefined {
  for (const relativePath of metaFileNames) {
    const absolutePath = resolveContainedPath(
      contentRoot,
      relativePath,
      `meta file "${relativePath}"`,
    );

    if (existsSync(absolutePath) && absolutePath.endsWith('.json')) {
      return { absolutePath, relativePath };
    }
  }

  return undefined;
}

function assertContentLimit(
  name: keyof ResolvedFilesystemContentLimits,
  actual: number,
  maximum: number,
  context: string,
  unit: 'bytes' | 'files',
): void {
  if (actual > maximum) {
    throw new Error(
      `Filesystem content limit "${name}" exceeded ${context}: ${formatContentMeasurement(actual, unit)} > ${formatContentMeasurement(maximum, unit)}.`,
    );
  }
}

function formatContentMeasurement(
  value: number,
  unit: 'bytes' | 'files',
): string {
  if (value === 1) {
    return `${value} ${unit === 'bytes' ? 'byte' : 'file'}`;
  }

  return `${value} ${unit}`;
}

async function readCollectionFile(
  file: PreparedContentFile,
  collectionConfig: DocsCollectionConfig,
  meta: Record<string, MetaEntry>,
): Promise<CollectionFile> {
  const { absolutePath, relativePath, raw } = file;
  const parsed = parseFrontmatter(raw, absolutePath);
  const frontmatter = await validateFrontmatter(
    parsed.frontmatter,
    collectionConfig.schema,
    absolutePath,
  );
  const { body } = parsed;
  const slug = pathToSlug(relativePath);
  const metaEntry = meta[slug[0] ?? 'index'];
  const headings = extractHeadings(body);
  const title =
    frontmatter.title ??
    metaEntry?.title ??
    extractFirstHeadingTitle(body, 1) ??
    humanize(slug.at(-1) ?? collectionConfig.id);
  const description =
    frontmatter.description ?? extractDescription(body, title);

  return {
    absolutePath,
    relativePath,
    slug,
    route: joinRoute(
      collectionConfig.basePath ?? `/${collectionConfig.id}`,
      slug,
    ),
    frontmatter: {
      ...frontmatter,
      order: frontmatter.order ?? metaEntry?.order,
      hidden: frontmatter.hidden ?? metaEntry?.hidden,
      draft: frontmatter.draft ?? collectionConfig.defaultDraft,
      navTitle: frontmatter.navTitle ?? metaEntry?.title,
    },
    body,
    title,
    description,
    headings,
  };
}

function createPage(
  collectionConfig: DocsCollectionConfig,
  file: CollectionFile,
): DocsPage {
  return {
    id: `${collectionConfig.id}:${file.slug.length > 0 ? file.slug.join('/') : 'index'}`,
    collectionId: collectionConfig.id,
    sourceId: collectionConfig.repository,
    slug: file.slug,
    path: toPosixPath(file.relativePath),
    route: file.route,
    title: file.title,
    description: file.description,
    frontmatter: file.frontmatter,
    body: file.body,
    headings: file.headings,
  };
}

function createNavItems(
  collectionConfig: DocsCollectionConfig,
  pages: DocsPage[],
  meta: Record<string, MetaEntry> = {},
): DocsNavItem[] {
  return pages
    .filter((page) => !page.frontmatter.hidden && !page.frontmatter.draft)
    .sort(comparePages)
    .map((page) => {
      const firstSlug = page.slug[0] ?? 'index';
      const metaEntry = meta[firstSlug];

      return {
        id: page.id,
        title: page.frontmatter.navTitle ?? page.title,
        href: page.route,
        slug: page.slug,
        badge: metaEntry?.badge,
      };
    });
}

function filterNavItems(
  items: DocsNavItem[],
  excludedPageIds: Set<string>,
): DocsNavItem[] {
  return items.flatMap((item) => {
    if (excludedPageIds.has(item.id)) {
      return [];
    }

    return [
      item.children
        ? { ...item, children: filterNavItems(item.children, excludedPageIds) }
        : item,
    ];
  });
}

function comparePages(a: DocsPage, b: DocsPage): number {
  const orderA = a.frontmatter.order ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.frontmatter.order ?? Number.MAX_SAFE_INTEGER;

  if (orderA !== orderB) {
    return orderA - orderB;
  }

  return a.route.localeCompare(b.route);
}

function parseFrontmatter(
  raw: string,
  filePath: string,
): {
  frontmatter: DocsFrontmatter;
  body: string;
} {
  const opening = /^(?:\uFEFF)?---[\t ]*(?:\r?\n)/.exec(raw);

  if (!opening) {
    return { frontmatter: {}, body: raw };
  }

  const remainder = raw.slice(opening[0].length);
  const closing = /^---[\t ]*(?:\r?\n|$)/m.exec(remainder);

  if (!closing || closing.index === undefined) {
    throw new Error(
      `Unterminated frontmatter in ${filePath}: expected a closing "---" delimiter.`,
    );
  }

  const source = remainder.slice(0, closing.index);
  const body = remainder.slice(closing.index + closing[0].length);
  let parsed: unknown;

  try {
    parsed = parseYaml(source, {
      filename: filePath,
      schema: JSON_SCHEMA,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse frontmatter in ${filePath}: ${message}`);
  }

  if (parsed === undefined || parsed === null) {
    return { frontmatter: {}, body };
  }

  if (!isPlainRecord(parsed)) {
    throw new Error(
      `Invalid frontmatter in ${filePath}: expected a YAML mapping at the document root.`,
    );
  }

  return { frontmatter: parsed, body };
}

async function validateFrontmatter(
  input: DocsFrontmatter,
  schema: unknown,
  filePath: string,
): Promise<DocsFrontmatter> {
  let value: unknown = input;

  if (schema !== undefined) {
    if (!isStandardSchema(schema)) {
      throw new Error(
        `Invalid frontmatter schema for ${filePath}: expected a Standard Schema v1 validator.`,
      );
    }

    let result;

    try {
      result = await schema['~standard'].validate(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Frontmatter schema threw for ${filePath}: ${message}`);
    }

    if (!isRecord(result)) {
      throw new Error(
        `Invalid frontmatter schema result for ${filePath}: expected an object containing a value or issues.`,
      );
    }

    if ('issues' in result && result.issues !== undefined) {
      if (!Array.isArray(result.issues) || result.issues.length === 0) {
        throw new Error(
          `Invalid frontmatter schema result for ${filePath}: issues must be a non-empty array.`,
        );
      }

      const issues = result.issues
        .map((issue) => {
          const issuePath = formatIssuePath(issue.path);
          return issuePath ? `${issuePath}: ${issue.message}` : issue.message;
        })
        .join('; ');
      throw new Error(`Invalid frontmatter in ${filePath}: ${issues}`);
    }

    if (!('value' in result)) {
      throw new Error(
        `Invalid frontmatter schema result for ${filePath}: expected a value or issues.`,
      );
    }

    value = result.value;
  }

  if (!isPlainRecord(value)) {
    throw new Error(
      `Invalid frontmatter in ${filePath}: schema output must be an object.`,
    );
  }

  validateKnownFrontmatterFields(value, filePath);
  assertSerializableValue(value, filePath, new WeakSet<object>());
  return value;
}

function isStandardSchema(value: unknown): value is DocsStandardSchemaV1 {
  if (!isRecord(value)) {
    return false;
  }

  const standard = value['~standard'];
  return (
    isRecord(standard) &&
    standard.version === 1 &&
    typeof standard.validate === 'function'
  );
}

function formatIssuePath(
  issuePath:
    ReadonlyArray<PropertyKey | { readonly key: PropertyKey }> | undefined,
): string {
  if (!issuePath || issuePath.length === 0) {
    return '';
  }

  return issuePath
    .map((segment) =>
      typeof segment === 'object' && segment !== null
        ? String(segment.key)
        : String(segment),
    )
    .join('.');
}

function validateKnownFrontmatterFields(
  frontmatter: Record<string, unknown>,
  filePath: string,
): void {
  for (const key of ['title', 'description', 'navTitle', 'author'] as const) {
    const value = frontmatter[key];

    if (value !== undefined && typeof value !== 'string') {
      throw invalidFrontmatterField(filePath, key, 'a string', value);
    }
  }

  for (const key of ['draft', 'hidden', 'toc'] as const) {
    const value = frontmatter[key];

    if (value !== undefined && typeof value !== 'boolean') {
      throw invalidFrontmatterField(filePath, key, 'a boolean', value);
    }
  }

  const order = frontmatter.order;

  if (
    order !== undefined &&
    (typeof order !== 'number' || !Number.isFinite(order))
  ) {
    throw invalidFrontmatterField(filePath, 'order', 'a finite number', order);
  }

  const tags = frontmatter.tags;

  if (
    tags !== undefined &&
    (!Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string'))
  ) {
    throw invalidFrontmatterField(
      filePath,
      'tags',
      'an array of strings',
      tags,
    );
  }

  for (const key of ['date', 'updated', 'publishedAt'] as const) {
    const value = frontmatter[key];

    if (value === undefined) {
      continue;
    }

    if (
      !(typeof value === 'string' || value instanceof Date) ||
      Number.isNaN(toDateTimestamp(value))
    ) {
      throw invalidFrontmatterField(
        filePath,
        key,
        'a valid date string or Date',
        value,
      );
    }
  }
}

function toDateTimestamp(value: string | Date): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function invalidFrontmatterField(
  filePath: string,
  key: string,
  expected: string,
  value: unknown,
): Error {
  return new Error(
    `Invalid frontmatter in ${filePath}: "${key}" must be ${expected}; received ${describeValue(value)}.`,
  );
}

function describeValue(value: unknown): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? 'an invalid Date'
      : value.toISOString();
  }

  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}

function assertSerializableValue(
  value: unknown,
  filePath: string,
  ancestors: WeakSet<object>,
): void {
  if (value === null || ['string', 'boolean'].includes(typeof value)) {
    return;
  }

  if (typeof value === 'number') {
    if (Number.isFinite(value)) {
      return;
    }

    throw new Error(
      `Invalid frontmatter in ${filePath}: numeric values must be finite.`,
    );
  }

  if (value instanceof Date) {
    if (!Number.isNaN(value.getTime())) {
      return;
    }

    throw new Error(`Invalid frontmatter in ${filePath}: invalid Date value.`);
  }

  if (!Array.isArray(value) && !isPlainRecord(value)) {
    throw new Error(
      `Invalid frontmatter in ${filePath}: values must be JSON-serializable.`,
    );
  }

  if (ancestors.has(value)) {
    throw new Error(
      `Invalid frontmatter in ${filePath}: circular YAML aliases are not supported.`,
    );
  }

  ancestors.add(value);

  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    assertSerializableValue(child, filePath, ancestors);
  }

  ancestors.delete(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

function extractHeadings(body: string): DocsHeading[] {
  const headings: DocsHeading[] = [];
  const createNextHeadingId = createHeadingIdGenerator();
  let fence: MarkdownFence | undefined;

  for (const line of body.split(/\r?\n/)) {
    const fenceChange = updateMarkdownFence(line, fence);

    if (fenceChange.matched) {
      fence = fenceChange.fence;
      continue;
    }

    if (fence) {
      continue;
    }

    const match = /^(#{2,6})\s+(.+)$/.exec(line);

    if (!match) {
      continue;
    }

    const title = stripMarkdown(match[2]).trim();

    if (!title) {
      continue;
    }

    headings.push({
      id: createNextHeadingId(title),
      title,
      level: match[1].length,
    });
  }

  return headings;
}

function extractFirstHeadingTitle(
  body: string,
  level: number,
): string | undefined {
  let fence: MarkdownFence | undefined;

  for (const line of body.split(/\r?\n/)) {
    const fenceChange = updateMarkdownFence(line, fence);

    if (fenceChange.matched) {
      fence = fenceChange.fence;
      continue;
    }

    if (fence) {
      continue;
    }

    const match = /^(#{1,6})\s+(.+)$/.exec(line);

    if (match?.[1].length === level) {
      const title = stripMarkdown(match[2]).trim();
      return title || undefined;
    }
  }

  return undefined;
}

interface MarkdownFence {
  character: '`' | '~';
  length: number;
}

function updateMarkdownFence(
  line: string,
  current: MarkdownFence | undefined,
): { matched: boolean; fence: MarkdownFence | undefined } {
  const match = /^ {0,3}(`+|~+)(.*)$/.exec(line);

  if (!match || match[1].length < 3) {
    return { matched: false, fence: current };
  }

  const character = match[1][0] as '`' | '~';

  if (!current) {
    return {
      matched: true,
      fence: { character, length: match[1].length },
    };
  }

  if (
    character === current.character &&
    match[1].length >= current.length &&
    match[2].trim().length === 0
  ) {
    return { matched: true, fence: undefined };
  }

  return { matched: false, fence: current };
}

function extractDescription(body: string, title: string): string | undefined {
  const paragraph = body
    .split(/\n{2,}/)
    .map((block) => stripMarkdown(block).trim())
    .find((block) => block.length > 0 && block !== title);

  return paragraph;
}

function pathToSlug(relativePath: string): string[] {
  const parsed = path.parse(relativePath);
  const withoutExtension = path.join(parsed.dir, parsed.name);
  const parts = toPosixPath(withoutExtension).split('/').filter(Boolean);

  if (parts.at(-1) === 'index') {
    parts.pop();
  }

  return parts;
}

function readMeta(
  metadata: PreparedContentFile | undefined,
): Record<string, MetaEntry> {
  if (!metadata) {
    return {};
  }

  let parsed: Record<string, unknown>;

  try {
    const value: unknown = JSON.parse(metadata.raw);

    if (!isPlainRecord(value)) {
      throw new Error('expected a JSON object at the document root');
    }

    parsed = value;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to parse meta file ${metadata.absolutePath}: ${message}`,
    );
  }

  return Object.fromEntries(
    Object.entries(parsed).map(([key, value], index) => [
      key,
      normalizeMetaEntry(value, index),
    ]),
  );
}

function normalizeMetaEntry(value: unknown, index: number): MetaEntry {
  if (typeof value === 'string') {
    return { title: value, order: index };
  }

  if (typeof value === 'number') {
    return { order: value };
  }

  if (value && typeof value === 'object') {
    const entry = value as Record<string, unknown>;
    return {
      title: typeof entry.title === 'string' ? entry.title : undefined,
      order: typeof entry.order === 'number' ? entry.order : index,
      hidden: typeof entry.hidden === 'boolean' ? entry.hidden : undefined,
      badge: typeof entry.badge === 'string' ? entry.badge : undefined,
    };
  }

  return { order: index };
}

function resolveCollectionRoot(
  collectionConfig: DocsCollectionConfig,
  repository: DocsRepositoryConfig | undefined,
  rootDir: string,
): string {
  const contentPath =
    collectionConfig.contentPath ??
    collectionConfig.contentDir ??
    collectionConfig.id;
  const repositoryRoot = repository
    ? resolveRepositoryRoot(repository, rootDir)
    : rootDir;

  return resolveContainedPath(
    repositoryRoot,
    contentPath,
    `content path for collection "${collectionConfig.id}"`,
  );
}

function resolveRepositoryRoot(
  repository: DocsRepositoryConfig,
  rootDir: string,
): string {
  if (repository.type === 'custom') {
    return rootDir;
  }

  if (repository.type === 'git') {
    const cacheRoot = resolveGitCacheDir(repository, rootDir);
    return resolveContainedPath(
      cacheRoot,
      repository.subdir ?? '.',
      `subdir for Git repository "${repository.id}"`,
    );
  }

  if (repository.type === 'workspace') {
    return resolveWorkspaceRepositoryRoot(repository, rootDir);
  }

  return path.resolve(rootDir, repository.rootDir);
}

function getCollectionRepository(
  config: DocsDiscoveryConfig,
  collectionConfig: DocsCollectionConfig,
): DocsRepositoryConfig | undefined {
  if (!collectionConfig.repository) {
    return undefined;
  }

  const repository = config.repositories?.find(
    (item) => item.id === collectionConfig.repository,
  );

  if (!repository) {
    throw new Error(
      `Collection "${collectionConfig.id}" references unknown repository "${collectionConfig.repository}".`,
    );
  }

  return repository;
}

function createRepositoryRecords(
  config: DocsDiscoveryConfig,
): DocsRepository[] | undefined {
  if (!config.repositories) {
    return undefined;
  }

  return config.repositories.map((repository) => {
    if (repository.type === 'workspace') {
      return {
        id: repository.id,
        type: repository.type,
        packageName: repository.packageName,
      };
    }

    if (repository.type === 'git') {
      const url = sanitizeRepositoryUrl(repository.url);

      return {
        id: repository.id,
        type: repository.type,
        ...(url ? { url } : {}),
        ref: repository.ref,
        ...(repository.subdir ? { subdir: repository.subdir } : {}),
      };
    }

    return { id: repository.id, type: repository.type };
  });
}

function validateDiscoveryConfig(config: DocsDiscoveryConfig): void {
  const repositoryIds = new Set<string>();
  const gitCacheKeys = new Map<string, string>();

  for (const repository of config.repositories ?? []) {
    if (repositoryIds.has(repository.id)) {
      throw new Error(`Duplicate docs repository id "${repository.id}".`);
    }

    repositoryIds.add(repository.id);

    if (repository.type !== 'git') {
      continue;
    }

    const resolvedCacheDir = resolveGitCacheDir(
      repository,
      path.resolve(config.rootDir),
    );
    const cacheKey =
      process.platform === 'darwin' || process.platform === 'win32'
        ? resolvedCacheDir.toLowerCase()
        : resolvedCacheDir;
    const existingId = gitCacheKeys.get(cacheKey);

    if (existingId) {
      throw new Error(
        `Git repositories "${existingId}" and "${repository.id}" resolve to the same cache directory. Configure distinct ids or cacheDir values.`,
      );
    }

    gitCacheKeys.set(cacheKey, repository.id);
  }

  for (const collection of config.collections) {
    if (collection.repository && !repositoryIds.has(collection.repository)) {
      throw new Error(
        `Collection "${collection.id}" references unknown repository "${collection.repository}".`,
      );
    }
  }
}

function resolveGitCacheDir(
  repository: Extract<DocsRepositoryConfig, { type: 'git' }>,
  rootDir: string,
): string {
  const cacheDir =
    repository.cacheDir ??
    path.join('.chakra-docs', 'git', sanitizeRepositoryId(repository.id));

  return resolveContainedPath(
    rootDir,
    cacheDir,
    `cacheDir for Git repository "${repository.id}"`,
  );
}

function resolveWorkspaceRepositoryRoot(
  repository: Extract<DocsRepositoryConfig, { type: 'workspace' }>,
  rootDir: string,
): string {
  if (!isPackageName(repository.packageName)) {
    throw new Error(
      `Invalid packageName "${repository.packageName}" for workspace repository "${repository.id}".`,
    );
  }

  const requireFromRoot = createRequire(path.join(rootDir, 'package.json'));

  try {
    return path.dirname(
      requireFromRoot.resolve(`${repository.packageName}/package.json`),
    );
  } catch {
    try {
      const entryPath = requireFromRoot.resolve(repository.packageName);
      const packageRoot = findPackageRoot(entryPath, repository.packageName);

      if (packageRoot) {
        return packageRoot;
      }
    } catch {
      // Use the explicit fallback below when package resolution is unavailable.
    }
  }

  if (repository.rootDir) {
    return path.resolve(rootDir, repository.rootDir);
  }

  throw new Error(
    `Unable to resolve workspace repository "${repository.id}" from package "${repository.packageName}". Install or link the package, or configure rootDir as an explicit fallback.`,
  );
}

function isPackageName(value: string): boolean {
  return /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(value);
}

function findPackageRoot(
  entryPath: string,
  expectedPackageName: string,
): string | undefined {
  let directory = path.dirname(entryPath);

  while (true) {
    const packagePath = path.join(directory, 'package.json');

    if (existsSync(packagePath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as {
          name?: unknown;
        };

        if (packageJson.name === expectedPackageName) {
          return directory;
        }
      } catch {
        // Continue upward; this was not a usable package boundary.
      }
    }

    const parent = path.dirname(directory);

    if (parent === directory) {
      return undefined;
    }

    directory = parent;
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

function assertContentRoot(contentRoot: string, collectionId: string): void {
  if (!existsSync(contentRoot)) {
    throw new Error(
      `Content root for collection "${collectionId}" does not exist: ${contentRoot}`,
    );
  }

  if (!statSync(contentRoot).isDirectory()) {
    throw new Error(
      `Content root for collection "${collectionId}" is not a directory: ${contentRoot}`,
    );
  }
}

function joinRoute(basePath: string, slug: string[]): string {
  const base = normalizeRoute(basePath);

  if (slug.length === 0) {
    return base;
  }

  return normalizeRoute(`${base}/${slug.map(encodeRouteSegment).join('/')}`);
}

function humanize(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join('/');
}
