import { isSafeDocsRoute } from '@chakra-docs/core';
import type { DocsSearchResponse, DocsSearchResult } from './search.js';

export function isDocsSearchResponse(
  value: unknown,
): value is DocsSearchResponse {
  if (!isRecord(value) || typeof value.query !== 'string') {
    return false;
  }

  return (
    Array.isArray(value.results) && value.results.every(isDocsSearchResult)
  );
}

function isDocsSearchResult(value: unknown): value is DocsSearchResult {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.route !== 'string' ||
    !isSafeDocsRoute(value.route) ||
    typeof value.title !== 'string' ||
    'text' in value ||
    'headings' in value
  ) {
    return false;
  }

  if (
    value.kind !== undefined &&
    value.kind !== 'page' &&
    value.kind !== 'heading'
  ) {
    return false;
  }

  const optionalStrings = [
    value.pageId,
    value.collectionId,
    value.sourceId,
    value.pageTitle,
    value.sectionTitle,
    value.headingId,
    value.description,
  ];

  if (
    optionalStrings.some(
      (item) => item !== undefined && typeof item !== 'string',
    )
  ) {
    return false;
  }

  if (
    value.headingLevel !== undefined &&
    (typeof value.headingLevel !== 'number' ||
      !Number.isSafeInteger(value.headingLevel) ||
      value.headingLevel < 0)
  ) {
    return false;
  }

  return (
    value.tags === undefined ||
    (Array.isArray(value.tags) &&
      value.tags.every((tag) => typeof tag === 'string'))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
