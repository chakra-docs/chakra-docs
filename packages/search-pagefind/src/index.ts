import type { DocsSearchRecord } from '@chakra-docs/core';

export interface PagefindDocumentRecord {
  url: string;
  title: string;
  content: string;
  meta: Record<string, string>;
}

export function createPagefindDocumentRecords(
  records: DocsSearchRecord[],
): PagefindDocumentRecord[] {
  return records.map((record) => ({
    url: record.route,
    title: record.title,
    content: [record.text, ...(record.tags ?? []), ...(record.aliases ?? [])]
      .filter(Boolean)
      .join('\n'),
    meta: {
      id: record.id,
      kind: record.kind ?? '',
      pageId: record.pageId ?? '',
      pageTitle: record.pageTitle ?? '',
      sectionTitle: record.sectionTitle ?? '',
      headingId: record.headingId ?? '',
      headingLevel: record.headingLevel?.toString() ?? '',
      collectionId: record.collectionId ?? '',
      sourceId: record.sourceId ?? '',
      description: record.description ?? '',
      tags: record.tags?.join(', ') ?? '',
      aliases: record.aliases?.join(', ') ?? '',
      searchPriority: record.searchPriority?.toString() ?? '',
    },
  }));
}
