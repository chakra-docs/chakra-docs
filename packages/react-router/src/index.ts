import { encodeRouteSegment, getPublishedPages } from '@chakra-docs/core';
import type { DocsManifest } from '@chakra-docs/core';

export interface DocsRouteObject {
  id: string;
  path: string;
  handle: {
    docsPageId: string;
  };
}

export interface DocsRoutesOptions {
  manifest: DocsManifest;
  includeDrafts?: boolean;
  includeHidden?: boolean;
}

export function createDocsRoutes(
  input: DocsManifest | DocsRoutesOptions,
): DocsRouteObject[] {
  const options = 'manifest' in input ? input : { manifest: input };

  return getPublishedPages(options.manifest.pages, options).map((page) => ({
    id: page.id,
    path: encodeLiteralRoute(page.route),
    handle: {
      docsPageId: page.id,
    },
  }));
}

function encodeLiteralRoute(route: string): string {
  return route
    .split('/')
    .map((segment) => canonicalizeRouteSegment(segment, route))
    .join('/');
}

function canonicalizeRouteSegment(segment: string, route: string): string {
  if (!segment) {
    return segment;
  }

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

  try {
    return encodeRouteSegment(decoded);
  } catch {
    throw new Error(
      `Docs route "${route}" contains an invalid Unicode sequence in segment "${segment}".`,
    );
  }
}
