import type { DocsManifest, DocsPage } from '@chakra-docs/core';

interface RouteParamOptions {
  manifest: DocsManifest;
  basePath?: string;
}

export function createRouteSlug(
  page: DocsPage,
  options: RouteParamOptions,
): string[] {
  const route = splitRoute(page.route);
  const basePath = splitRoute(
    options.basePath ?? getCommonCollectionBasePath(options.manifest),
  );

  if (!basePath.every((segment, index) => route[index] === segment)) {
    throw new Error(
      `Docs route "${page.route}" is outside the configured base path "${formatRoute(basePath)}".`,
    );
  }

  return route.slice(basePath.length);
}

function getCommonCollectionBasePath(manifest: DocsManifest): string {
  const collectionPaths = manifest.collections.map((collection) =>
    splitRoute(collection.basePath),
  );

  if (collectionPaths.length === 0) {
    return '/';
  }

  const [first, ...rest] = collectionPaths;
  let commonLength = 0;

  while (
    commonLength < first.length &&
    rest.every((path) => path[commonLength] === first[commonLength])
  ) {
    commonLength += 1;
  }

  return formatRoute(first.slice(0, commonLength));
}

function splitRoute(route: string): string[] {
  return route.split('/').filter(Boolean);
}

function formatRoute(segments: string[]): string {
  return segments.length > 0 ? `/${segments.join('/')}` : '/';
}
