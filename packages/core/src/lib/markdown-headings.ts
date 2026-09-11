import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { gfm } from 'micromark-extension-gfm';
import { createHeadingIdGenerator } from './slug.js';
import type { DocsHeading } from './types.js';

export interface DocsMarkdownHeading extends DocsHeading {
  /** Source offsets, used to keep rendered anchors and search sections aligned. */
  start: number;
  end: number;
}

interface MarkdownNode {
  type: string;
  depth?: number;
  value?: string;
  alt?: string | null;
  children?: MarkdownNode[];
  position?: { start: { offset?: number }; end: { offset?: number } };
}

/** CommonMark/GFM headings in document order, excluding code and raw HTML. */
export function getDocsMarkdownHeadings(source: string): DocsMarkdownHeading[] {
  const tree = fromMarkdown(source, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });
  const nextId = createHeadingIdGenerator();
  const headings: DocsMarkdownHeading[] = [];
  function text(node: MarkdownNode): string {
    if (node.type === 'html') return '';
    return node.children?.map(text).join('') ?? node.alt ?? node.value ?? '';
  }
  function visit(node: MarkdownNode) {
    if (node.type === 'heading') {
      // Preserve the historical normalization of underscores in anchor titles.
      const title = text(node).replace(/[*_~]/g, '').trim();
      if (title) {
        headings.push({
          id: nextId(title),
          title,
          level: node.depth ?? 2,
          start: node.position?.start.offset ?? 0,
          end: node.position?.end.offset ?? 0,
        });
      }
    }
    node.children?.forEach(visit);
  }
  visit(tree);
  return headings;
}
