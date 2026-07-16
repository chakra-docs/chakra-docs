import type {
  DocsCollectionOption,
  DocsManifest,
  DocsNavItem,
  DocsPage,
  DocsSearchRecord,
} from '@chakra-docs/core';
import {
  createCollectionOptions,
  getPageByRoute,
  getPublishedPages,
} from '@chakra-docs/core';
import { createRouteSlug } from './route-params.js';

export interface NextPagesDocsOptions {
  manifest: DocsManifest;
  basePath?: string;
  includeDrafts?: boolean;
  includeHidden?: boolean;
  /**
   * Include the complete manifest search corpus in every page's static props.
   * Defaults to false to keep aggregate static output linear in page count.
   */
  includeSearch?: boolean;
  /** Resolve a deliberately scoped search corpus for the current page. */
  searchRecords?: NextPagesSearchRecordsResolver;
}

export interface NextPagesSearchRecordsContext {
  manifest: DocsManifest;
  page: DocsPage;
}

export type NextPagesSearchRecordsResolver = (
  context: NextPagesSearchRecordsContext,
) => DocsSearchRecord[];

export interface NextPagesRouterDocProps {
  collectionOptions: DocsCollectionOption[];
  nav: DocsNavItem[];
  page: DocsPage;
  search: DocsSearchRecord[];
}

export function createGetStaticPaths(options: NextPagesDocsOptions) {
  return function getStaticPaths() {
    return {
      paths: getPublishedPages(options.manifest.pages, options).map((page) => ({
        params: { slug: createRouteSlug(page, options) },
      })),
      fallback: false,
    };
  };
}

export function getPagesRouterDoc(
  options: NextPagesDocsOptions,
  route: string,
): DocsPage | null {
  const page = getPageByRoute(options.manifest, route);

  if (!page || getPublishedPages([page], options).length === 0) {
    return null;
  }

  return page;
}

export function createPagesRouterDocProps(
  options: NextPagesDocsOptions,
  route: string,
): NextPagesRouterDocProps | null {
  const page = getPagesRouterDoc(options, route);

  if (!page) {
    return null;
  }

  return {
    collectionOptions: createCollectionOptions(options.manifest.collections),
    nav: options.manifest.nav,
    page,
    search: resolveSearchRecords(options, page),
  };
}

function resolveSearchRecords(
  options: NextPagesDocsOptions,
  page: DocsPage,
): DocsSearchRecord[] {
  if (options.searchRecords) {
    return options.searchRecords({ manifest: options.manifest, page });
  }

  return options.includeSearch ? options.manifest.search : [];
}

export function serializeNextProps<TProps>(props: TProps): TProps {
  return JSON.parse(JSON.stringify(props)) as TProps;
}
