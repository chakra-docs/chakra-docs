import { describe, expect, it } from 'vitest';
import { getDocsMarkdownHeadings } from './markdown-headings.js';
import { createSearchRecords } from './helpers.js';

describe('getDocsMarkdownHeadings', () => {
  it('collects CommonMark headings with matching offsets and stable IDs', () => {
    const source =
      '# Page\n\nSection\n---\n\n  ## **Section** ##\n\n> ### Nested\n\n    ## code\n\n~~~md\n## code\n~~~\n\n## [Link][ref]\n\n[ref]: /docs\n\n## foo_bar\n\n## ***';
    const headings = getDocsMarkdownHeadings(source);
    expect(headings.map(({ id, level }) => [id, level])).toEqual([
      ['page', 1],
      ['section', 2],
      ['section-2', 2],
      ['nested', 3],
      ['link', 2],
      ['foobar', 2],
    ]);
    expect(source.slice(headings[1].start, headings[1].end)).toBe(
      'Section\n---',
    );
  });

  it('does not interpret HTML content or GFM tables as headings', () => {
    expect(
      getDocsMarkdownHeadings(
        '<div>\n## hidden\n</div>\n\n| A |\n| --- |\n| ## cell |',
      ),
    ).toEqual([]);
  });

  it('indexes Setext sections with their own content', () => {
    const body = 'Install\n-------\n\nFirst body\n\n## Usage ##\n\nSecond body';
    const records = createSearchRecords([
      {
        id: 'guide',
        path: 'guide.md',
        route: '/docs/guide',
        slug: ['guide'],
        title: 'Guide',
        frontmatter: {},
        body,
        headings: getDocsMarkdownHeadings(body).map(({ id, title, level }) => ({
          id,
          title,
          level,
        })),
      },
    ]);
    expect(
      records.find((item) => item.headingId === 'install')?.text,
    ).toContain('First body');
    expect(
      records.find((item) => item.headingId === 'install')?.text,
    ).not.toContain('Second body');
    expect(records.find((item) => item.headingId === 'usage')?.text).toContain(
      'Second body',
    );
  });
});
