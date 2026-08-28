---
title: Components
description: Compose the Chakra Docs primitives that make up documentation pages.
order: 4
tags: [components]
---

`@chakra-docs/chakra` does not own the whole page. It exports primitives that the host app can compose inside its own shell.

## DocsProvider

`DocsProvider` carries docs-level configuration. Use it in `_app.tsx` to provide labels, analytics callbacks, and the host routing link component.

```tsx
<DocsProvider
  config={{
    linkComponent: NextLink,
    labels: {
      onThisPage: 'On this page',
      copyCode: 'Copy code',
    },
    layout: {
      stickyTop: 'calc(var(--site-header-height, 0px) + 2rem)',
    },
  }}
>
  <Component {...pageProps} />
</DocsProvider>
```

`layout.stickyTop` offsets sticky docs columns below app-owned sticky headers. It accepts any Chakra `top` value, including responsive objects. Use `sidebarStickyTop` or `tocStickyTop` when the navigation and table of contents need different offsets.

The table of contents highlights the active section as the page scrolls. Heading links scroll smoothly and use `layout.scrollMarginTop` for the header-aware offset, falling back to `layout.stickyTop` when no separate scroll margin is configured.

## DocsLayout

`DocsLayout` arranges the docs navigation, article area, and table of contents. It accepts `nav`, `page`, `headings`, and optional sticky/slot overrides for a single page.

```tsx
<DocsLayout
  nav={nav}
  page={page}
  headings={page.headings}
  stickyTop={{ lg: 24 }}
>
  <DocsArticle page={page}>
    <MarkdownContent source={page.body ?? ''} />
  </DocsArticle>
</DocsLayout>
```

## DocsArticle

`DocsArticle` renders the page title and description from a `DocsPage`. You can pass custom children to control the body renderer.

```tsx
<DocsArticle page={page}>
  <MdxContent code={page.body} />
</DocsArticle>
```

Pass `actions` to place responsive page controls alongside the title. The actions container is optional, so existing article headers keep their original structure when no controls are supplied.

Use the `breadcrumbs` slot to place navigation context above the page title:

```tsx
<DocsArticle
  page={page}
  breadcrumbs={<DocsBreadcrumbs nav={nav} page={page} />}
>
  <MdxContent code={page.body} />
</DocsArticle>
```

`DocsBreadcrumbs` finds every ancestor of the current route. Pass `homeLabel` and `homeHref` to prepend a site-level item. Its recipe exposes `root`, `list`, `item`, `link`, `current`, and `separator` slots.

## DocsPageActions

`DocsPageActions` provides composable copy and link actions. `CopyPage` copies the Markdown source, while `CopyLink` copies the canonical page URL. `ViewMarkdown` and `Edit` appear only when their URLs are available.

```tsx
<DocsArticle
  page={page}
  actions={
    <DocsPageActions.Root
      page={page}
      markdown={page.body}
      markdownUrl={`${page.route}.md`}
      variant="split"
    >
      <DocsPageActions.CopyPage icon={<LuCopy />} />
      <DocsPageActions.Menu
        ariaLabel="More page actions"
        icon={<LuChevronDown />}
      >
        <DocsPageActions.Group label="Page tools">
          <DocsPageActions.CopyLink icon={<LuLink />} />
          <DocsPageActions.ViewMarkdown icon={<MarkdownIcon />} />
        </DocsPageActions.Group>
        <DocsPageActions.Separator />
        <DocsPageActions.Item
          action="open-v0"
          href={v0Url}
          icon={<V0Icon />}
          label="Open in v0"
        />
        <DocsPageActions.Submenu label="Open in another chat">
          <DocsPageActions.Item href={chatGptUrl} label="ChatGPT" />
          <DocsPageActions.Item href={claudeUrl} label="Claude" />
        </DocsPageActions.Submenu>
        <DocsPageActions.Separator />
        <DocsPageActions.Edit icon={<LuGithub />} />
      </DocsPageActions.Menu>
    </DocsPageActions.Root>
  }
>
  <MdxContent code={page.body} />
</DocsArticle>
```

When no children are supplied, the root renders `CopyPage` as the primary action and places the available link, Markdown, and edit actions in its disclosure menu. `siteUrl` and `editUrl` from `DocsProvider` are used to derive the canonical and edit URLs. Use explicit `pageUrl`, `markdownUrl`, or `editUrl` props to override them for one page.

Use `variant="split"` to join the primary action and menu trigger. `Menu` accepts separate `ariaLabel`, `label`, `icon`, and `indicator` content; supplying an icon without a label creates an icon-only trigger with the accessible name intact. Menus and submenus support `open`, `defaultOpen`, `onOpenChange`, and `closeOnSelect`. Selection closes the current disclosure and its ancestors by default; set `closeOnSelect={false}` when an application needs the menu to remain open.

Standard actions provide descriptions automatically inside menus. Pass `description={null}` to suppress one, or customize the matching `copyPageDescription`, `copyLinkDescription`, `viewMarkdownDescription`, and `editPageDescription` labels through `DocsProvider`.

The `chakraDocsPageActions` recipe exposes `root`, `copyRoot`, `trigger`, `primaryTrigger`, `icon`, `label`, `indicator`, `menu`, `menuTrigger`, `menuIndicator`, `menuContent`, `menuItem`, `menuGroup`, `menuGroupLabel`, `menuSeparator`, `submenu`, `submenuTrigger`, `submenuIndicator`, `submenuContent`, and `description` slots. Page copies and other actions can be observed through `analytics.onPageCopy` and `analytics.onPageAction`.

## DocsSidebar

`DocsLayout` renders `DocsSidebar` when `nav` is provided. Use `DocsSidebar` directly if the app needs a different layout grid but still wants the package nav behavior.

```tsx
<DocsSidebar nav={nav} page={page} stickyTop={{ lg: 24 }} />
```

## DocsTableOfContents

`DocsLayout` renders `DocsTableOfContents` when headings are provided. The headings usually come from the source adapter.

```tsx
<DocsTableOfContents
  headings={page.headings}
  scrollMarginTop={{ lg: 24 }}
  stickyTop={{ lg: 24 }}
/>
```

`DocsLayout` also renders a native disclosure-based `DocsMobileTableOfContents` below the desktop breakpoint. Set `mobileToc={false}` to disable it or render `DocsMobileTableOfContents` directly when the application needs different placement. The mobile recipe exposes `root`, `trigger`, `triggerLabel`, `current`, `indicator`, `content`, `list`, `item`, `link`, and `activeIndicator` slots.

## Heading permalinks

`DocsHeadingPermalink` copies a section link and reports successful copies through `analytics.onHeadingLinkCopy`. Use it directly in an MDX heading component, or enable it in the built-in Markdown renderer.

```tsx
<MarkdownContent
  source={page.body ?? ''}
  headingPermalinks
  getHeadingHref={(headingId) =>
    `https://example.com${page.route}#${headingId}`
  }
/>
```

The `chakraDocsHeadingPermalink` recipe exposes `root`, `trigger`, and `indicator` slots. Heading permalinks remain opt-in so existing custom heading markup is unchanged.

## Page feedback

`DocsPageFeedback` is a compound feedback form. The default UI asks for a helpful/not-helpful choice, reveals an optional comment, and submits through the callback supplied by the host application.

```tsx
<DocsPageFeedback.Root
  page={page}
  onSubmit={async ({ page, value, comment }) => {
    await saveFeedback({ pageId: page?.id, value, comment });
  }}
/>
```

Compose the parts directly to remove the comment, introduce different choices, or place actions elsewhere:

```tsx
<DocsPageFeedback.Root page={page} onSubmit={saveFeedback}>
  <DocsPageFeedback.Prompt>Did this solve the problem?</DocsPageFeedback.Prompt>
  <DocsPageFeedback.Choices>
    <DocsPageFeedback.Option value="helpful">Yes</DocsPageFeedback.Option>
    <DocsPageFeedback.Option value="not-helpful">
      Not yet
    </DocsPageFeedback.Option>
  </DocsPageFeedback.Choices>
  <DocsPageFeedback.Actions>
    <DocsPageFeedback.Submit />
  </DocsPageFeedback.Actions>
  <DocsPageFeedback.Status />
</DocsPageFeedback.Root>
```

`value`/`onValueChange` and `comment`/`onCommentChange` support controlled state. Successful submissions also invoke `analytics.onPageFeedback`. Persistence remains entirely application-owned. The `chakraDocsFeedback` recipe exposes `root`, `prompt`, `choices`, `option`, `comment`, `actions`, `submit`, and `status` slots.

## Content primitives

Cards, steps, synchronized tabs, API tables, and badges provide common MDX building blocks without imposing a site palette. Every part uses its own slot recipe and accepts matching per-instance slot props.

```tsx
<DocsCards.Root>
  <DocsCards.Card
    href="/docs/installation"
    title="Installation"
    description="Install and configure the packages."
    badge={<DocsBadge>Start here</DocsBadge>}
  />
  <DocsCards.Card
    href="/docs/composition"
    title="Composition"
    description="Build a docs shell around your application."
  />
</DocsCards.Root>

<DocsSteps.Root>
  <DocsSteps.Item title="Install" description="Add the packages." />
  <DocsSteps.Item title="Configure">Register the recipe config.</DocsSteps.Item>
</DocsSteps.Root>
```

`DocsTabs` can synchronize separate groups on the same page. This is useful for package-manager or framework choices repeated across a guide.

```tsx
<DocsTabs.Root defaultValue="npm" syncKey="package-manager">
  <DocsTabs.List>
    <DocsTabs.Trigger value="npm">npm</DocsTabs.Trigger>
    <DocsTabs.Trigger value="pnpm">pnpm</DocsTabs.Trigger>
  </DocsTabs.List>
  <DocsTabs.Content value="npm">
    <CodeBlock language="bash" code="npm install @chakra-docs/chakra" />
  </DocsTabs.Content>
  <DocsTabs.Content value="pnpm">
    <CodeBlock language="bash" code="pnpm add @chakra-docs/chakra" />
  </DocsTabs.Content>
</DocsTabs.Root>
```

Use `value` and `onValueChange` to control a tab group. The trigger and panel IDs, `aria-controls`, `aria-labelledby`, and selected state are handled by the component.

```tsx
<DocsApiTable
  caption="DocsLayout props"
  items={[
    {
      name: 'sidebarCollapsible',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Allows nested navigation sections to collapse.',
    },
  ]}
/>
```

`DocsBadge` defaults to a portable neutral treatment. Its `tone="accent"` variant still uses semantic host tokens; applications can replace either tone in `chakraDocsBadge`.

## DocsSearch

`DocsSearch` renders a command-style search dialog from local manifest records or an asynchronous provider. Pass `collectionId` or `collectionIds` to scope results to one or more collections; remote mode sends that scope to the server before results are limited.

```tsx
import { createHttpSearchProvider } from '@chakra-docs/search/client';

<DocsSearch
  collectionIds={['v2', 'v3']}
  onNavigate={(href) => router.push(href)}
  searchProvider={createHttpSearchProvider('/api/docs/search')}
/>;
```

Use `records={manifest.search}` instead for small, local-only sites. When a result points to a heading record, the `route` includes the hash so the app can navigate directly to that section.

## DocsVersionSelect

`DocsVersionSelect` scopes by collection but is presented as a version switcher. Use collection names such as `Latest`, `v3`, or `v2` when collections represent docs versions.

```tsx
<DocsVersionSelect
  includeAll
  labelHidden
  onValueChange={setCollectionId}
  options={createDocsVersionOptions(manifest.collections)}
  value={collectionId}
/>
```

## DocsPagination

`DocsPagination` reads the current page and flattened nav to render previous and next links.

```tsx
<DocsPagination nav={nav} page={page} />
```

## Callout and CodeBlock

`Callout` and `CodeBlock` are small content primitives used by Markdown or MDX renderers. Code blocks copy their contents by default, while line numbers and wrapping remain opt-in.

```tsx
<Callout type="info" title="Server-only">
  Build the filesystem manifest from getStaticProps or another server context.
</Callout>

<CodeBlock
  language="tsx"
  title="Docs route"
  code={source}
  highlightLines="2,5-7"
  lineNumbers
/>
```

Use `wrap` for commands or other content that should reflow instead of scrolling horizontally. Set `copy={false}` to omit the copy action, and use `maxHeight` to constrain a long example with vertical scrolling. The `outline`, `subtle`, and `plain` variants are controlled by the `chakraDocsCodeBlock` recipe.

## CodeBlock highlighting

Chakra Docs uses Chakra UI's `CodeBlock` component internally. Syntax highlighting is configured once through `DocsProvider` by passing a Chakra code block adapter.

```tsx
import { createShikiAdapter } from '@chakra-ui/react'
import { DocsProvider } from '@chakra-docs/chakra'

const shikiAdapter = createShikiAdapter({
  theme: {
    light: 'github-light',
    dark: 'github-dark',
  },
  async load() {
    const { createHighlighter } = await import('shiki')

    return createHighlighter({
      langs: ['bash', 'tsx', 'ts', 'json', 'markdown', 'text'],
      themes: ['github-light', 'github-dark'],
    })
  },
})

<DocsProvider
  config={{
    codeBlock: {
      adapter: shikiAdapter,
      copy: true,
      lineNumbers: false,
      size: 'md',
      variant: 'outline',
      wrap: false,
    },
  }}
>
  <Component {...pageProps} />
</DocsProvider>
```

Direct `CodeBlock` props override these provider defaults. The built-in `MarkdownContent` renderer also accepts `codeBlockProps` for defaults scoped to one rendered document:

```tsx
<MarkdownContent
  source={page.body ?? ''}
  codeBlockProps={{ lineNumbers: false, wrap: true }}
/>
```

If no adapter is provided, Chakra UI's code block falls back to plain text rendering. The Chakra Docs recipe uses semantic background, foreground, border, success, and error tokens, so code shells adapt to the host system without requiring a brand palette.

## Host-owned pieces

The host app still owns the page shell, theme configuration, MDX renderer, search UI, analytics wiring, and any auth or product navigation around the docs section.
