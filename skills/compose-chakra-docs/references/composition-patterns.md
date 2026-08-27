# Composition patterns

## Baseline shell

The host owns the Chakra provider and system. The docs provider owns only docs-level configuration.

```tsx
<DocsProvider
  config={{
    linkComponent: RouterLink,
    siteUrl: 'https://example.com',
    layout: {
      stickyTop: 'calc(var(--site-header-height, 0px) + 2rem)',
    },
  }}
>
  <DocsLayout
    headings={page.headings}
    nav={nav}
    page={page}
    sidebarCollapsible
    sidebarDefaultExpanded="active"
  >
    <DocsArticle
      page={page}
      breadcrumbs={<DocsBreadcrumbs nav={nav} page={page} />}
      actions={
        <DocsPageActions.Root
          markdown={page.body}
          markdownUrl={`${page.route}.md`}
          page={page}
        />
      }
    >
      <MdxContent />
      <DocsPageFeedback.Root page={page} onSubmit={saveFeedback} />
      <DocsPagination nav={nav} page={page} />
    </DocsArticle>
  </DocsLayout>
</DocsProvider>
```

Use the package's `MarkdownContent` for lightweight Markdown. Keep an existing MDX pipeline when the host needs custom components, live examples, imports, or framework-specific compilation.

## Navigation behavior

`sidebarCollapsible` is opt-in. With `sidebarDefaultExpanded="active"`, every ancestor of the current URL opens initially. Manual expansion stays open during client navigation, and navigating into a closed branch opens that branch. Use `sidebarExpandedIds` and `onSidebarExpandedChange` when the host must control state.

Nested section headings become independent accessible disclosure buttons. Style `trigger`, `indicator`, and `content` through the sidebar recipe or matching slot props.

Pass header-aware `stickyTop` and `scrollMarginTop` values. Check both desktop sticky columns and mobile heading navigation on a real nested page.

## Page affordances

- `DocsBreadcrumbs` derives ancestors from the navigation tree and current route.
- `DocsPageActions` composes copy-page, copy-link, Markdown, edit, menu, and custom actions. Supply canonical URLs and Markdown routes when they cannot be derived.
- `DocsHeadingPermalink` can be placed in custom MDX headings; `MarkdownContent` can add it with `headingPermalinks`.
- `DocsPageFeedback` owns presentation and async status, while the host owns persistence.
- `DocsMobileTableOfContents` is included by `DocsLayout` when headings exist unless `mobileToc={false}`.

## Rich content

- `DocsCards.Root` and `DocsCards.Card` create safe linked navigation cards.
- `DocsSteps.Root` and `DocsSteps.Item` create semantic ordered procedures.
- `DocsTabs` exposes `Root`, `List`, `Trigger`, and `Content`. Use `syncKey` for choices repeated on one page, such as a package manager.
- `DocsApiTable` renders semantic name, type, default, description, and required columns.
- `DocsBadge` defaults to a neutral tone; use `tone="accent"` only when emphasis is useful.
- `Callout` and `CodeBlock` cover prose notices and code examples.

Prefer these primitives in MDX component maps so authors can compose them without importing application internals into each document.

## Host-owned behavior

Keep these concerns in the application:

- feedback storage and network errors;
- product-specific page actions;
- auth and access control;
- analytics destinations;
- global header and shell;
- router navigation callbacks;
- the Chakra color system and brand palette.
