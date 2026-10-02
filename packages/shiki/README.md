# @chakra-docs/shiki

Optional, first-party Shiki syntax highlighting for Chakra Docs. No React, Chakra UI, or Postkit dependency. The adapter contract also works with Chakra UI's CodeBlock provider and Postkit's `codeBlockAdapter` prop.

```sh
npm install @chakra-docs/shiki
```

Create one adapter at module scope and use your existing Chakra provider:

```tsx
import { DocsProvider, MarkdownContent } from '@chakra-docs/chakra';
import { createChakraDocsShikiAdapter } from '@chakra-docs/shiki';

const adapter = createChakraDocsShikiAdapter();

export function Article({ markdown }: { markdown: string }) {
  return (
    <DocsProvider config={{ codeBlock: { adapter } }}>
      <MarkdownContent source={markdown} />
    </DocsProvider>
  );
}
```

The adapter initializes lazily and shares its highlighter across consumers. Before it is ready, code renders as plain text. It applies to both `CodeBlock` and fenced or indented code in `MarkdownContent`.

## Options

```ts
const adapter = createChakraDocsShikiAdapter({
  languages: ['typescript', 'tsx', 'bash', 'json'],
  themes: { light: 'github-light', dark: 'github-dark' },
  onError: (error) => console.error('Code highlighting failed', error),
});
```

`chakraDocsShikiLanguages` exports the default grammars: Astro, Bash, CSS, HTML, JavaScript, JSON, Markdown, MDX, TSX, TypeScript, and YAML. Loaded Shiki language aliases work too. An unknown, omitted, or unloaded language uses escaped plain-text lines, preserving line metadata. Set `languages: []` to use only plain text. Load errors fall back to unhighlighted source and allow a later initialization attempt to retry.

`chakraDocsShikiThemes` exports the default GitHub light/dark pair. Each highlight call reads `meta.colorScheme`: light selects the light theme; dark, omitted, or custom schemes use the dark theme. Only token markup is emitted—backgrounds, padding, borders, line numbers, wrapping, highlighted lines, and diff/focus treatments remain owned by the `chakraDocsCodeBlock` recipe and code-block props. No Shiki stylesheet is required.

## Custom themes

Each scheme also accepts a Shiki `ThemeRegistration` object. Keep application
colors in the host; the adapter does not impose a brand palette. A theme object
can be shared by both schemes, or paired with a built-in theme name.

```ts
import type { ChakraDocsShikiTheme } from '@chakra-docs/shiki';

const brandTheme: ChakraDocsShikiTheme = {
  name: 'my-app-dark',
  type: 'dark',
  colors: { 'editor.background': '#101010', 'editor.foreground': '#eeeeee' },
  tokenColors: [
    { scope: ['keyword', 'storage'], settings: { foreground: '#aabbff' } },
    { scope: 'string', settings: { foreground: '#99ccaa' } },
  ],
};

const adapter = createChakraDocsShikiAdapter({
  themes: { light: 'github-light', dark: brandTheme },
});
```

Use a distinct name for each distinct custom theme. As with built-in themes,
Shiki emits token colors while the host owns the code-block surface and spacing.

## Preloading and lifecycle

For synchronous server rendering, call `await adapter.loadContext()` before rendering. `loadContextSync()` then supplies the initialized highlighter. For hydrated applications, preload on both server and client before their initial renders, or use the default lazy mode on both sides to avoid hydration mismatches.

Call `adapter.dispose()` when the owning application or build job is finished with it, after **all** consumers have unmounted. Individual provider unmounts deliberately do not dispose the shared context, including React Strict Mode effect replays. Disposing during initialization releases the pending highlighter rather than reviving it; a later `loadContext()` creates a new one.

## Postkit remains optional

Chakra Docs does not require Postkit for code highlighting. Existing applications can continue passing `createPostkitShikiAdapter()` from `@postkit/shiki` to `DocsProvider`. Alternatively, pass one `createChakraDocsShikiAdapter()` instance to both `DocsProvider.config.codeBlock.adapter` and `PostkitProvider.codeBlockAdapter`.
