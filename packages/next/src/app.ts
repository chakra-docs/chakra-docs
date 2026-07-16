import { getPublishedPages } from '@chakra-docs/core';
import type { DocsManifest, DocsPage } from '@chakra-docs/core';
import { createRouteSlug, getPageByNextRoute } from './route-params.js';

export interface NextAppDocsOptions {
  manifest: DocsManifest;
  basePath?: string;
  includeDrafts?: boolean;
  includeHidden?: boolean;
}

export function createGenerateStaticParams(options: NextAppDocsOptions) {
  return function generateStaticParams(): Array<{ slug: string[] }> {
    return getPublishedPages(options.manifest.pages, options).map((page) => ({
      slug: createRouteSlug(page, options),
    }));
  };
}

export function getAppRouterDoc(
  options: NextAppDocsOptions,
  route: string,
): DocsPage | null {
  const page = getPageByNextRoute(options.manifest, route);

  if (!page || getPublishedPages([page], options).length === 0) {
    return null;
  }

  return page;
}
