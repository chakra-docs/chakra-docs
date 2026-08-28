---
title: Render docs with Postkit
description: Use Chakra Docs for the documentation shell and Postkit for rich, themeable Markdown rendering.
order: 8
tags: [composition, markdown, postkit]
---

Chakra Docs and Postkit compose at the article boundary. Chakra Docs owns the navigation, layout, page metadata, table of contents, and pagination; Postkit renders the Markdown body with Chakra-backed prose and rich content components.

::::postkit-callout{title="This page is the example" tone="tip" variant="subtle"}
The body you are reading is rendered by `Prose`, `react-markdown`, and Postkit's component and Remark presets. The callout itself comes from Postkit directive syntax.
::::

## Install the renderer

Install Postkit alongside the Chakra Docs packages and the Markdown runtime used by this example.

```bash
npm install @chakra-docs/chakra @chakra-docs/core @chakra-docs/next @postkit/react @postkit/shiki react-markdown
```

When developing both libraries locally, link the unpublished Postkit builds from yalc instead:

```bash
yalc link --no-pure @postkit/react @postkit/shiki @postkit/unfurl
```

## Share the Chakra system

Compose the Chakra Docs recipes into the site's system, then let `PostkitProvider` provide that same system to both libraries. Postkit stays host-native by default, so the site's semantic tokens and Chakra recipes remain in control.

```tsx
import { DocsProvider } from '@chakra-docs/chakra';
import { chakraDocsThemeConfig } from '@chakra-docs/chakra/theme';
import { NextLink } from '@chakra-docs/next/link';
import { createSystem, defaultConfig } from '@chakra-ui/react';
import { PostkitProvider } from '@postkit/react';
import { createPostkitShikiAdapter } from '@postkit/shiki';

const system = createSystem(defaultConfig, chakraDocsThemeConfig);
const codeBlockAdapter = createPostkitShikiAdapter();

export function App({ children }: { children: React.ReactNode }) {
  return (
    <PostkitProvider system={system} codeBlockAdapter={codeBlockAdapter}>
      <DocsProvider
        config={{
          codeBlock: { adapter: codeBlockAdapter },
          linkComponent: NextLink,
        }}
      >
        {children}
      </DocsProvider>
    </PostkitProvider>
  );
}
```

Pass `postkitDefaultTheme` as the provider's `preset` only when the host does not already supply the visual defaults you want.

The adapter is supplied to both providers intentionally. Each library owns its own code-block component and behavior defaults, while the shared adapter keeps language support and highlighting themes consistent. Chakra Docs defaults line numbers and wrapping to off; applications can change those globally through `DocsProvider.config.codeBlock` or per built-in Markdown renderer through `MarkdownContent.codeBlockProps`.

## Render the article body

Build a component map and Remark plugin list once. `output: 'hast'` lets `react-markdown` render Postkit directives as registered React components.

```tsx
import type { DocsPage } from '@chakra-docs/core';
import { Prose, createPostkitMdxComponents } from '@postkit/react';
import { createPostkitRemarkPlugins } from '@postkit/react/remark';
import ReactMarkdown from 'react-markdown';

const components = createPostkitMdxComponents();
const remarkPlugins = createPostkitRemarkPlugins({
  postkit: { output: 'hast' },
});

export function PostkitMarkdown({ page }: { page: DocsPage }) {
  return (
    <Prose>
      <ReactMarkdown components={components} remarkPlugins={remarkPlugins}>
        {page.body ?? ''}
      </ReactMarkdown>
    </Prose>
  );
}
```

Use that renderer as the child of `DocsArticle`. A production integration should also pass the manifest's heading IDs to the rendered `h2` through `h6` components, as this site does, so table-of-contents links remain exact.

```tsx
<DocsLayout nav={nav} page={page} headings={page.headings}>
  <DocsArticle page={page} headings={page.headings}>
    <PostkitMarkdown page={page} />
    <DocsPagination nav={nav} page={page} />
  </DocsArticle>
</DocsLayout>
```

## Author rich Markdown

Postkit's Remark preset adds GFM, frontmatter recognition, and portable directives. Authors can keep rich components in plain Markdown rather than coupling content files to a framework-specific MDX compiler.

```markdown
::::postkit-callout{title="Check the boundary" tone="important"}
Chakra Docs owns the documentation experience. Postkit owns this article body.
::::

:::postkit-steps{items='[{"title":"Build the manifest"},{"title":"Render with Postkit"},{"title":"Theme through recipes"}]'}
```

Both libraries expose stable recipe keys and slots, so a host theme can customize the docs shell and article content independently while sharing the same background, foreground, border, and accent tokens.
