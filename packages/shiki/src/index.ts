import type { BundledLanguage, BundledTheme, Highlighter } from 'shiki';

export const chakraDocsShikiLanguages = [
  'astro',
  'bash',
  'css',
  'html',
  'javascript',
  'json',
  'markdown',
  'mdx',
  'tsx',
  'typescript',
  'yaml',
] as const satisfies readonly BundledLanguage[];

export interface ChakraDocsShikiThemes {
  readonly light: BundledTheme;
  readonly dark: BundledTheme;
}

export const chakraDocsShikiThemes = {
  light: 'github-light',
  dark: 'github-dark',
} as const satisfies ChakraDocsShikiThemes;

export interface CreateChakraDocsShikiAdapterOptions {
  /** Shiki grammars to preload. Other fence languages render as plain text. */
  readonly languages?: readonly BundledLanguage[];
  readonly themes?: ChakraDocsShikiThemes;
  /** Optional reporting hook. Failures never prevent code from rendering. */
  readonly onError?: (error: unknown) => void;
}

/** Structural compatibility with Chakra Docs, Chakra UI and Postkit adapters. */
export interface ChakraDocsShikiHighlightOptions {
  code: string;
  language?: string;
  meta?: {
    colorScheme?: string;
    highlightLines?: number[];
    showLineNumbers?: boolean;
    wordWrap?: boolean;
    removedLineNumbers?: number[];
    addedLineNumbers?: number[];
    focusedLineNumbers?: number[];
  };
}

export interface ChakraDocsShikiAdapter {
  loadContext: () => Promise<unknown>;
  loadContextSync: () => unknown;
  getHighlighter: (context: unknown) => (
    options: ChakraDocsShikiHighlightOptions,
  ) => {
    code: string;
    highlighted: boolean;
  };
  /** Release cached resources only after all consumers have unmounted. */
  dispose: () => void;
}

/** Create once at module scope; pass to DocsProvider.config.codeBlock.adapter. */
export function createChakraDocsShikiAdapter(
  options: CreateChakraDocsShikiAdapterOptions = {},
): ChakraDocsShikiAdapter {
  const languages = [...(options.languages ?? chakraDocsShikiLanguages)];
  const themes = { ...(options.themes ?? chakraDocsShikiThemes) };
  let current: Highlighter | undefined;
  let pending: Promise<Highlighter | null> | undefined;
  let generation = 0;

  function report(error: unknown) {
    try {
      options.onError?.(error);
    } catch {
      /* Observers must not break rendering. */
    }
  }

  return {
    loadContextSync: () => current ?? null,
    loadContext() {
      if (pending) return pending;
      const requestedGeneration = generation;
      pending = import('shiki')
        .then(({ createHighlighter }) =>
          createHighlighter({
            langs: languages,
            themes: [...new Set([themes.light, themes.dark])],
          }),
        )
        .then((highlighter) => {
          if (generation !== requestedGeneration) {
            highlighter.dispose();
            return null;
          }
          current = highlighter;
          return highlighter;
        })
        .catch((error: unknown) => {
          if (generation === requestedGeneration) {
            pending = undefined;
            report(error);
          }
          return null;
        });
      return pending;
    },
    getHighlighter(context) {
      return ({ code, language, meta }) => {
        if (!current || context !== current)
          return { code, highlighted: false };
        try {
          const requestedLanguage = language?.trim().toLowerCase();
          const lang =
            requestedLanguage &&
            current.getLoadedLanguages().includes(requestedLanguage)
              ? requestedLanguage
              : 'text';
          const html = current.codeToHtml(code, {
            lang,
            theme: meta?.colorScheme === 'light' ? themes.light : themes.dark,
            transformers: [
              {
                line(node, line) {
                  Object.assign(node.properties, {
                    'data-line': line,
                    'data-highlight': meta?.highlightLines?.includes(line)
                      ? ''
                      : undefined,
                    'data-word-wrap': meta?.wordWrap ? '' : undefined,
                    'data-diff': meta?.addedLineNumbers?.includes(line)
                      ? 'added'
                      : meta?.removedLineNumbers?.includes(line)
                        ? 'removed'
                        : undefined,
                    'data-focused': meta?.focusedLineNumbers?.includes(line)
                      ? ''
                      : undefined,
                  });
                },
              },
            ],
          });
          // Chakra owns the <pre>/<code> shell and its background/foreground.
          // Shiki alone generates this HTML; source code is escaped by Shiki.
          return {
            code: html
              .replace(/^<pre\b[^>]*><code\b[^>]*>/, '')
              .replace(/<\/code><\/pre>$/, ''),
            highlighted: true,
          };
        } catch (error) {
          report(error);
          return { code, highlighted: false };
        }
      };
    },
    // No unloadContext: multiple providers and Strict Mode effect replays can
    // share one adapter. A provider unmount must not dispose another's context.
    dispose() {
      generation += 1;
      current?.dispose();
      current = undefined;
      pending = undefined;
    },
  };
}
