export type MaybePromise<T> = T | Promise<T>;

export interface DocsPage {
  id: string;
  collectionId?: string;
  sourceId?: string;
  slug: string[];
  path: string;
  route: string;
  title: string;
  description?: string;
  frontmatter: DocsFrontmatter;
  body?: string;
  headings?: DocsHeading[];
  data?: unknown;
}

export interface DocsFrontmatter {
  title?: string;
  description?: string;
  order?: number;
  draft?: boolean;
  hidden?: boolean;
  navTitle?: string;
  toc?: boolean;
  date?: string | Date;
  updated?: string | Date;
  publishedAt?: string | Date;
  author?: string;
  tags?: string[];
  /** Additional terms that should resolve to this page in documentation search. */
  aliases?: string[];
  /** Optional relevance adjustment used by search adapters. */
  searchPriority?: number;
  [key: string]: unknown;
}

export interface DocsNavItem {
  id: string;
  title: string;
  href?: string;
  slug?: string[];
  hidden?: boolean;
  badge?: string;
  children?: DocsNavItem[];
}

export interface DocsHeading {
  id: string;
  title: string;
  level: number;
  children?: DocsHeading[];
}

export type DocsRepositoryType = 'local' | 'workspace' | 'git' | 'custom';

/** Public, serializable repository metadata included in a docs manifest. */
export interface DocsRepository {
  id: string;
  type: DocsRepositoryType;
  packageName?: string;
  /** A credential-free public repository URL. */
  url?: string;
  ref?: string;
  subdir?: string;
}

export interface DocsRepositoryRef {
  repositoryId: string;
  contentPath?: string;
}

export interface DocsCollection {
  id: string;
  name?: string;
  sourceId?: string;
  repository?: DocsRepositoryRef;
  basePath: string;
  pages: DocsPage[];
  nav: DocsNavItem[];
}

export interface DocsCollectionOption {
  id: string;
  label: string;
}

export interface DocsManifest {
  repositories?: DocsRepository[];
  collections: DocsCollection[];
  pages: DocsPage[];
  nav: DocsNavItem[];
  byCollection: Record<string, DocsCollection>;
  bySlug: Record<string, Record<string, DocsPage>>;
  byRoute: Record<string, DocsPage>;
  search: DocsSearchRecord[];
  sitemap: DocsSitemapEntry[];
  feeds: DocsFeedEntry[];
}

export interface DocsSearchRecord {
  id: string;
  kind?: 'page' | 'heading';
  pageId?: string;
  collectionId?: string;
  sourceId?: string;
  route: string;
  title: string;
  pageTitle?: string;
  sectionTitle?: string;
  headingId?: string;
  headingLevel?: number;
  description?: string;
  headings: DocsHeading[];
  text: string;
  tags?: string[];
  aliases?: string[];
  searchPriority?: number;
}

export interface DocsSitemapEntry {
  url: string;
  lastModified?: string | Date;
  changeFrequency?: string;
  priority?: number;
}

export interface DocsFeedEntry {
  id: string;
  url: string;
  title: string;
  description?: string;
  date?: string | Date;
  author?: string;
  tags?: string[];
}

export interface DocsSource {
  getPage(args: {
    collectionId?: string;
    slug: string[];
  }): MaybePromise<DocsPage | null>;
  getPages(args?: { collectionId?: string }): MaybePromise<DocsPage[]>;
  getCollections?(): MaybePromise<DocsCollection[]>;
  getManifest?(): MaybePromise<DocsManifest>;
  getNav?(args?: { collectionId?: string }): MaybePromise<DocsNavItem[]>;
}

export interface DocsConfig {
  basePath?: string;
  siteUrl?: string;
  title?: string;
  source?: DocsSource;
  nav?: DocsNavItem[];
  editUrl?: DocsEditUrlResolver;
}

export type DocsEditUrlResolver = (page: DocsPage) => string | undefined;

export interface DocsDiscoveryConfig {
  rootDir: string;
  outDir?: string;
  repositories?: DocsRepositoryConfig[];
  collections: DocsCollectionConfig[];
}

export type DocsRepositoryConfig =
  | DocsLocalRepositoryConfig
  | DocsWorkspaceRepositoryConfig
  | DocsGitRepositoryConfig
  | DocsCustomRepositoryConfig;

export interface DocsLocalRepositoryConfig {
  id: string;
  type: 'local';
  rootDir: string;
}

export interface DocsWorkspaceRepositoryConfig {
  id: string;
  type: 'workspace';
  packageName: string;
  rootDir?: string;
}

export interface DocsGitRepositoryConfig {
  id: string;
  type: 'git';
  url: string;
  ref: string;
  subdir?: string;
  cacheDir?: string;
}

export interface DocsCustomRepositoryConfig {
  id: string;
  type: 'custom';
  source: DocsSource;
}

export interface DocsCollectionConfig {
  id: string;
  name?: string;
  repository?: string;
  contentDir?: string;
  contentPath?: string;
  basePath?: string;
  include?: string[];
  exclude?: string[];
  /** A Standard Schema-compatible validator for the page frontmatter. */
  schema?: unknown;
  metaFileNames?: string[];
  defaultDraft?: boolean;
}

export interface CreateDocsManifestOptions {
  repositories?: DocsRepository[];
  collections: DocsCollection[];
  nav?: DocsNavItem[];
  config?: DocsConfig;
}

/** The minimal Standard Schema v1 contract used by content sources. */
export interface DocsStandardSchemaV1<Output = unknown> {
  readonly '~standard': {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) => MaybePromise<
      | { readonly value: Output; readonly issues?: undefined }
      | {
          readonly issues: ReadonlyArray<{
            readonly message: string;
            readonly path?: ReadonlyArray<
              PropertyKey | { readonly key: PropertyKey }
            >;
          }>;
        }
    >;
  };
}
