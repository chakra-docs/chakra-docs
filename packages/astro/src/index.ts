import { getPublishedPages } from '@chakra-docs/core';
import type { DocsManifest } from '@chakra-docs/core';

export interface AstroDocsPath {
  params: {
    slug: string | undefined;
  };
}

export interface AstroDocsPathOptions {
  manifest: DocsManifest;
  basePath?: string;
  includeDrafts?: boolean;
  includeHidden?: boolean;
}

export function createAstroStaticPaths(
  input: DocsManifest | AstroDocsPathOptions,
): AstroDocsPath[] {
  const options = 'manifest' in input ? input : { manifest: input };

  const baseSegments =
    options.basePath === undefined
      ? getCommonCollectionBasePath(options.manifest)
      : splitRoute(options.basePath);

  return getPublishedPages(options.manifest.pages, options).map((page) => {
    const slug = createRouteSlug(page.route, baseSegments);

    return {
      params: {
        slug: slug.length > 0 ? slug.join('/') : undefined,
      },
    };
  });
}

function createRouteSlug(route: string, baseSegments: string[]): string[] {
  const routeSegments = splitRoute(route);

  if (
    !baseSegments.every((segment, index) => routeSegments[index] === segment)
  ) {
    throw new Error(
      `Docs route "${route}" is outside the configured base path "${formatRoute(baseSegments)}".`,
    );
  }

  return routeSegments.slice(baseSegments.length);
}

function getCommonCollectionBasePath(manifest: DocsManifest): string[] {
  const collectionPaths = manifest.collections.map((collection) =>
    splitRoute(collection.basePath),
  );

  if (collectionPaths.length === 0) {
    return [];
  }

  const [first, ...rest] = collectionPaths;
  let commonLength = 0;

  while (
    commonLength < first.length &&
    rest.every((path) => path[commonLength] === first[commonLength])
  ) {
    commonLength += 1;
  }

  return first.slice(0, commonLength);
}

function splitRoute(route: string): string[] {
  return route
    .split('/')
    .filter(Boolean)
    .map((segment) => decodeRouteSegment(segment, route));
}

function decodeRouteSegment(segment: string, route: string): string {
  let decoded: string;

  try {
    decoded = decodeURIComponent(segment);
  } catch {
    throw new Error(
      `Docs route "${route}" contains malformed percent-encoding in segment "${segment}".`,
    );
  }

  if (decoded.includes('/')) {
    throw new Error(
      `Docs route "${route}" contains an encoded path separator in segment "${segment}".`,
    );
  }

  return decoded;
}

function formatRoute(segments: string[]): string {
  return segments.length > 0 ? `/${segments.join('/')}` : '/';
}
