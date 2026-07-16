import { encodeRouteSegment, getPageByRoute } from '@chakra-docs/core';
import type { DocsManifest, DocsPage } from '@chakra-docs/core';

interface RouteParamOptions {
  manifest: DocsManifest;
  basePath?: string;
}

export function createRouteSlug(
  page: DocsPage,
  options: RouteParamOptions,
): string[] {
  const route = splitRoute(page.route).map(decodeRouteSegment);
  const basePath = splitRoute(
    options.basePath ?? getCommonCollectionBasePath(options.manifest),
  ).map(decodeRouteSegment);

  if (!basePath.every((segment, index) => route[index] === segment)) {
    throw new Error(
      `Docs route "${page.route}" is outside the configured base path "${formatRoute(basePath)}".`,
    );
  }

  return route.slice(basePath.length);
}

export function getPageByNextRoute(
  manifest: DocsManifest,
  route: string,
): DocsPage | null {
  const encodedRoute = formatRoute(
    splitRoute(route).map(encodeNextRouteSegment),
  );

  return (
    getPageByRoute(manifest, encodedRoute) ?? getPageByRoute(manifest, route)
  );
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

function decodeRouteSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function encodeNextRouteSegment(segment: string): string {
  try {
    return encodeRouteSegment(segment);
  } catch {
    return segment;
  }
}

function formatRoute(segments: string[]): string {
  return segments.length > 0 ? `/${segments.join('/')}` : '/';
}
