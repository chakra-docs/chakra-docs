import { isSafeDocsRoute } from '@chakra-docs/core';
import type { DocsSearchResult } from '@chakra-docs/search';

/** Keep curated ordering without indexing display-only result metadata. */
export function getDefaultSearchResults(
  results: readonly DocsSearchResult[] | undefined,
  collectionIds: readonly string[] | undefined,
  popularLimit: number | undefined,
): DocsSearchResult[] {
  const scope = collectionIds?.length ? new Set(collectionIds) : undefined;
  const limit =
    popularLimit === undefined || !Number.isFinite(popularLimit)
      ? 6
      : Math.max(0, Math.floor(popularLimit));
  const seen = new Set<string>();
  return (results ?? [])
    .filter((result) => {
      if (
        !isSafeDocsRoute(result.route) ||
        seen.has(result.id) ||
        (scope && (!result.collectionId || !scope.has(result.collectionId)))
      )
        return false;
      seen.add(result.id);
      return true;
    })
    .slice(0, limit);
}
