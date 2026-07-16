import { describe, expect, it } from 'vitest';
import type { DocsSearchRecord } from '@chakra-docs/core';
import { createPagefindDocumentRecords } from './index.js';

const pageRecord: DocsSearchRecord = {
  id: 'docs:getting-started',
  kind: 'page',
  pageId: 'docs:getting-started',
  collectionId: 'docs',
  route: '/docs/getting-started',
  title: 'Getting started',
  pageTitle: 'Getting started',
  headings: [],
  text: 'Getting started\nInstall and configure the SDK.',
};

const headingRecord: DocsSearchRecord = {
  id: 'docs:getting-started#install',
  kind: 'heading',
  pageId: 'docs:getting-started',
  collectionId: 'docs',
  route: '/docs/getting-started#install',
  title: 'Install',
  pageTitle: 'Getting started',
  sectionTitle: 'Install',
  headingId: 'install',
  headingLevel: 2,
  headings: [{ id: 'install', title: 'Install', level: 2 }],
  text: 'Install the SDK from npm.',
};

const minimalRecord: DocsSearchRecord = {
  id: 'standalone',
  route: '/standalone',
  title: 'Standalone',
  headings: [],
  text: 'Standalone content.',
};

describe('createPagefindDocumentRecords', () => {
  it('maps route, title and text onto url, title and content', () => {
    const [document] = createPagefindDocumentRecords([pageRecord]);

    expect(document.url).toBe('/docs/getting-started');
    expect(document.title).toBe('Getting started');
    expect(document.content).toBe(
      'Getting started\nInstall and configure the SDK.',
    );
  });

  it('maps record fields into meta', () => {
    const [document] = createPagefindDocumentRecords([headingRecord]);

    expect(document.meta).toEqual({
      id: 'docs:getting-started#install',
      kind: 'heading',
      pageId: 'docs:getting-started',
      pageTitle: 'Getting started',
      sectionTitle: 'Install',
      headingId: 'install',
      collectionId: 'docs',
    });
  });

  it('falls back to empty strings for missing meta values', () => {
    const [document] = createPagefindDocumentRecords([minimalRecord]);

    expect(document.meta).toEqual({
      id: 'standalone',
      kind: '',
      pageId: '',
      pageTitle: '',
      sectionTitle: '',
      headingId: '',
      collectionId: '',
    });
  });

  it('returns one document per record in order', () => {
    const documents = createPagefindDocumentRecords([
      pageRecord,
      headingRecord,
      minimalRecord,
    ]);

    expect(documents.map((document) => document.meta.id)).toEqual([
      'docs:getting-started',
      'docs:getting-started#install',
      'standalone',
    ]);
  });

  it('returns an empty array for no records', () => {
    expect(createPagefindDocumentRecords([])).toEqual([]);
  });

  it('preserves encoded route segments in Pagefind result urls', () => {
    const [document] = createPagefindDocumentRecords([
      {
        ...minimalRecord,
        route: '/docs/%3Aconfiguration/%2A',
      },
    ]);

    expect(document.url).toBe('/docs/%3Aconfiguration/%2A');
  });
});
