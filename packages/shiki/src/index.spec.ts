// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Highlighter } from 'shiki';
import {
  createChakraDocsShikiAdapter,
  chakraDocsShikiLanguages,
  chakraDocsShikiThemes,
} from './index.js';
import type { ChakraDocsShikiAdapter, ChakraDocsShikiThemes } from './index.js';

const adapters: ChakraDocsShikiAdapter[] = [];
function create(
  options: Parameters<typeof createChakraDocsShikiAdapter>[0] = {},
) {
  const adapter = createChakraDocsShikiAdapter(options);
  adapters.push(adapter);
  return adapter;
}
afterEach(() => {
  adapters.forEach((adapter) => adapter.dispose());
  adapters.length = 0;
  vi.restoreAllMocks();
});

describe('createChakraDocsShikiAdapter', () => {
  it('is lazy and returns untouched plain text before initialization', () => {
    const adapter = create();
    expect(adapter.loadContextSync()).toBeNull();
    expect(
      adapter.getHighlighter(null)({ code: '<script>unsafe</script>' }),
    ).toEqual({ code: '<script>unsafe</script>', highlighted: false });
  });

  it('shares initialization and highlights default languages without shell tags', async () => {
    const adapter = create();
    const first = adapter.loadContext();
    expect(adapter.loadContext()).toBe(first);
    const context = (await first) as Highlighter;
    expect(adapter.loadContextSync()).toBe(context);
    expect(context.getLoadedLanguages()).toEqual(
      expect.arrayContaining([...chakraDocsShikiLanguages]),
    );
    expect(context.getLoadedThemes()).toEqual(
      expect.arrayContaining(Object.values(chakraDocsShikiThemes)),
    );
    const result = adapter.getHighlighter(context)({
      code: 'const count = 1\n',
      language: 'ts',
    });
    expect(result.highlighted).toBe(true);
    expect(result.code).toContain('style="color:');
    expect(result.code).toContain('data-line="1"');
    expect(result.code).not.toMatch(/<\/?(?:pre|code)\b/);
  });

  it('selects light and dark themes on every highlight call', async () => {
    const adapter = create({
      languages: ['typescript'],
      themes: { light: 'github-light', dark: 'nord' },
    });
    const highlight = adapter.getHighlighter(await adapter.loadContext());
    const base = { code: 'const value = true', language: 'typescript' };
    const light = highlight({ ...base, meta: { colorScheme: 'light' } });
    const dark = highlight({ ...base, meta: { colorScheme: 'dark' } });
    expect(light.code).not.toBe(dark.code);
    expect(highlight({ ...base, meta: { colorScheme: 'custom' } })).toEqual(
      dark,
    );
    expect(highlight(base)).toEqual(dark);
  });

  it('preserves escaping, whitespace and metadata for unknown or missing grammars', async () => {
    const adapter = create({ languages: [] });
    const highlight = adapter.getHighlighter(await adapter.loadContext());
    const code = '  <img src=x onerror=alert(1)>\n\nlast  ';
    for (const language of [undefined, 'unknown-lang', 'text', 'js']) {
      const result = highlight({
        code,
        language,
        meta: {
          highlightLines: [1],
          wordWrap: true,
          addedLineNumbers: [1],
          removedLineNumbers: [3],
          focusedLineNumbers: [3],
        },
      });
      expect(result.highlighted).toBe(true);
      expect(result.code).not.toContain('<img');
      expect(result.code).toMatch(/(?:&lt;|&#x3C;)img/);
      expect(result.code).toContain('data-highlight=""');
      expect(result.code).toContain('data-word-wrap=""');
      expect(result.code).toContain('data-diff="added"');
      expect(result.code).toContain('data-diff="removed"');
      expect(result.code).toContain('data-focused=""');
      const document = new DOMParser().parseFromString(
        result.code,
        'text/html',
      );
      expect(document.body.textContent).toBe(code);
    }
  });

  it.each([
    '<script>alert(1)</script>',
    '<script',
    '<scrip<script>t>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)><a href="javascript:alert(1)">link</a></svg>',
    '</code></pre><iframe srcdoc="<script>alert(1)</script>"></iframe>',
    '  &lt;script&gt; &amp; &#x3C; "quoted"\n\nlast  ',
  ])('keeps markup inert and preserves source text: %s', async (code) => {
    const adapter = create({ languages: ['html'] });
    // Uninitialized fallback is explicitly text, never trusted HTML.
    expect(adapter.getHighlighter(null)({ code })).toEqual({
      code,
      highlighted: false,
    });
    const highlight = adapter.getHighlighter(await adapter.loadContext());
    for (const language of ['html', 'unknown-lang', 'text', 'js', undefined]) {
      const result = highlight({ code, language });
      expect(result.highlighted).toBe(true);
      // Parse into a detached, inert document; never execute fixture markup.
      const document = new DOMParser().parseFromString(
        result.code,
        'text/html',
      );
      expect(document.body.textContent).toBe(code);
      expect(
        document.querySelector('script, img, svg, iframe, a, pre, code'),
      ).toBeNull();
      // Highlighting may add spans, but must not introduce source elements or
      // event-handler attributes, including ones not listed in the fixtures.
      for (const element of document.body.querySelectorAll('*')) {
        expect(element.localName).toBe('span');
      }
      for (const element of document.querySelectorAll('*')) {
        expect(
          element
            .getAttributeNames()
            .some((name) => name.toLowerCase().startsWith('on')),
        ).toBe(false);
      }
    }
  });

  it('can be preloaded for synchronous rendering, disposed and reinitialized', async () => {
    const adapter = create({ languages: ['json'] });
    const first = (await adapter.loadContext()) as Highlighter;
    const dispose = vi.spyOn(first, 'dispose');
    // Provider unmounts must not dispose an instance shared by other providers.
    expect('unloadContext' in adapter).toBe(false);
    adapter.dispose();
    adapter.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(adapter.getHighlighter(first)({ code: '{}' }).highlighted).toBe(
      false,
    );
    const second = await adapter.loadContext();
    expect(second).not.toBe(first);
    expect(
      adapter.getHighlighter(second)({ code: '{}', language: 'json' })
        .highlighted,
    ).toBe(true);
  });

  it('disposes a pending initialization without reviving the old context', async () => {
    const adapter = create({ languages: [] });
    const pending = adapter.loadContext();
    adapter.dispose();
    expect(await pending).toBeNull();
    expect(adapter.loadContextSync()).toBeNull();
    expect(await adapter.loadContext()).not.toBeNull();
  });

  it('reports load errors and permits retries without unhandled rejections', async () => {
    const onError = vi.fn();
    const adapter = create({
      themes: {
        light: 'missing-theme',
        dark: 'missing-theme',
      } as unknown as ChakraDocsShikiThemes,
      onError,
    });
    expect(await adapter.loadContext()).toBeNull();
    expect(await adapter.loadContext()).toBeNull();
    expect(onError).toHaveBeenCalledTimes(2);
  });

  it('falls back safely when highlighting or the error observer throws', async () => {
    const onError = vi.fn(() => {
      throw new Error('observer');
    });
    const adapter = create({ languages: [], onError });
    const context = (await adapter.loadContext()) as Highlighter;
    vi.spyOn(context, 'codeToHtml').mockImplementation(() => {
      throw new Error('highlight');
    });
    expect(adapter.getHighlighter(context)({ code: '<example>' })).toEqual({
      code: '<example>',
      highlighted: false,
    });
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
