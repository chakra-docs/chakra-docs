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
  DocsLayout,
  DocsPagination,
  DocsProvider,
  DocsSearch,
  DocsTableOfContents,
  MarkdownContent,
  chakraDocsRecipeKeys,
  chakraDocsThemeConfig,
  filterSearchRecordsByCollections,
  useDocsConfig,
} from './index.js';
import type { DocsLinkProps } from './index.js';
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

  it('treats single-# lines as paragraphs, not headings', () => {
    const markup = render(
      createElement(MarkdownContent, { source: '# Top Level' }),
    );

    expect(markup).not.toContain('<h1');
    expect(markup).toContain('># Top Level</p>');
  });

  it('renders plain paragraphs and joins wrapped lines', () => {
    const markup = render(
      createElement(MarkdownContent, {
        source: 'First line\nsecond line.\n\nAnother paragraph.',
      }),
    );

    expect(markup).toContain('>First line second line.</p>');
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

  it('renders ordered-list syntax as a paragraph (not supported as a list)', () => {
    const markup = render(
      createElement(MarkdownContent, { source: '1. one\n2. two' }),
    );

    expect(markup).not.toContain('<ol');
    expect(markup).not.toContain('<li');
    expect(markup).toContain('>1. one 2. two</p>');
  });

  it('renders blockquotes as a Note callout with joined lines', () => {
    const markup = render(
      createElement(MarkdownContent, {
        source: '> Careful with this\n> across two lines.',
      }),
    );

    expect(markup).toContain('>Note</p>');
    expect(markup).toContain('Careful with this across two lines.');
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

  it('passes unsupported single-asterisk emphasis through as plain text', () => {
    const markup = render(
      createElement(MarkdownContent, { source: 'This is *emphasis* text.' }),
    );

    expect(markup).toContain('>This is *emphasis* text.</p>');
    expect(markup).not.toContain('<em>');
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

  it('does not create headings that manifest extraction would discard', () => {
    const markup = render(
      createElement(MarkdownContent, { source: '## ***\n\n## Valid' }),
    );

    expect(markup.match(/<h2/g)).toHaveLength(1);
    expect(markup).toContain('<h2 id="valid"');
    expect(markup).toContain('>## ***</p>');
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

    expect(markup).toContain('>unsafe</span>');
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

describe('DocsLayout', () => {
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
