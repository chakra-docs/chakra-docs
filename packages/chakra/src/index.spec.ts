import { createElement } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as ChakraRuntime from '@chakra-ui/react';
import { describe, expect, it, vi } from 'vitest';
import type {
  DocsNavItem,
  DocsPage,
  DocsSearchRecord,
} from '@chakra-docs/core';
import type { DocsSearchProvider } from '@chakra-docs/search';
import {
  Callout,
  CodeBlock,
  DocsApiTable,
  DocsArticle,
  DocsBadge,
  DocsBreadcrumbs,
  DocsCards,
  DocsHeadingPermalink,
  DocsLayout,
  DocsMobileNavigation,
  DocsMobileTableOfContents,
  DocsPageActions,
  DocsPageFeedback,
  DocsPagination,
  DocsProvider,
  DocsSearch,
  DocsSteps,
  DocsTabs,
  DocsTableOfContents,
  MarkdownContent,
  chakraDocsCodeBlockSlotRecipe,
  chakraDocsRecipeKeys,
  chakraDocsSlotRecipes,
  chakraDocsThemeConfig,
  filterSearchRecordsByCollections,
  useDocsConfig,
} from './index.js';
import type { ChakraDocsCodeBlockAdapter, DocsLinkProps } from './index.js';
import {
  getActiveHeadingId,
  getHeadingScrollOffset,
} from './heading-scroll.js';
import type {
  DocsBrowserEnv,
  DocsBrowserWindow,
  DocsElementRect,
} from './heading-scroll.js';
import { activateSearchResult } from './search-activation.js';
import type { DocsAnchorClickEvent } from './search-activation.js';

// The workspace resolves modules with `nodenext`, which cannot follow the
// extensionless re-export chain in @chakra-ui/react's type declarations, so
// mirror src/index.ts and access the runtime through a namespace cast.
const { ChakraProvider, createSystem, defaultConfig, defaultSystem } =
  ChakraRuntime as unknown as {
    ChakraProvider: ComponentType<{ value: unknown; children?: ReactNode }>;
    createSystem: (...configs: unknown[]) => unknown;
    defaultConfig: unknown;
    defaultSystem: unknown;
  };

function renderWithStyles(node: ReactNode, system = defaultSystem): string {
  return renderToStaticMarkup(
    createElement(ChakraProvider, { value: system }, node),
  );
}

function render(node: ReactNode): string {
  const markup = renderWithStyles(node);

  // Drop the emotion <style> tags so assertions target actual markup.
  return markup.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '');
}

function createSearchRecord(
  overrides: Partial<DocsSearchRecord> & Pick<DocsSearchRecord, 'id'>,
): DocsSearchRecord {
  return {
    route: `/docs/${overrides.id}`,
    title: overrides.id,
    headings: [],
    text: '',
    ...overrides,
  };
}

function createPage(route: string, title: string): DocsPage {
  return {
    id: route,
    slug: route.split('/').filter(Boolean),
    path: `${route}.mdx`,
    route,
    title,
    frontmatter: {},
  };
}

describe('MarkdownContent', () => {
  it('renders h2-h6 headings with generated ids', () => {
    const markup = render(
      createElement(MarkdownContent, {
        source: '## Getting Started\n\n### Install It\n\n###### Tiny Note',
      }),
    );

    expect(markup).toContain('<h2 id="getting-started"');
    expect(markup).toContain('>Getting Started</h2>');
    expect(markup).toContain('<h3 id="install-it"');
    expect(markup).toContain('>Install It</h3>');
    expect(markup).toContain('<h6 id="tiny-note"');
    expect(markup).toContain('>Tiny Note</h6>');
  });

  it('deduplicates repeated heading ids', () => {
    const markup = render(
      createElement(MarkdownContent, { source: '## Setup\n\n## Setup' }),
    );

    expect(markup).toContain('<h2 id="setup"');
    expect(markup).toContain('<h2 id="setup-2"');
  });

  it('adds opt-in copyable heading permalinks', () => {
    const plain = render(
      createElement(MarkdownContent, { source: '## Install' }),
    );
    const linked = render(
      createElement(MarkdownContent, {
        getHeadingHref: (headingId) =>
          `https://example.com/docs/start#${headingId}`,
        headingPermalinks: true,
        source: '## Install',
      }),
    );

    expect(plain).not.toContain('Copy section link');
    expect(linked).toContain('aria-label="Copy section link"');
    expect(linked).toContain('title="Copy section link"');
    expect(linked).toContain('>#<');
  });

  it('renders level-one headings', () => {
    const markup = render(
      createElement(MarkdownContent, { source: '# Top Level' }),
    );

    expect(markup).toContain('<h1 id="top-level"');
    expect(markup).toContain('>Top Level</h1>');
  });

  it('renders plain paragraphs and joins wrapped lines', () => {
    const markup = render(
      createElement(MarkdownContent, {
        source: 'First line\nsecond line.\n\nAnother paragraph.',
      }),
    );

    expect(markup).toContain('>First line\nsecond line.</p>');
    expect(markup).toContain('>Another paragraph.</p>');
  });

  it('renders fenced code blocks without parsing their content as markdown', () => {
    const source = [
      '```ts',
      'const bold = "**not bold**";',
      '## not a heading',
      '- not a list',
      '```',
    ].join('\n');
    const markup = render(createElement(MarkdownContent, { source }));

    expect(markup).toContain('const bold = &quot;**not bold**&quot;;');
    expect(markup).toContain('## not a heading');
    expect(markup).toContain('- not a list');
    expect(markup).not.toContain('<strong>');
    expect(markup).not.toContain('<h2');
    expect(markup).not.toContain('<li');
    // The fence language becomes the code block title.
    expect(markup).toContain('>ts</div>');
    expect(markup).toContain('aria-label="Copy code"');
  });

  it('normalizes shorthand fence languages', () => {
    const markup = render(
      createElement(MarkdownContent, { source: '```sh\nnpm install\n```' }),
    );

    expect(markup).toContain('>bash</div>');
    expect(markup).toContain('npm install');
  });

  it('forwards renderer-scoped code block behavior', () => {
    const markup = render(
      createElement(MarkdownContent, {
        codeBlockProps: {
          copy: false,
          lineNumbers: true,
          wrap: true,
        },
        source: '```sh\nnpm install\n```',
      }),
    );

    expect(markup).toContain('data-has-line-numbers=""');
    expect(markup).toContain('data-word-wrap=""');
    expect(markup).not.toContain('aria-label="Copy code"');
  });

  it('renders unordered lists with one item per bullet', () => {
    const markup = render(
      createElement(MarkdownContent, {
        source: '- First item\n- Second item\n\nAfter list.',
      }),
    );

    expect(markup).toContain('<ul');
    expect(markup).toMatch(/<li[^>]*>First item<\/li>/);
    expect(markup).toMatch(/<li[^>]*>Second item<\/li>/);
    expect(markup).toContain('>After list.</p>');
  });

  it('renders ordered lists', () => {
    const markup = render(
      createElement(MarkdownContent, { source: '1. one\n2. two' }),
    );

    expect(markup).toContain('<ol');
    expect(markup).toMatch(/<li[^>]*>one<\/li>/);
    expect(markup).toMatch(/<li[^>]*>two<\/li>/);
  });

  it('renders blockquotes as a Note callout with joined lines', () => {
    const markup = render(
      createElement(MarkdownContent, {
        source: '> Careful with this\n> across two lines.',
      }),
    );

    expect(markup).toContain('>Note</p>');
    expect(markup).toContain('Careful with this\nacross two lines.');
    expect(markup).not.toContain('<blockquote');
  });

  it('renders inline bold, code, and links inside paragraphs', () => {
    const markup = render(
      createElement(MarkdownContent, {
        source:
          'Install **now** using `npm i` from [the docs](/docs/install) or [the site](https://example.com).',
      }),
    );

    expect(markup).toContain('<strong>now</strong>');
    expect(markup).toMatch(/<code[^>]*>npm i<\/code>/);
    expect(markup).toMatch(/<a href="\/docs\/install"[^>]*>the docs<\/a>/);
    expect(markup).toMatch(
      /<a href="https:\/\/example\.com"[^>]*>the site<\/a>/,
    );
  });

  it('renders emphasis', () => {
    const markup = render(
      createElement(MarkdownContent, { source: 'This is *emphasis* text.' }),
    );

    expect(markup).toContain('>This is <em>emphasis</em> text.</p>');
  });

  it('strips inline markdown from generated heading ids', () => {
    const markup = render(
      createElement(MarkdownContent, {
        source: '## Using `npm` and **friends**',
      }),
    );

    expect(markup).toContain('<h2 id="using-npm-and-friends"');
    expect(markup).toMatch(/<code[^>]*>npm<\/code>/);
    expect(markup).toContain('<strong>friends</strong>');
  });

  it('uses the same underscore normalization as manifest heading extraction', () => {
    const markup = render(
      createElement(MarkdownContent, { source: '## foo_bar' }),
    );

    expect(markup).toContain('<h2 id="foobar"');
  });

  it('does not allocate anchor IDs to punctuation-only headings', () => {
    const markup = render(
      createElement(MarkdownContent, { source: '## ***\n\n## Valid' }),
    );

    expect(markup.match(/<h2/g)).toHaveLength(2);
    expect(markup).toContain('<h2 id="valid"');
    expect(markup).toContain('>***</h2>');
  });

  it('supports tilde-fenced code without rendering headings inside it', () => {
    const markup = render(
      createElement(MarkdownContent, {
        source: '~~~ts\n## not a heading\nconst value = 1;\n~~~',
      }),
    );

    expect(markup).not.toContain('<h2');
    expect(markup).toContain('## not a heading');
    expect(markup).toContain('const value = 1;');
  });

  it('does not close a tilde fence with a backtick fence', () => {
    const markup = render(
      createElement(MarkdownContent, {
        source: '~~~md\n```\n## still code\n~~~',
      }),
    );

    expect(markup).not.toContain('<h2');
    expect(markup).toContain('```');
    expect(markup).toContain('## still code');
  });

  it('routes Markdown links through the configured link component', () => {
    const CustomLink: ComponentType<DocsLinkProps> = (props) =>
      createElement(
        'a',
        { 'data-custom-link': 'true', href: props.href },
        props.children,
      );
    const markup = render(
      createElement(
        DocsProvider,
        { config: { linkComponent: CustomLink } },
        createElement(MarkdownContent, {
          source: 'Read [installation](/docs/installation).',
        }),
      ),
    );

    expect(markup).toContain('data-custom-link="true"');
    expect(markup).toContain('href="/docs/installation"');
  });

  it('keeps external Markdown links out of the internal link component', () => {
    const CustomLink: ComponentType<DocsLinkProps> = (props) =>
      createElement(
        'a',
        { 'data-custom-link': 'true', href: props.href },
        props.children,
      );
    const markup = render(
      createElement(
        DocsProvider,
        { config: { linkComponent: CustomLink } },
        createElement(MarkdownContent, {
          source:
            '[Internal](/docs/installation) and [external](https://example.com).',
        }),
      ),
    );

    expect(markup.match(/data-custom-link="true"/g)).toHaveLength(1);
    expect(markup).toMatch(
      /<a href="https:\/\/example\.com"[^>]*>external<\/a>/,
    );
  });

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    ' javascript:alert(1)',
    'java\tscript:alert(1)',
    `java${String.fromCharCode(0)}script:alert(1)`,
    'data:text/html,unsafe',
    '//attacker.example/docs',
  ])('renders unsafe Markdown href %s as inert text', (href) => {
    const markup = render(
      createElement(MarkdownContent, {
        source: `[unsafe](${href})`,
      }),
    );

    expect(markup).toContain('unsafe');
    expect(markup).not.toContain('href=');
  });

  it.each([
    ['bare relative', 'guides/install'],
    ['query only', '?version=3'],
    ['fragment only', '#usage'],
    ['HTTP', 'https://example.com/docs'],
    ['email', 'mailto:docs@example.com'],
    ['phone', 'tel:+12125550100'],
  ])('preserves safe %s Markdown hrefs', (_description, href) => {
    const markup = render(
      createElement(MarkdownContent, {
        source: `[safe](${href})`,
      }),
    );

    expect(markup).toContain(`href="${href}"`);
  });
});

describe('MarkdownContent CommonMark and GFM', () => {
  it('renders aligned semantic tables with inline formatting and escaped pipes', () => {
    const markup = render(
      createElement(MarkdownContent, {
        source: '| Name | Value |\n| :--- | ---: |\n| **Bold** | `a\\|b` |',
        tableLabel: 'Configuration options',
        tableContainerSlotProps: { 'data-scroll': 'table' },
        tableHeaderSlotProps: { 'data-heading': 'cell' },
        tableCellSlotProps: { 'data-body': 'cell' },
      }),
    );
    expect(markup).toContain('role="region"');
    expect(markup).toContain('tabindex="0"');
    expect(markup).toContain('aria-label="Configuration options"');
    expect(markup).toContain('data-chakra-docs-table-scroll="external"');
    expect(markup).toContain('<thead');
    expect(markup).toContain('<tbody');
    expect(markup).toContain('scope="col"');
    expect(markup).toContain('<strong>Bold</strong>');
    expect(markup).toContain('>a|b</code>');
    expect(markup).toContain('data-heading="cell"');
    expect(markup).toContain('data-body="cell"');
    const styled = renderWithStyles(
      createElement(MarkdownContent, {
        source: '| A | B |\n| :--- | ---: |\n| a | b |',
      }),
    );
    expect(styled).toContain('overflow-x:auto');
    expect(styled).toContain('text-align:right');
  });

  it('leaves invalid table delimiters as paragraphs', () => {
    const markup = render(
      createElement(MarkdownContent, { source: '| A | B |\n| nope | nope |' }),
    );
    expect(markup).not.toContain('<table');
    expect(markup).toContain('| A | B |');
  });

  it('renders nested lists, ordered starts and read-only tasks', () => {
    const markup = render(
      createElement(MarkdownContent, {
        source: '3. Third\n   * Nested\n\n- [x] Done\n- [ ] Pending',
      }),
    );
    expect(markup).toContain('start="3"');
    expect(markup).toMatch(/<li[^>]*>Third\n<ul/);
    expect(markup).toContain('>Nested</li>');
    expect(markup.match(/type="checkbox"/g)).toHaveLength(2);
    expect(markup.match(/disabled=""/g)).toHaveLength(2);
    expect(markup).toContain('aria-label="Completed task"');
    expect(markup).toContain('aria-label="Incomplete task"');
  });

  it('handles nested emphasis, strikethrough, escapes, entities and hard breaks', () => {
    const markup = render(
      createElement(MarkdownContent, {
        source: '**Bold and _italic_** ~~removed~~ \\*literal\\* &amp;  \nnext',
      }),
    );
    expect(markup).toContain('<strong>Bold and <em>italic</em></strong>');
    expect(markup).toContain('<del>removed</del>');
    expect(markup).toContain('*literal* &amp;');
    expect(markup).toContain('<br/>');
  });

  it('renders reference links, titles, literal autolinks and images', () => {
    const markup = render(
      createElement(MarkdownContent, {
        source:
          '[Guide][guide]\n\n[guide]: /docs/guide "Guide title"\n\nhttps://example.com\n\n![Diagram][image]\n\n[image]: /diagram.png "Diagram title"',
        imageSlotProps: { 'data-image': 'custom' },
      }),
    );
    expect(markup).toContain('href="/docs/guide"');
    expect(markup).toContain('title="Guide title"');
    expect(markup).toContain('href="https://example.com"');
    expect(markup).toContain('src="/diagram.png"');
    expect(markup).toContain('alt="Diagram"');
    expect(markup).toContain('loading="lazy"');
    expect(markup).toContain('data-image="custom"');
  });

  it('escapes HTML and JSX and rejects dangerous link and image protocols', () => {
    const markup = render(
      createElement(MarkdownContent, {
        source:
          '<script>alert(1)</script>\n\n<Button onClick={run}>Click</Button>\n\n[bad](javascript:run) ![unsafe](data:image/svg+xml,evil) ![mail](mailto:test@example.com)\n\n[ref][danger]\n\n[danger]: javascript:run',
      }),
    );
    expect(markup).not.toContain('<script');
    expect(markup).not.toContain('<Button');
    expect(markup).not.toContain('href=');
    expect(markup).not.toContain('<img');
    expect(markup).toContain('&lt;script&gt;');
    expect(markup).toContain('&lt;Button');
  });

  it('supports Setext, indented and closing-hash headings with stable IDs', () => {
    const markup = render(
      createElement(MarkdownContent, {
        source: 'Page\n====\n\nSection\n-------\n\n  ## Next ##\n\n## Section',
      }),
    );
    expect(markup).toContain('<h1 id="page"');
    expect(markup).toContain('<h2 id="section"');
    expect(markup).toContain('<h2 id="next"');
    expect(markup).toContain('<h2 id="section-2"');
  });

  it('handles indented code, longer fences and thematic breaks', () => {
    const markup = render(
      createElement(MarkdownContent, {
        source: '    ## literal\n\n````ts\n```\n## still code\n````\n\n---',
      }),
    );
    expect(markup).not.toContain('<h2');
    expect(markup).toContain('## literal');
    expect(markup).toContain('## still code');
    expect(markup).toContain('<hr');
  });

  it('renders footnotes with accessible references and unique IDs per instance', () => {
    const source = 'Note[^one].\n\n[^one]: A footnote.';
    const markup = render(
      createElement(
        'div',
        null,
        createElement(MarkdownContent, { source }),
        createElement(MarkdownContent, { source }),
      ),
    );
    const ids = [...markup.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(markup).toContain('data-footnote-ref="true"');
    expect(markup).toContain('data-footnote-backref=""');
    const hrefs = [...markup.matchAll(/href="#([^"]+)"/g)].map(
      (match) => match[1],
    );
    for (const href of hrefs) expect(ids).toContain(href);
    for (const match of markup.matchAll(/aria-describedby="([^"]+)"/g))
      expect(ids).toContain(match[1]);
  });
});

describe('DocsLayout', () => {
  const nestedNav: DocsNavItem[] = [
    {
      id: 'guides',
      title: 'Guides',
      children: [
        {
          id: 'start',
          title: 'Start',
          children: [
            {
              id: 'install',
              title: 'Install',
              href: '/docs/install',
            },
          ],
        },
      ],
    },
  ];

  it('renders valid flex layout recipe declarations', () => {
    const markup = renderWithStyles(
      createElement(DocsLayout, null, createElement('p', null, 'Content')),
    );

    expect(markup).toContain('align-items:flex-start');
    expect(markup).toContain('flex-direction:column');
    expect(markup).not.toContain(' alignItems{0:');
    expect(markup).not.toContain(' flexDirection{0:');
  });

  it('does not introduce a nested main landmark by default', () => {
    const markup = render(
      createElement(DocsLayout, null, createElement('p', null, 'Content')),
    );

    expect(markup).not.toContain('<main');
    expect(markup).toContain('Content');
  });

  it('allows standalone consumers to opt into a main landmark', () => {
    const markup = render(
      createElement(
        DocsLayout,
        { contentSlotProps: { as: 'main' } },
        createElement('p', null, 'Content'),
      ),
    );

    expect(markup).toContain('<main');
  });

  it('renders sidebar content and exposes badge values for styling', () => {
    const markup = render(
      createElement(
        DocsLayout,
        {
          nav: [
            {
              badge: 'Free plan',
              href: '/docs/free',
              id: 'free',
              title: 'Free page',
            },
          ],
          sidebarBadgeSlotProps: { 'data-indicator': 'plan' },
          sidebarContent: createElement('div', null, 'Plan legend'),
        },
        createElement('p', null, 'Content'),
      ),
    );

    expect(markup).toContain('Plan legend');
    expect(markup).toContain('data-badge="Free plan"');
    expect(markup).toContain('data-indicator="plan"');
    expect(markup).toContain('title="Free plan"');
  });

  it('keeps sidebar navigation non-collapsible by default', () => {
    const markup = render(
      createElement(DocsLayout, {
        mobileNavigation: false,
        nav: nestedNav,
        page: createPage('/docs/install', 'Install'),
      }),
    );

    expect(markup).toContain('Install');
    expect(markup).not.toContain('aria-expanded');
    expect(markup).not.toContain('<button');
  });

  it('expands every active ancestor with accessible nested disclosures', () => {
    const markup = render(
      createElement(DocsLayout, {
        mobileNavigation: false,
        nav: nestedNav,
        page: createPage('/docs/install', 'Install'),
        sidebarCollapsible: true,
        sidebarDefaultExpanded: 'active',
        sidebarContentSlotProps: { 'data-sidebar-content': 'custom' },
        sidebarIndicatorSlotProps: { 'data-sidebar-indicator': 'custom' },
        sidebarTriggerSlotProps: { 'data-sidebar-trigger': 'custom' },
      }),
    );

    expect(markup.match(/aria-expanded="true"/g)).toHaveLength(2);
    expect(markup.match(/aria-controls="[^"]+"/g)).toHaveLength(2);
    expect(markup.match(/data-sidebar-trigger="custom"/g)).toHaveLength(2);
    expect(markup.match(/data-sidebar-indicator="custom"/g)).toHaveLength(2);
    expect(markup.match(/data-sidebar-content="custom"/g)).toHaveLength(2);
  });

  it('supports explicit and controlled expansion state', () => {
    const collapsed = render(
      createElement(DocsLayout, {
        mobileNavigation: false,
        nav: nestedNav,
        page: createPage('/docs/install', 'Install'),
        sidebarCollapsible: true,
        sidebarDefaultExpanded: 'none',
      }),
    );
    const controlled = render(
      createElement(DocsLayout, {
        mobileNavigation: false,
        nav: nestedNav,
        page: createPage('/docs/install', 'Install'),
        sidebarCollapsible: true,
        sidebarExpandedIds: ['guides'],
      }),
    );

    expect(collapsed.match(/aria-expanded="false"/g)).toHaveLength(2);
    expect(controlled.match(/aria-expanded="true"/g)).toHaveLength(1);
    expect(controlled.match(/aria-expanded="false"/g)).toHaveLength(1);
  });

  it('preserves linked branch navigation with a separate disclosure trigger', () => {
    const markup = render(
      createElement(DocsLayout, {
        mobileNavigation: false,
        nav: [
          {
            id: 'guides',
            title: 'Guides',
            href: '/docs/guides',
            children: [
              { id: 'install', title: 'Install', href: '/docs/install' },
            ],
          },
        ],
        sidebarCollapsible: true,
      }),
    );

    expect(markup).toContain('href="/docs/guides"');
    expect(markup).toContain('aria-label="Expand Guides"');
  });

  it('uses mobile navigation by default and supports opting out', () => {
    const enabled = render(
      createElement(DocsLayout, {
        nav: nestedNav,
        page: createPage('/docs/install', 'Install'),
      }),
    );
    const disabled = render(
      createElement(DocsLayout, {
        mobileNavigation: false,
        nav: nestedNav,
        page: createPage('/docs/install', 'Install'),
      }),
    );

    expect(enabled).toContain('aria-label="Open navigation"');
    expect(enabled).toContain('>Menu</span>');
    expect(disabled).not.toContain('aria-label="Open navigation"');
  });

  it('forwards composed mobile navigation props', () => {
    const markup = render(
      createElement(DocsLayout, {
        mobileNavigationProps: {
          open: true,
          search: createElement('div', null, 'Search documentation'),
          title: 'Documentation',
        },
        nav: nestedNav,
        page: createPage('/docs/install', 'Install'),
      }),
    );

    expect(markup).toContain('>Documentation</h2>');
    expect(markup).toContain('Search documentation');
    expect(markup).toContain('aria-current="page"');
  });
});

describe('DocsPageActions', () => {
  it('derives copy, edit, and canonical page actions from page context', () => {
    const page = {
      ...createPage('/docs/start', 'Start'),
      body: '## Install\n\nnpm install',
    };
    const markup = render(
      createElement(
        DocsProvider,
        {
          config: {
            siteUrl: 'https://docs.example.com',
            editUrl: (currentPage) =>
              `https://github.com/example/docs/edit/main/${currentPage.path}`,
          },
        },
        createElement(
          DocsPageActions.Root,
          { markdownUrl: '/docs/start.md', page },
          createElement(DocsPageActions.CopyPage),
          createElement(
            DocsPageActions.Menu,
            { open: true },
            createElement(DocsPageActions.CopyPage),
            createElement(DocsPageActions.CopyLink),
            createElement(DocsPageActions.ViewMarkdown),
            createElement(DocsPageActions.Edit),
          ),
        ),
      ),
    );

    expect(markup).toContain('aria-label="Copy page"');
    expect(markup.match(/aria-label="Copy page"/g)).toHaveLength(2);
    expect(markup).toContain('aria-label="Copy link"');
    expect(markup).toContain('aria-label="More page actions"');
    expect(markup).toContain('href="/docs/start.md"');
    expect(markup).toContain(
      'href="https://github.com/example/docs/edit/main//docs/start.mdx"',
    );
    expect(markup).toContain('View as Markdown');
    expect(markup).toContain('Edit this page');
    expect(markup).toContain('Copy a link to this page');
    expect(markup).toContain('Open this page as plain text');
    expect(markup).toContain('Suggest changes to this page');
  });

  it('renders a complete compact split composition without children', () => {
    const page = {
      ...createPage('/docs/split', 'Split'),
      body: '# Split actions',
    };
    const markup = render(
      createElement(
        DocsProvider,
        { config: { siteUrl: 'https://docs.example.com' } },
        createElement(DocsPageActions.Root, {
          markdownUrl: '/docs/split.md',
          page,
          variant: 'split',
        }),
      ),
    );

    expect(markup).toContain('aria-label="More page actions"');
    expect(markup).toContain('viewBox="0 0 16 16"');
    expect(markup).not.toContain('>More page actions<');
  });

  it('keeps a visible menu label when a split composition has no primary', () => {
    const markup = render(
      createElement(DocsPageActions.Root, {
        markdownUrl: '/docs/markdown-only.md',
        variant: 'split',
      }),
    );

    expect(markup).toContain('>More page actions<');
    expect(markup).not.toContain('viewBox="0 0 16 16"');
  });

  it('owns page-action appearance independently of generic Chakra recipes', () => {
    const system = createSystem(defaultConfig, chakraDocsThemeConfig, {
      theme: {
        recipes: {
          button: { base: { minH: '97px', bg: '#fe0099' } },
          link: { base: { color: '#fe0098' } },
        },
        slotRecipes: {
          clipboard: {
            base: {
              root: { p: '91px' },
              trigger: { minH: '93px', bg: '#fe0097' },
            },
          },
        },
      },
    });
    const markup = renderWithStyles(
      createElement(
        DocsPageActions.Root,
        { markdown: '# Page', variant: 'split' },
        createElement(DocsPageActions.CopyPage),
        createElement(DocsPageActions.Item, { label: 'Action' }),
        createElement(DocsPageActions.Item, { href: '/docs', label: 'Link' }),
        createElement(DocsPageActions.Menu, { label: 'More' }),
      ),
      system,
    );
    for (const unwanted of [
      '97px',
      '93px',
      '91px',
      '#fe0099',
      '#fe0098',
      '#fe0097',
    ]) {
      expect(markup).not.toContain(unwanted);
    }
    expect(markup).toContain('background:var(--chakra-colors-transparent)');
    expect(markup).toContain(
      'min-height:var(--chakra-docs-page-actions-height)',
    );
    expect(markup).toContain('border-inline-end-width:0');
    expect(markup).not.toContain('margin-inline-start:-');
  });

  it('retains page-action theme and per-instance overrides', () => {
    const system = createSystem(defaultConfig, chakraDocsThemeConfig, {
      theme: {
        slotRecipes: {
          [chakraDocsRecipeKeys.pageActions]: {
            base: { trigger: { bg: '#123abc' } },
          },
        },
      },
    });
    const themed = renderWithStyles(
      createElement(DocsPageActions.Root, { markdown: '# Page' }),
      system,
    );
    expect(themed).toContain('background:#123abc');
    const instance = renderWithStyles(
      createElement(
        DocsPageActions.Root,
        { markdown: '# Page' },
        createElement(DocsPageActions.CopyPage, {
          slotProps: { bg: '#456def' },
        }),
      ),
      system,
    );
    expect(instance).toContain('background:#456def');
  });

  it('supports composing only the actions an application wants', () => {
    const markup = render(
      createElement(
        DocsPageActions.Root,
        { markdown: '# Custom', pageUrl: '/docs/custom' },
        createElement(DocsPageActions.CopyPage, {
          children: 'Copy document',
          label: 'Copy for support',
        }),
        createElement(DocsPageActions.Item, {
          action: 'report',
          href: 'https://github.com/example/docs/issues/new',
          label: 'Report an issue',
        }),
      ),
    );

    expect(markup).toContain('aria-label="Copy for support"');
    expect(markup).toContain('>Copy document<');
    expect(markup).toContain('>Report an issue<');
    expect(markup).not.toContain('More page actions');
    expect(markup).not.toContain('Copy link');
  });

  it('omits unsafe page-action links', () => {
    const markup = render(
      createElement(
        DocsPageActions.Root,
        { pageUrl: '/docs/safe' },
        createElement(DocsPageActions.Item, {
          href: 'javascript:alert(1)',
          label: 'Unsafe',
        }),
      ),
    );

    expect(markup).not.toContain('Unsafe');
    expect(markup).not.toContain('javascript:');
  });

  it('composes controlled menus, groups, separators, and nested submenus', () => {
    const markup = render(
      createElement(
        DocsPageActions.Root,
        {
          markdown: '# Rich actions',
          pageUrl: '/docs/rich-actions',
          variant: 'split',
        },
        createElement(DocsPageActions.CopyPage),
        createElement(
          DocsPageActions.Menu,
          {
            ariaLabel: 'More choices',
            icon: createElement('span', null, '⌄'),
            open: true,
          },
          createElement(
            DocsPageActions.Group,
            { label: 'Page tools' },
            createElement(DocsPageActions.CopyLink),
          ),
          createElement(DocsPageActions.Separator),
          createElement(
            DocsPageActions.Submenu,
            { defaultOpen: true, label: 'Open in another chat' },
            createElement(DocsPageActions.Item, {
              href: 'https://chatgpt.com',
              label: 'ChatGPT',
            }),
          ),
        ),
      ),
    );

    expect(markup).toContain('aria-label="More choices"');
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain('aria-controls=');
    expect(markup).toContain('role="group"');
    expect(markup).toContain('aria-labelledby=');
    expect(markup).toContain('role="separator"');
    expect(markup).toContain('role="menu"');
    expect(markup).toContain('role="menuitem"');
    expect(markup).toContain('Open in another chat');
    expect(markup).toContain('href="https://chatgpt.com"');
  });

  it('renders actions in the DocsArticle header slot', () => {
    const page = createPage('/docs/start', 'Start');
    const markup = render(
      createElement(
        DocsArticle,
        {
          actions: createElement(
            DocsPageActions.Root,
            { markdown: '# Start', page },
            createElement(DocsPageActions.CopyPage),
          ),
          actionsSlotProps: { 'data-page-actions': 'header' },
          page,
        },
        createElement('p', null, 'Body'),
      ),
    );

    expect(markup).toContain('data-page-actions="header"');
    expect(markup).toContain('aria-label="Copy page"');
    expect(markup).toContain('<h1');
    expect(markup).toContain('Body');
  });
});

describe('DocsBreadcrumbs', () => {
  const nav: DocsNavItem[] = [
    {
      id: 'guides',
      title: 'Guides',
      href: '/docs/guides',
      children: [{ id: 'install', title: 'Install', href: '/docs/install' }],
    },
  ];

  it('renders linked ancestors and a current-page item', () => {
    const markup = render(
      createElement(DocsBreadcrumbs, {
        homeHref: '/',
        homeLabel: 'Home',
        nav,
        page: createPage('/docs/install', 'Install'),
      }),
    );

    expect(markup).toContain('aria-label="Breadcrumb"');
    expect(markup).toContain('href="/"');
    expect(markup).toContain('href="/docs/guides"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain('>Install</span>');
  });

  it('renders in the article breadcrumb slot', () => {
    const page = createPage('/docs/install', 'Install');
    const markup = render(
      createElement(DocsArticle, {
        breadcrumbs: createElement(DocsBreadcrumbs, { nav, page }),
        breadcrumbsSlotProps: { 'data-breadcrumbs': 'article' },
        page,
      }),
    );

    expect(markup).toContain('data-breadcrumbs="article"');
    expect(markup).toContain('aria-label="Breadcrumb"');
  });
});

describe('DocsHeadingPermalink', () => {
  it('renders an accessible clipboard trigger', () => {
    const markup = render(
      createElement(DocsHeadingPermalink, {
        headingId: 'install',
        title: 'Install',
      }),
    );

    expect(markup).toContain('aria-label="Copy section link"');
    expect(markup).toContain('title="Copy section link"');
    expect(markup).toContain('>#<');
  });

  it('omits unsafe permalink values', () => {
    const markup = render(
      createElement(DocsHeadingPermalink, {
        headingId: 'unsafe',
        href: 'javascript:alert(1)',
      }),
    );

    expect(markup).toBe('');
  });
});

describe('DocsPageFeedback', () => {
  it('renders neutral helpful choices by default', () => {
    const markup = render(createElement(DocsPageFeedback.Root, {}));

    expect(markup).toContain('<form');
    expect(markup).toContain('>Was this page helpful?</p>');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain('>Yes</button>');
    expect(markup).toContain('>No</button>');
    expect(markup).not.toContain('<textarea');
  });

  it('reveals comment and submit controls for a default selection', () => {
    const markup = render(
      createElement(DocsPageFeedback.Root, {
        defaultComment: 'More examples, please.',
        defaultValue: 'not-helpful',
      }),
    );

    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('<textarea');
    expect(markup).toContain('How could this page be improved?');
    expect(markup).toContain('More examples, please.');
    expect(markup).toContain('type="submit"');
    expect(markup).toContain('>Send feedback</button>');
  });

  it('supports fully composed controls and provider labels', () => {
    const markup = render(
      createElement(
        DocsProvider,
        { config: { labels: { feedbackPrompt: 'Useful?' } } },
        createElement(
          DocsPageFeedback.Root,
          { defaultValue: 'helpful' },
          createElement(DocsPageFeedback.Prompt, {}),
          createElement(
            DocsPageFeedback.Choices,
            {},
            createElement(
              DocsPageFeedback.Option,
              { value: 'helpful' },
              'Absolutely',
            ),
          ),
          createElement(DocsPageFeedback.Status, {}),
        ),
      ),
    );

    expect(markup).toContain('>Useful?</p>');
    expect(markup).toContain('>Absolutely</button>');
    expect(markup).not.toContain('<textarea');
    expect(markup).not.toContain('Send feedback');
  });
});

describe('DocsMobileTableOfContents', () => {
  const headings = [
    { id: 'overview', title: 'Overview', level: 2 },
    { id: 'install', title: 'Install', level: 3 },
  ];

  it('renders an accessible native disclosure and heading links', () => {
    const markup = render(
      createElement(DocsMobileTableOfContents, {
        headings,
        triggerSlotProps: { 'data-mobile-toc-trigger': 'custom' },
      }),
    );

    expect(markup).toContain('<details');
    expect(markup).toContain('<summary');
    expect(markup).toContain('data-mobile-toc-trigger="custom"');
    expect(markup).toContain('href="#overview"');
    expect(markup).toContain('href="#install"');
  });

  it('is included by DocsLayout by default and can be disabled', () => {
    const enabled = render(
      createElement(DocsLayout, { headings }, createElement('p', null, 'Body')),
    );
    const disabled = render(
      createElement(
        DocsLayout,
        { headings, mobileToc: false },
        createElement('p', null, 'Body'),
      ),
    );

    expect(enabled).toContain('<details');
    expect(disabled).not.toContain('<details');
    expect(disabled).toContain('Body');
  });
});

describe('DocsMobileNavigation', () => {
  const nav: DocsNavItem[] = [
    {
      id: 'guides',
      title: 'Guides',
      children: [{ id: 'install', title: 'Install', href: '/docs/install' }],
    },
  ];

  it('renders an accessible trigger and modal navigation drawer', () => {
    const markup = render(
      createElement(DocsMobileNavigation.Root, {
        nav,
        open: true,
        page: createPage('/docs/install', 'Install'),
      }),
    );

    expect(markup).toContain('aria-label="Open navigation"');
    expect(markup).toContain('>Menu</span>');
    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('>Browse</h2>');
    expect(markup).toContain('aria-label="Close navigation"');
    expect(markup).toContain('href="/docs/install"');
    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain('aria-expanded="true"');
  });

  it('supports composing custom trigger, header, and body content', () => {
    const markup = render(
      createElement(
        DocsMobileNavigation.Root,
        { nav, open: true },
        createElement(DocsMobileNavigation.Trigger, {
          icon: '≡',
          label: 'Documentation',
        }),
        createElement(
          DocsMobileNavigation.Content,
          null,
          createElement(
            DocsMobileNavigation.Header,
            null,
            createElement(DocsMobileNavigation.Title, null, 'Explore'),
            createElement(DocsMobileNavigation.CloseTrigger),
          ),
          createElement(
            DocsMobileNavigation.Body,
            null,
            createElement('p', null, 'Custom navigation'),
            createElement(DocsMobileNavigation.Sidebar),
          ),
        ),
      ),
    );

    expect(markup).toContain('>Documentation</span>');
    expect(markup).toContain('>Explore</h2>');
    expect(markup).toContain('Custom navigation');
    expect(markup).toContain('href="/docs/install"');
  });
});

describe('Callout', () => {
  const types = ['info', 'warning', 'success', 'danger'] as const;

  it.each(types)('renders the %s callout with title and children', (type) => {
    const markup = render(
      createElement(Callout, { type, title: `${type} title` }, 'Callout body'),
    );

    expect(markup).toContain(`>${type} title</p>`);
    expect(markup).toContain('Callout body');
  });

  it('defaults to the info palette', () => {
    const info = render(
      createElement(Callout, { type: 'info', title: 'T' }, 'B'),
    );
    const implicit = render(createElement(Callout, { title: 'T' }, 'B'));

    expect(implicit).toBe(info);
  });

  it('applies a distinct palette per type', () => {
    const markups = types.map((type) =>
      render(createElement(Callout, { type, title: 'T' }, 'B')),
    );

    expect(new Set(markups).size).toBe(types.length);
  });

  it('omits the title element when no title is provided', () => {
    const markup = render(createElement(Callout, null, 'Only body'));

    expect(markup).toContain('Only body');
    expect(markup).not.toContain('<p');
  });
});

describe('CodeBlock', () => {
  it('uses neutral display defaults', () => {
    const markup = render(
      createElement(CodeBlock, { code: 'npm install', language: 'bash' }),
    );

    expect(markup).toContain('aria-label="Copy code"');
    expect(markup).not.toContain('data-has-line-numbers');
    expect(markup).not.toContain('data-word-wrap');
  });

  it('supports line numbers, wrapping, and highlighted line ranges', () => {
    const adapter: ChakraDocsCodeBlockAdapter = {
      loadContextSync: () => ({}),
      getHighlighter:
        () =>
        ({ code, meta }) => ({
          highlighted: true,
          code: code
            .split('\n')
            .map(
              (line, index) =>
                `<span data-line="${index + 1}"${
                  meta?.highlightLines?.includes(index + 1)
                    ? ' data-highlight=""'
                    : ''
                }>${line}</span>`,
            )
            .join('\n'),
        }),
    };
    const markup = render(
      createElement(
        DocsProvider,
        { config: { codeBlock: { adapter } } },
        createElement(CodeBlock, {
          code: 'first\nsecond\nthird',
          highlightLines: '2-3',
          lineNumbers: true,
          wrap: true,
        }),
      ),
    );

    expect(markup).toContain('data-has-line-numbers=""');
    expect(markup).toContain('data-word-wrap=""');
    expect(markup.match(/data-highlight=""/g)).toHaveLength(2);
  });

  it('inherits provider defaults and lets direct props override them', () => {
    const configured = render(
      createElement(
        DocsProvider,
        { config: { codeBlock: { lineNumbers: true, wrap: true } } },
        createElement(CodeBlock, { code: 'configured' }),
      ),
    );
    const overridden = render(
      createElement(
        DocsProvider,
        { config: { codeBlock: { lineNumbers: true, wrap: true } } },
        createElement(CodeBlock, {
          code: 'overridden',
          lineNumbers: false,
          wrap: false,
        }),
      ),
    );

    expect(configured).toContain('data-has-line-numbers=""');
    expect(configured).toContain('data-word-wrap=""');
    expect(overridden).not.toContain('data-has-line-numbers');
    expect(overridden).not.toContain('data-word-wrap');
  });

  it('can omit the copy action and otherwise-empty header', () => {
    const markup = render(
      createElement(CodeBlock, { code: 'const value = true;', copy: false }),
    );

    expect(markup).not.toContain('<button');
    expect(markup).not.toContain('code-block__header');
  });
});

describe('DocsProvider / useDocsConfig', () => {
  function LabelsProbe(): ReactNode {
    const config = useDocsConfig();
    return createElement(
      'div',
      null,
      [
        config.labels?.search,
        config.labels?.searchNoResults,
        config.labels?.searchLoading,
        config.labels?.searchError,
        config.labels?.onThisPage,
      ].join('|'),
    );
  }

  it('provides default labels without a provider', () => {
    const markup = renderToStaticMarkup(createElement(LabelsProbe));

    expect(markup).toBe(
      '<div>Search|No results found|Searching…|Search is temporarily unavailable|On this page</div>',
    );
  });

  it('merges overridden labels with defaults', () => {
    const markup = renderToStaticMarkup(
      createElement(
        DocsProvider,
        { config: { labels: { search: 'Find' } } },
        createElement(LabelsProbe),
      ),
    );

    expect(markup).toBe(
      '<div>Find|No results found|Searching…|Search is temporarily unavailable|On this page</div>',
    );
  });

  it('merges nested provider configs, preserving outer overrides', () => {
    const markup = renderToStaticMarkup(
      createElement(
        DocsProvider,
        { config: { labels: { search: 'Find' } } },
        createElement(
          DocsProvider,
          { config: { labels: { searchNoResults: 'Nothing here' } } },
          createElement(LabelsProbe),
        ),
      ),
    );

    expect(markup).toBe(
      '<div>Find|Nothing here|Searching…|Search is temporarily unavailable|On this page</div>',
    );
  });
});

describe('DocsSearch (SSR)', () => {
  const records = [
    createSearchRecord({ id: 'install', title: 'Install', text: 'install it' }),
  ];

  it('does not fetch during server rendering and accepts display-only curated defaults', () => {
    const searchProvider = vi.fn<DocsSearchProvider>(async () => ({
      query: '',
      results: [],
    }));
    render(createElement(DocsSearch, { searchProvider, prefetch: 'mount' }));
    expect(searchProvider).not.toHaveBeenCalled();
    const markup = render(
      createElement(DocsSearch, {
        defaultResults: [
          { id: 'featured', title: 'Featured', route: '/docs/featured' },
        ],
      }),
    );
    expect(markup).not.toMatch(/<button[^>]*disabled/);
    expect(markup).not.toContain('role="dialog"');
  });

  it('renders the closed search trigger without crashing', () => {
    const markup = render(createElement(DocsSearch, { records }));

    expect(markup).toContain('>Search</p>');
    expect(markup).toContain('⌘K');
    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).toContain('data-state="closed"');
  });

  it('disables the trigger when there are no records', () => {
    const markup = render(createElement(DocsSearch, { records: [] }));

    expect(markup).toMatch(/<button[^>]*disabled/);
  });

  it('enables the trigger for remote search without client-side records', () => {
    const searchProvider: DocsSearchProvider = async (query) => ({
      query: query.query,
      results: [],
    });
    const markup = render(createElement(DocsSearch, { searchProvider }));

    expect(markup).not.toMatch(/<button[^>]*disabled/);
  });

  it('gives a remote provider precedence when records are also present', () => {
    const searchProvider: DocsSearchProvider = async (query) => ({
      query: query.query,
      results: [],
    });
    const inaccessibleRecord = createSearchRecord({ id: 'local' });
    Object.defineProperty(inaccessibleRecord, 'title', {
      get() {
        throw new Error('Remote mode must not index local records.');
      },
    });

    expect(() =>
      render(
        createElement(DocsSearch, {
          records: [inaccessibleRecord],
          searchProvider,
        }),
      ),
    ).not.toThrow();
  });

  it('uses overridden labels from DocsProvider', () => {
    const markup = render(
      createElement(
        DocsProvider,
        { config: { labels: { search: 'Find docs' } } },
        createElement(DocsSearch, { records }),
      ),
    );

    expect(markup).toContain('>Find docs</p>');
  });
});

describe('activateSearchResult', () => {
  const record = createSearchRecord({
    id: 'install',
    title: 'Install',
    text: 'install it',
  });

  function createClickEvent(
    overrides: Partial<DocsAnchorClickEvent> = {},
  ): DocsAnchorClickEvent {
    return {
      button: 0,
      preventDefault: vi.fn(),
      ...overrides,
    };
  }

  it('uses onNavigate for keyboard activation', () => {
    const actions: string[] = [];

    activateSearchResult(record, {
      navigate: () => actions.push('location'),
      onNavigate: (href) => actions.push(`navigate:${href}`),
      onSelect: () => actions.push('select'),
    });

    expect(actions).toEqual(['select', 'navigate:/docs/install']);
  });

  it('prevents native pointer navigation when onNavigate handles it', () => {
    const event = createClickEvent();
    const onNavigate = vi.fn();
    const onSelect = vi.fn();

    activateSearchResult(record, {
      event,
      navigate: vi.fn(),
      onNavigate,
      onSelect,
    });

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(record);
    expect(onNavigate).toHaveBeenCalledWith(record.route, record);
  });

  it('leaves unhandled pointer navigation to the result link', () => {
    const event = createClickEvent();
    const navigate = vi.fn();
    const onSelect = vi.fn();

    activateSearchResult(record, { event, navigate, onSelect });

    expect(onSelect).toHaveBeenCalledWith(record);
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('uses location navigation for keyboard activation without a callback', () => {
    const navigate = vi.fn();
    const onSelect = vi.fn();

    activateSearchResult(record, { navigate, onSelect });

    expect(onSelect).toHaveBeenCalledWith(record);
    expect(navigate).toHaveBeenCalledWith(record.route);
  });

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    ' javascript:alert(1)',
    'java\tscript:alert(1)',
    'java\nscript:alert(1)',
    `java${String.fromCharCode(0)}script:alert(1)`,
    'data:text/html,unsafe',
    '//attacker.example/docs',
    'https://attacker.example/docs',
    'docs/install',
  ])('blocks unsafe keyboard search route %s', (route) => {
    const unsafeRecord = { ...record, route };
    const navigate = vi.fn();
    const onNavigate = vi.fn();
    const onSelect = vi.fn();

    activateSearchResult(unsafeRecord, { navigate, onNavigate, onSelect });

    expect(navigate).not.toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('prevents pointer navigation for an unsafe search route', () => {
    const event = createClickEvent();
    const unsafeRecord = { ...record, route: 'javascript:alert(1)' };
    const navigate = vi.fn();
    const onNavigate = vi.fn();
    const onSelect = vi.fn();

    activateSearchResult(unsafeRecord, {
      event,
      navigate,
      onNavigate,
      onSelect,
    });

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(navigate).not.toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it.each([
    { metaKey: true },
    { ctrlKey: true },
    { shiftKey: true },
    { altKey: true },
    { button: 1 },
    { defaultPrevented: true },
  ])(
    'preserves modified or already-handled pointer clicks (%o)',
    (modifier) => {
      const event = createClickEvent(modifier);
      const navigate = vi.fn();
      const onNavigate = vi.fn();
      const onSelect = vi.fn();

      activateSearchResult(record, {
        event,
        navigate,
        onNavigate,
        onSelect,
      });

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(onSelect).not.toHaveBeenCalled();
      expect(onNavigate).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    },
  );
});

describe('Docs content primitives', () => {
  it('renders linked cards and preserves safe-link handling', () => {
    const markup = render(
      createElement(
        DocsCards.Root,
        null,
        createElement(DocsCards.Card, {
          badge: createElement(DocsBadge, null, 'New'),
          description: 'Start building a documentation site.',
          href: '/docs/start',
          icon: '→',
          title: 'Get started',
        }),
        createElement(DocsCards.Card, {
          href: 'javascript:alert(1)',
          title: 'Unsafe link',
        }),
      ),
    );

    expect(markup).toContain('<a href="/docs/start"');
    expect(markup).toContain('>Get started<');
    expect(markup).toContain('>New<');
    expect(markup).not.toContain('javascript:');
  });

  it('renders semantic ordered steps with replaceable indicators', () => {
    const markup = render(
      createElement(
        DocsSteps.Root,
        null,
        createElement(DocsSteps.Item, {
          description: 'Install the package.',
          title: 'Install',
        }),
        createElement(
          DocsSteps.Item,
          { indicator: '✓', title: 'Configure' },
          'Add the theme config.',
        ),
      ),
    );

    expect(markup).toContain('<ol');
    expect(markup.match(/<li/g)).toHaveLength(2);
    expect(markup).toContain('>Install<');
    expect(markup).toContain('>✓</span>');
  });

  it('renders accessible controlled tab relationships', () => {
    const markup = render(
      createElement(
        DocsTabs.Root,
        { defaultValue: 'npm', syncKey: 'package-manager' },
        createElement(
          DocsTabs.List,
          null,
          createElement(DocsTabs.Trigger, { value: 'npm' }, 'npm'),
          createElement(DocsTabs.Trigger, { value: 'pnpm' }, 'pnpm'),
        ),
        createElement(DocsTabs.Content, { value: 'npm' }, 'npm install'),
        createElement(DocsTabs.Content, { value: 'pnpm' }, 'pnpm add'),
      ),
    );

    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('role="tab"');
    expect(markup).toContain('aria-controls=');
    expect(markup).toContain('aria-selected="true"');
    expect(markup).toContain('role="tabpanel"');
    expect(markup).toContain('hidden=""');
    expect(markup).toContain('aria-labelledby=');
  });

  it('renders an API reference as a semantic table', () => {
    const markup = renderWithStyles(
      createElement(DocsApiTable, {
        caption: 'DocsLayout props',
        items: [
          {
            defaultValue: 'false',
            description: 'Enables collapsible navigation.',
            name: 'sidebarCollapsible',
            required: true,
            type: 'boolean',
          },
        ],
      }),
    );

    expect(markup).toContain('<table');
    expect(markup).toContain('<caption');
    expect(markup).toContain('scope="col"');
    expect(markup).toContain('>sidebarCollapsible<');
    expect(markup).toContain('>Required<');
    expect(markup).toContain('>boolean<');
    expect(markup).toContain('role="region"');
    expect(markup).toContain('aria-label="DocsLayout props"');
    expect(markup).toContain('tabindex="0"');
    expect(markup).toContain('overflow-x:auto');
    expect(markup).toContain('data-chakra-docs-table-scroll="external"');
  });

  it('bounds table and article widths without clipping the article or changing table semantics', () => {
    const recipes = chakraDocsSlotRecipes;
    expect(recipes[chakraDocsRecipeKeys.apiTable].base.root).toMatchObject({
      minW: 0,
      maxW: 'full',
      w: 'full',
      overflowX: 'auto',
    });
    expect(recipes[chakraDocsRecipeKeys.layout].base.content).toMatchObject({
      minW: 0,
      maxW: 'full',
      w: 'full',
    });
    expect(recipes[chakraDocsRecipeKeys.article].base.root).toMatchObject({
      minW: 0,
      maxW: '3xl',
      w: 'full',
      '& :where(table:not([data-chakra-docs-table-scroll="external"]))': {
        display: 'block',
        maxW: 'full',
        overflowX: 'auto',
        w: 'full',
      },
    });
    expect(recipes[chakraDocsRecipeKeys.article].base.heading).toHaveProperty(
      'flexWrap',
      'wrap',
    );
    expect(
      recipes[chakraDocsRecipeKeys.apiTable].base.table,
    ).not.toHaveProperty('display', 'block');
    const markup = renderWithStyles(
      createElement(DocsApiTable, {
        items: [],
        slotProps: { 'aria-label': 'Custom table', maxW: '20rem' },
      }),
    );
    expect(markup).toContain('aria-label="Custom table"');
    expect(markup).toContain('max-width:20rem');
  });

  it('renders badges from a neutral default with an opt-in accent tone', () => {
    const markup = render(
      createElement(DocsBadge, { tone: 'accent' }, 'Experimental'),
    );

    expect(markup).toContain('>Experimental</span>');
  });
});

describe('DocsTableOfContents (SSR)', () => {
  const headings = [
    { id: 'intro', title: 'Intro', level: 2 },
    { id: 'deep-dive', title: 'Deep Dive', level: 3 },
  ];

  it('renders a link per heading with the section label', () => {
    const markup = render(createElement(DocsTableOfContents, { headings }));

    expect(markup).toContain('>On this page</p>');
    expect(markup).toMatch(/<a href="#intro"[^>]*>.*Intro<\/a>/);
    expect(markup).toMatch(/<a href="#deep-dive"[^>]*>.*Deep Dive<\/a>/);
    expect(markup.match(/aria-hidden="true"/g)).toHaveLength(2);
  });

  it('exposes the active indicator slot for instance customization', () => {
    const markup = render(
      createElement(DocsTableOfContents, {
        activeIndicatorSlotProps: { 'data-indicator': 'custom' },
        headings,
      }),
    );

    expect(markup.match(/data-indicator="custom"/g)).toHaveLength(2);
  });

  it('supports theme-level active indicator recipe overrides', () => {
    const system = createSystem(defaultConfig, chakraDocsThemeConfig, {
      theme: {
        slotRecipes: {
          [chakraDocsRecipeKeys.tableOfContents]: {
            base: { activeIndicator: { w: '4px' } },
          },
        },
      },
    });
    const markup = renderWithStyles(
      createElement(DocsTableOfContents, { headings }),
      system,
    );

    expect(markup).toContain('width:4px');
  });

  it('renders nothing when there are no headings', () => {
    const markup = render(createElement(DocsTableOfContents, { headings: [] }));

    expect(markup).toBe('');
  });
});

describe('Chakra Docs slot recipes', () => {
  it('provides neutral page-action surfaces and visible interaction states', () => {
    const recipe = chakraDocsSlotRecipes[chakraDocsRecipeKeys.pageActions];
    expect(recipe.base).toMatchObject({
      trigger: {
        bg: 'transparent',
        color: 'fg',
        borderColor: 'border',
        borderWidth: '1px',
        _hover: { bg: 'bg.subtle' },
        _focusVisible: { outlineColor: 'fg', outlineOffset: '2px' },
        _disabled: { cursor: 'not-allowed' },
      },
      menuContent: { bg: 'bg', color: 'fg' },
      submenuContent: { bg: 'bg', color: 'fg' },
      menuItem: {
        _highlighted: { bg: 'bg.subtle', color: 'fg' },
        _focusVisible: { outlineColor: 'fg' },
      },
    });
    expect(recipe.variants?.variant.split).toMatchObject({
      root: { flexWrap: 'nowrap', gap: 0 },
      primaryTrigger: { borderEndRadius: 0, borderEndWidth: 0 },
      menuTrigger: { borderStartRadius: 0 },
    });
  });

  it('exports one configured slot recipe for every public recipe key', () => {
    expect(Object.keys(chakraDocsSlotRecipes).sort()).toEqual(
      Object.values(chakraDocsRecipeKeys).sort(),
    );
    expect(chakraDocsThemeConfig).toMatchObject({
      theme: { slotRecipes: chakraDocsSlotRecipes },
    });
  });

  it('uses portable semantic colors without requiring a color palette', () => {
    expect(
      chakraDocsSlotRecipes[chakraDocsRecipeKeys.sidebar].variants?.active.true,
    ).toMatchObject({ link: { color: 'fg' } });
    expect(
      chakraDocsSlotRecipes[chakraDocsRecipeKeys.sidebar].variants?.expanded
        .true,
    ).toMatchObject({
      content: { display: 'block' },
      indicator: { transform: 'rotate(90deg)' },
    });
    expect(
      chakraDocsSlotRecipes[chakraDocsRecipeKeys.tableOfContents].variants
        ?.active.true,
    ).toMatchObject({
      activeIndicator: { bg: 'currentColor' },
      link: { color: 'fg', _hover: { color: 'fg' } },
    });
    expect(
      chakraDocsSlotRecipes[chakraDocsRecipeKeys.search].variants?.active.true,
    ).toMatchObject({
      result: { bg: 'bg.subtle', borderColor: 'border.emphasized' },
    });
    expect(
      chakraDocsSlotRecipes[chakraDocsRecipeKeys.pageActions].variants?.variant
        .split,
    ).toMatchObject({
      root: { gap: 0 },
      primaryTrigger: { borderEndRadius: 0, borderEndWidth: 0 },
      menu: { marginInlineStart: 0 },
      menuTrigger: {
        borderStartRadius: 0,
        px: 'var(--chakra-docs-page-actions-menu-padding)',
      },
    });
    expect(
      chakraDocsSlotRecipes[chakraDocsRecipeKeys.pageActions],
    ).toMatchObject({
      defaultVariants: { size: 'md', variant: 'default' },
      variants: {
        size: {
          sm: {
            root: {
              '--chakra-docs-page-actions-height': 'sizes.7',
              '--chakra-docs-page-actions-radius': 'radii.sm',
            },
          },
          md: {},
          lg: {
            root: {
              '--chakra-docs-page-actions-height': 'sizes.10',
              '--chakra-docs-page-actions-radius': 'radii.lg',
            },
          },
        },
      },
    });
    expect(
      chakraDocsSlotRecipes[chakraDocsRecipeKeys.markdownContent].base.link,
    ).toMatchObject({ color: 'fg' });
    expect(
      chakraDocsSlotRecipes[chakraDocsRecipeKeys.layout].base.sidebar,
    ).toMatchObject({ display: { base: 'none', lg: 'block' } });
    expect(chakraDocsSlotRecipes[chakraDocsRecipeKeys.codeBlock]).toMatchObject(
      {
        base: {
          root: {
            '--code-block-highlight-bg': 'colors.bg.emphasized',
            '--code-block-highlight-border': 'colors.border.emphasized',
            bg: 'bg',
            borderColor: 'border',
            color: 'fg',
          },
          language: { color: 'fg.muted' },
        },
        defaultVariants: { variant: 'outline' },
        variants: {
          variant: {
            outline: { root: { borderColor: 'border', borderWidth: '1px' } },
            plain: { root: { borderRadius: 0, borderWidth: 0 } },
            subtle: { root: { bg: 'bg.subtle' } },
          },
        },
      },
    );
    expect(JSON.stringify(chakraDocsSlotRecipes)).not.toContain(
      'colorPalette.',
    );
    expect(JSON.stringify(chakraDocsCodeBlockSlotRecipe)).not.toMatch(
      /(?:gray|teal)\./,
    );
  });

  it.each([
    [
      chakraDocsRecipeKeys.apiTable,
      [
        'root',
        'table',
        'caption',
        'header',
        'row',
        'columnHeader',
        'cell',
        'name',
        'type',
        'defaultValue',
        'description',
        'required',
      ],
    ],
    [chakraDocsRecipeKeys.badge, ['root']],
    [
      chakraDocsRecipeKeys.cards,
      ['root', 'card', 'icon', 'content', 'title', 'description', 'badge'],
    ],
    [
      chakraDocsRecipeKeys.layout,
      ['root', 'mobileNavigation', 'inner', 'sidebar', 'content'],
    ],
    [
      chakraDocsRecipeKeys.mobileNavigation,
      [
        'root',
        'trigger',
        'triggerIcon',
        'triggerLabel',
        'backdrop',
        'positioner',
        'content',
        'header',
        'title',
        'closeTrigger',
        'search',
        'body',
        'sidebar',
      ],
    ],
    [
      chakraDocsRecipeKeys.breadcrumbs,
      ['root', 'list', 'item', 'link', 'current', 'separator'],
    ],
    [chakraDocsRecipeKeys.headingPermalink, ['root', 'trigger', 'indicator']],
    [
      chakraDocsRecipeKeys.feedback,
      [
        'root',
        'prompt',
        'choices',
        'option',
        'comment',
        'actions',
        'submit',
        'status',
      ],
    ],
    [
      chakraDocsRecipeKeys.mobileTableOfContents,
      [
        'root',
        'trigger',
        'triggerLabel',
        'current',
        'indicator',
        'content',
        'list',
        'item',
        'link',
        'activeIndicator',
      ],
    ],
    [
      chakraDocsRecipeKeys.sidebar,
      [
        'root',
        'list',
        'item',
        'link',
        'sectionTitle',
        'badge',
        'children',
        'trigger',
        'indicator',
        'content',
      ],
    ],
    [
      chakraDocsRecipeKeys.steps,
      ['root', 'item', 'indicator', 'content', 'title', 'description'],
    ],
    [chakraDocsRecipeKeys.tabs, ['root', 'list', 'trigger', 'content']],
    [
      chakraDocsRecipeKeys.tableOfContents,
      ['root', 'label', 'list', 'item', 'link', 'activeIndicator'],
    ],
    [chakraDocsRecipeKeys.callout, ['root', 'title', 'content']],
    [
      chakraDocsRecipeKeys.pageActions,
      [
        'root',
        'copyRoot',
        'trigger',
        'primaryTrigger',
        'icon',
        'label',
        'indicator',
        'menu',
        'menuTrigger',
        'menuIndicator',
        'menuPositioner',
        'menuContent',
        'menuItem',
        'menuGroup',
        'menuGroupLabel',
        'menuSeparator',
        'submenu',
        'submenuTrigger',
        'submenuIndicator',
        'submenuPositioner',
        'submenuContent',
        'description',
      ],
    ],
    [
      chakraDocsRecipeKeys.codeBlock,
      [
        'root',
        'header',
        'title',
        'control',
        'language',
        'copyTrigger',
        'copyIndicator',
        'content',
        'code',
        'codeText',
      ],
    ],
  ])('keeps the %s public slot inventory stable', (key, slots) => {
    expect(chakraDocsSlotRecipes[key].slots).toEqual(slots);
  });
});

describe('DocsPagination', () => {
  const nav: DocsNavItem[] = [
    {
      id: 'guides',
      title: 'Guides',
      children: [
        { id: 'first', title: 'First Page', href: '/docs/first' },
        { id: 'second', title: 'Second Page', href: '/docs/second' },
        { id: 'third', title: 'Third Page', href: '/docs/third' },
      ],
    },
  ];

  it('links to the previous and next pages for a middle page', () => {
    const markup = render(
      createElement(DocsPagination, {
        nav,
        page: createPage('/docs/second', 'Second Page'),
      }),
    );

    expect(markup).toContain('>Previous</p>');
    expect(markup).toMatch(/<a[^>]*href="\/docs\/first"[^>]*>First Page<\/a>/);
    expect(markup).toContain('>Next</p>');
    expect(markup).toMatch(/<a[^>]*href="\/docs\/third"[^>]*>Third Page<\/a>/);
  });

  it('renders valid flex pagination recipe declarations', () => {
    const markup = renderWithStyles(
      createElement(DocsPagination, {
        nav,
        page: createPage('/docs/second', 'Second Page'),
      }),
    );

    expect(markup).toContain('border-top-width:1px');
    expect(markup).toContain('justify-content:space-between');
    expect(markup).not.toContain(' borderTopWidth{0:');
    expect(markup).not.toContain(' justifyContent{0:');
  });

  it('omits the previous link on the first page', () => {
    const markup = render(
      createElement(DocsPagination, {
        nav,
        page: createPage('/docs/first', 'First Page'),
      }),
    );

    expect(markup).not.toContain('>Previous</p>');
    expect(markup).toContain('>Next</p>');
    expect(markup).toMatch(/<a[^>]*href="\/docs\/second"/);
  });

  it('renders nothing when the page is not in the nav', () => {
    const markup = render(
      createElement(DocsPagination, {
        nav: [],
        page: createPage('/docs/missing', 'Missing'),
      }),
    );

    expect(markup).toBe('');
  });
});

describe('filterSearchRecordsByCollections', () => {
  const records = [
    createSearchRecord({ id: 'a', collectionId: 'v1' }),
    createSearchRecord({ id: 'b', collectionId: 'v2' }),
    createSearchRecord({ id: 'c' }),
  ];

  it('returns all records when no collection scope is provided', () => {
    expect(filterSearchRecordsByCollections(records, undefined)).toEqual(
      records,
    );
  });

  it('treats an empty scope as unscoped', () => {
    expect(filterSearchRecordsByCollections(records, [])).toEqual(records);
    expect(filterSearchRecordsByCollections(records, [''])).toEqual(records);
  });

  it('keeps only records in the scoped collections', () => {
    const results = filterSearchRecordsByCollections(records, ['v1']);

    expect(results.map((record) => record.id)).toEqual(['a']);
  });

  it('drops records without a collectionId when scoped', () => {
    const results = filterSearchRecordsByCollections(records, ['v1', 'v2']);

    expect(results.map((record) => record.id)).toEqual(['a', 'b']);
  });
});

describe('getActiveHeadingId', () => {
  function createEnv(
    rects: Record<string, DocsElementRect>,
    windowOverrides: Partial<DocsBrowserWindow> = {},
  ): DocsBrowserEnv {
    const win: DocsBrowserWindow = { innerHeight: 800, ...windowOverrides };

    return {
      document: {
        getElementById: (id) =>
          rects[id] ? { getBoundingClientRect: () => rects[id] } : null,
      },
      window: win,
    };
  }

  it('returns the last heading scrolled past the offset', () => {
    const env = createEnv({
      one: { top: -300, bottom: -260 },
      two: { top: 4, bottom: 44 },
      three: { top: 500, bottom: 540 },
    });

    expect(getActiveHeadingId(env, ['one', 'two', 'three'], 8)).toBe('two');
  });

  it('falls back to the first visible heading when none has been passed', () => {
    const env = createEnv({
      one: { top: 200, bottom: 240 },
      two: { top: 500, bottom: 540 },
    });

    expect(getActiveHeadingId(env, ['one', 'two'], 8)).toBe('one');
  });

  it('ignores headings that are missing from the document', () => {
    const env = createEnv({
      real: { top: 100, bottom: 140 },
    });

    expect(getActiveHeadingId(env, ['ghost', 'real'], 8)).toBe('real');
  });

  it('returns undefined when nothing is passed or visible', () => {
    const env = createEnv({
      below: { top: 900, bottom: 940 },
    });

    expect(getActiveHeadingId(env, ['below'], 8)).toBeUndefined();
  });

  it('honors the CSS scroll margin when computing the activation offset', () => {
    const rects = {
      one: { top: 50, bottom: 60 },
      two: { top: 70, bottom: 90 },
    };
    const withoutMargin = createEnv(rects);
    const withMargin = createEnv(rects, {
      getComputedStyle: () => ({ scrollMarginBlockStart: '100px' }),
    });

    // With only the 8px fallback neither heading is passed; the first
    // visible heading wins.
    expect(getActiveHeadingId(withoutMargin, ['one', 'two'], 8)).toBe('one');
    // With a 100px scroll margin both are passed; the last one wins.
    expect(getActiveHeadingId(withMargin, ['one', 'two'], 8)).toBe('two');
  });
});

describe('getHeadingScrollOffset', () => {
  const element = {};

  it('prefers the computed scroll-margin-block-start', () => {
    const win: DocsBrowserWindow = {
      getComputedStyle: () => ({ scrollMarginBlockStart: '64px' }),
    };

    expect(getHeadingScrollOffset(element, 8, win)).toBe(64);
  });

  it('falls back to scroll-margin-top when block-start is unset', () => {
    const win: DocsBrowserWindow = {
      getComputedStyle: () => ({ scrollMarginTop: '48px' }),
    };

    expect(getHeadingScrollOffset(element, 8, win)).toBe(48);
  });

  it('uses a numeric fallback when no computed style exists', () => {
    expect(getHeadingScrollOffset(element, 24, {})).toBe(24);
  });

  it('parses string fallbacks as pixels', () => {
    expect(getHeadingScrollOffset(element, '32px', {})).toBe(32);
  });

  it('resolves responsive fallbacks to the last defined value', () => {
    expect(getHeadingScrollOffset(element, [8, null, '16px'], {})).toBe(16);
    expect(getHeadingScrollOffset(element, { base: 4, lg: '24px' }, {})).toBe(
      24,
    );
  });

  it('returns 0 for unparseable fallbacks', () => {
    expect(getHeadingScrollOffset(element, 'auto', {})).toBe(0);
  });
});
