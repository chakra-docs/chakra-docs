# @chakra-docs/chakra

Chakra UI component layer for Chakra Docs.

Created by [Ryan Hefner](https://www.ryanhefner.com) and [Commune Software](https://commune.software).

Chakra-based building blocks for composing documentation pages inside existing Chakra applications: docs layout primitives, sidebar navigation, desktop and mobile tables of contents, breadcrumbs, page and heading actions, search, version/collection switching, pagination, callouts, Markdown rendering, and code block shells. React and Chakra stay as peer dependencies, and host apps own the Chakra provider, routing, and branding. All components are client components (the package ships with `'use client'`).

## Install

```bash
npm install @chakra-docs/chakra @chakra-ui/react @emotion/react react react-dom
```

Peer dependencies: `@chakra-ui/react` (>=3.36 <4), `@emotion/react` (>=11 <12),
`react` (>=18 <20), and `react-dom` (>=18 <20). Emotion is a direct peer
because Chakra UI requires the host application to provide it.

## Usage

Wrap your docs pages in your app's `ChakraProvider`, add a `DocsProvider` for shared configuration, and compose a page from `DocsLayout`, `DocsArticle`, and friends. Pages, nav, and headings come from a Chakra Docs manifest (built with `@chakra-docs/source-filesystem` or the `@chakra-docs/cli` generated output):

```tsx
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import {
  Callout,
  DocsArticle,
  DocsBreadcrumbs,
  DocsLayout,
  DocsPageActions,
  DocsPagination,
  DocsProvider,
  MarkdownContent,
} from '@chakra-docs/chakra';
import type { DocsManifest, DocsPage } from '@chakra-docs/core';

export function DocsRoutePage(props: {
  manifest: DocsManifest;
  page: DocsPage;
}) {
  const { manifest, page } = props;

  return (
    <ChakraProvider value={defaultSystem}>
      <DocsProvider config={{ labels: { search: 'Search docs' } }}>
        <DocsLayout headings={page.headings} nav={manifest.nav} page={page}>
          <DocsArticle
            headings={page.headings}
            page={page}
            breadcrumbs={<DocsBreadcrumbs nav={manifest.nav} page={page} />}
            actions={<DocsPageActions.Root page={page} />}
          >
            <Callout type="info" title="Note">
              This page is generated from Markdown.
            </Callout>
            <MarkdownContent source={page.body ?? ''} headingPermalinks />
            <DocsPagination nav={manifest.nav} page={page} />
          </DocsArticle>
        </DocsLayout>
      </DocsProvider>
    </ChakraProvider>
  );
}
```

Sidebar disclosures are opt-in so existing navigation remains unchanged:

```tsx
<DocsLayout
  nav={manifest.nav}
  page={page}
  sidebarCollapsible
  sidebarDefaultExpanded="active"
/>
```

`"active"` opens every branch on the current page's navigation path. Manual
expansion remains open as the route changes, while navigation into a collapsed
branch opens the new active path. Nested branches toggle independently. The
other initial values are `"all"`, `"none"`, or an explicit array of nav item
IDs.

For controlled state, pass `sidebarExpandedIds` and update it from
`onSidebarExpandedChange`:

```tsx
const [expandedIds, setExpandedIds] = useState<readonly string[]>([]);

<DocsLayout
  nav={manifest.nav}
  page={page}
  sidebarCollapsible
  sidebarExpandedIds={expandedIds}
  onSidebarExpandedChange={setExpandedIds}
/>;
```

Controlled consumers remain the source of truth. When the route enters a
collapsed branch, `onSidebarExpandedChange` receives the current manual IDs
merged with the active ancestors.

When `nav` is present, `DocsLayout` automatically replaces the desktop sidebar
with a hamburger trigger below the `lg` breakpoint. The trigger opens an
accessible, focus-managed drawer and the active page's branch is expanded. A
selected navigation link closes the drawer. Pass search or other app-owned
controls into the drawer without rebuilding its navigation behavior:

```tsx
<DocsLayout
  nav={manifest.nav}
  page={page}
  mobileNavigationProps={{
    search: <DocsSearch records={manifest.search} />,
    title: 'Browse documentation',
  }}
/>
```

Set `mobileNavigation={false}` when the application already owns its mobile
navigation. For a custom header or drawer composition, use the exported
`DocsMobileNavigation.Root`, `Trigger`, `Content`, `Header`, `Title`,
`CloseTrigger`, `Search`, `Body`, and `Sidebar` parts.

The drawer mounts lazily and retains its contents after closing, preserving
manual sidebar expansion across reopenings and client-side navigation. New
active branches open automatically. Set `closeOnNavigate={false}` on the root
to keep the drawer open for both link selections and `page.route` changes.
Controlled `open` and sidebar `expandedIds` remain application-owned.

Add search and version switching to your site chrome:

```tsx
import { DocsSearch, DocsVersionSelect } from '@chakra-docs/chakra';

<DocsSearch
  records={manifest.search}
  collectionId="docs"
  onNavigate={(href) => router.push(href)}
/>

<DocsVersionSelect
  collections={manifest.collections}
  value={activeCollectionId}
  onValueChange={setActiveCollectionId}
  includeAll
/>
```

To keep the search corpus and ranking work off the client, pass a provider from
`@chakra-docs/search/client` instead of `records`. The component requests
popular results when it opens, debounces typed queries, cancels stale requests,
and sends collection scopes to the server:

```bash
npm install @chakra-docs/search
```

```tsx
import { DocsSearch } from '@chakra-docs/chakra';
import { createHttpSearchProvider } from '@chakra-docs/search/client';

const searchProvider = createHttpSearchProvider('/api/docs/search');

<DocsSearch
  searchProvider={searchProvider}
  collectionIds={['docs']}
  debounceMs={150}
  onNavigate={(href) => router.push(href)}
/>;
```

If both `searchProvider` and `records` are passed, remote search takes
precedence. Keep `records` mode for static deployments that do not have a
search endpoint.

For an immediate, curated opening list, pass `defaultResults={featuredPages}`
and optionally `defaultResultsLabel="New this week"`. These display-only
`DocsSearchResult` objects can come from server/build data. The empty-query list
preserves supplied ordering, filters by collection scope, and respects
`popularLimit` (default six). Typing uses the normal provider or local index;
clearing restores the curated list. An explicit empty array suppresses provider
defaults. The heading defaults to “Recommended.”

Alternatively, set `prefetch="intent"` (trigger hover/focus) or
`prefetch="mount"` (after client mount) to warm the provider's empty-query
response. `prefetchStaleTimeMs` defaults to 60,000. Fresh responses and in-flight
work are reused; stale results remain stable while refreshing and the next
opening/query reset receives the new list. Prefetching is disabled by default,
performs no SSR fetches or search analytics, and is skipped with curated
`defaultResults`. Cache state is per component and invalidated on provider,
scope, or limit changes. Remount with a context-specific `key` when auth/tenant
context changes invisibly to these props. Only ship authorized suggestions.

### Configuration

`DocsProvider` accepts a `ChakraDocsConfig` (`config` prop) that is merged down the tree and read via `useDocsConfig()`:

- `linkComponent` — a `DocsLinkComponent` used for internal navigation, including Markdown, sidebar, pagination, and search-result links (for example `DocsLink` from `@chakra-docs/next/link`). External URLs continue to render as ordinary anchors.
- `labels` — `Partial<DocsLabels>` overrides for UI copy (`search`, `searchPlaceholder`, `searchLoading`, `searchError`, `previousPage`, `nextPage`, `onThisPage`, `copyCode`, ...).
- `analytics` — `DocsAnalyticsCallbacks` for search, code/package copies,
  page actions/copies, heading-link copies, and feedback. Callbacks are optional,
  provider-neutral observers; thrown errors and rejected promises are isolated
  from the UI. Report integration failures inside your callback if needed.
- `codeBlock` — shared `CodeBlock` defaults. `adapter` configures syntax highlighting; `copy`, `lineNumbers`, `size`, `variant`, and `wrap` configure every nested code block unless an instance overrides them.
- `layout` — `ChakraDocsLayoutConfig` sticky offsets (`stickyTop`, `sidebarStickyTop`, `tocStickyTop`, `scrollMarginTop`), each accepting responsive Chakra values.

Code-copy events fire after a successful clipboard write, not on click. Use
`<CodeBlock code="pnpm add @chakra-docs/chakra" packageManager="pnpm" />` to
emit `onPackageCommandCopy({ command, manager })` as well as `onCodeCopy`.
The manager is explicit metadata; ordinary shell blocks are not guessed to be
package commands. A root `slotProps.onCopy` observer runs alongside analytics.
Standalone Postkit components have their own callbacks; this provider does not
automatically instrument another renderer. Only forward query/content fields
to your analytics service when appropriate for your privacy and consent policy.

Search callbacks include `onSearchOpen`, `onSearchClose({ reason })`,
`onSearch(query)`, `onSearchResults(event)`, `onSearchError(context)`, and
`onSearchResultSelect(result, context)`. Result context identifies the query,
collection scope, source (`curated`/`local`/`remote`), mode (`default`/`query`),
and result count; selection adds one-based `position` and `interaction`.
Result-list events include ordered `resultIds` and represent list exposure,
not viewport-level impressions. Zero results are distinct from provider errors.
Background prefetching stays silent. Repeated shortcuts, arrow movements, and
equivalent rerenders do not duplicate events. Selection-close events run before
navigation; unmount alone is not reported as dismissal. Modified/prevented link
clicks preserve native behavior without selecting the current dialog.
`DocsSearch.analyticsDebounceMs` optionally coalesces query-change callbacks
(default `0`); pending events are cancelled on clear, close, or unmount.
The existing one-argument selection callback remains compatible.

### Theming and recipes

Every visual Chakra Docs component uses a package-owned Chakra slot recipe. The
components include those recipes as runtime fallbacks, so they continue to work
with Chakra's `defaultSystem` and do not require a custom provider. To override
recipes in a host theme, compose `chakraDocsThemeConfig` before the app's
overrides:

```tsx
import {
  ChakraProvider,
  createSystem,
  defaultConfig,
  defineConfig,
} from '@chakra-ui/react';
import {
  chakraDocsRecipeKeys,
  chakraDocsThemeConfig,
} from '@chakra-docs/chakra/theme';

const appTheme = defineConfig({
  theme: {
    slotRecipes: {
      [chakraDocsRecipeKeys.tableOfContents]: {
        base: {
          activeIndicator: {
            w: '3px',
          },
        },
      },
    },
  },
});

const system = createSystem(defaultConfig, chakraDocsThemeConfig, appTheme);

<ChakraProvider value={system}>{/* app */}</ChakraProvider>;
```

Recipe defaults use portable Chakra semantic colors (`bg`, `fg`, and `border`)
so they inherit naturally from the host system. Applications can introduce a
brand palette or replace any slot without changing component code.

| Recipe key                        | Slots                                                                                                                                                                                                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chakraDocsApiTable`              | `root`, `table`, `caption`, `header`, `row`, `columnHeader`, `cell`, `name`, `type`, `defaultValue`, `description`, `required`                                                                                                                                                                                            |
| `chakraDocsLayout`                | `root`, `mobileNavigation`, `inner`, `sidebar`, `content`                                                                                                                                                                                                                                                                 |
| `chakraDocsArticle`               | `root`, `header`, `breadcrumbs`, `heading`, `title`, `description`, `actions`                                                                                                                                                                                                                                             |
| `chakraDocsBadge`                 | `root`                                                                                                                                                                                                                                                                                                                    |
| `chakraDocsBreadcrumbs`           | `root`, `list`, `item`, `link`, `current`, `separator`                                                                                                                                                                                                                                                                    |
| `chakraDocsCards`                 | `root`, `card`, `icon`, `content`, `title`, `description`, `badge`                                                                                                                                                                                                                                                        |
| `chakraDocsHeadingPermalink`      | `root`, `trigger`, `indicator`                                                                                                                                                                                                                                                                                            |
| `chakraDocsFeedback`              | `root`, `prompt`, `choices`, `option`, `comment`, `actions`, `submit`, `status`                                                                                                                                                                                                                                           |
| `chakraDocsPageActions`           | `root`, `copyRoot`, `trigger`, `primaryTrigger`, `icon`, `label`, `indicator`, `menu`, `menuTrigger`, `menuIndicator`, `menuPositioner`, `menuContent`, `menuItem`, `menuGroup`, `menuGroupLabel`, `menuSeparator`, `submenu`, `submenuTrigger`, `submenuIndicator`, `submenuPositioner`, `submenuContent`, `description` |
| `chakraDocsSidebar`               | `root`, `list`, `item`, `link`, `sectionTitle`, `badge`, `children`, `trigger`, `indicator`, `content`                                                                                                                                                                                                                    |
| `chakraDocsSteps`                 | `root`, `item`, `indicator`, `content`, `title`, `description`                                                                                                                                                                                                                                                            |
| `chakraDocsTabs`                  | `root`, `list`, `trigger`, `content`                                                                                                                                                                                                                                                                                      |
| `chakraDocsTableOfContents`       | `root`, `label`, `list`, `item`, `link`, `activeIndicator`                                                                                                                                                                                                                                                                |
| `chakraDocsMobileTableOfContents` | `root`, `trigger`, `triggerLabel`, `current`, `indicator`, `content`, `list`, `item`, `link`, `activeIndicator`                                                                                                                                                                                                           |
| `chakraDocsMobileNavigation`      | `root`, `trigger`, `triggerIcon`, `triggerLabel`, `backdrop`, `positioner`, `content`, `header`, `title`, `closeTrigger`, `search`, `body`, `sidebar`                                                                                                                                                                     |
| `chakraDocsSearch`                | `trigger`, `triggerLabel`, `shortcut`, `backdrop`, `positioner`, `root`, `header`, `title`, `body`, `input`, `results`, `sectionLabel`, `resultList`, `result`, `resultLink`, `resultRow`, `resultContent`, `resultTitle`, `resultDescription`, `resultBadge`, `status`                                                   |
| `chakraDocsVersionSelect`         | `root`, `label`, `select`                                                                                                                                                                                                                                                                                                 |
| `chakraDocsMarkdownContent`       | `root`, `heading`, `paragraph`, `list`, `listItem`, `inlineCode`, `link`, `quote`, `codeBlock`                                                                                                                                                                                                                            |
| `chakraDocsPagination`            | `root`, `item`, `label`, `link`                                                                                                                                                                                                                                                                                           |
| `chakraDocsCallout`               | `root`, `title`, `content`                                                                                                                                                                                                                                                                                                |
| `chakraDocsCodeBlock`             | `root`, `header`, `title`, `control`, `language`, `copyTrigger`, `copyIndicator`, `content`, `code`, `codeText`                                                                                                                                                                                                           |

The individual recipe definitions, `chakraDocsSlotRecipes`,
`chakraDocsThemeConfig`, and `chakraDocsRecipeKeys` are public exports. Named
`*SlotProps` props provide per-instance overrides for the same component parts.
For example, an application can replace the default disclosure motion:

```ts
const sidebarRecipe = {
  base: {
    indicator: { transition: 'transform 200ms ease' },
    content: {
      display: 'grid',
      transition: 'grid-template-rows 200ms ease',
      '& > ol': { overflow: 'hidden' },
    },
  },
  variants: {
    expanded: {
      true: { content: { display: 'grid', gridTemplateRows: '1fr' } },
      false: { content: { display: 'grid', gridTemplateRows: '0fr' } },
    },
  },
};
```

## API

### Components

- `DocsProvider` — merges and provides `ChakraDocsConfig` (labels, link component, analytics, code block adapter, layout offsets) to descendants.
- `DocsLayout` — responsive shell that renders `DocsSidebar` at `lg` and above, an automatic `DocsMobileNavigation` below `lg` (when `nav` is passed), a content area, and `DocsTableOfContents` (when `headings` is passed). Its content wrapper is a `div` by default so it can safely sit inside an application's existing `main`; standalone pages can opt in with `contentSlotProps={{ as: 'main' }}`. Use `sidebarContent` for a legend, version control, or other content above the navigation, and `sidebarBadgeSlotProps` to style nav badges. Collapsible desktop navigation is enabled with `sidebarCollapsible`; configure its initial state with `sidebarDefaultExpanded`, or control it with `sidebarExpandedIds` and `onSidebarExpandedChange`. The mobile drawer uses collapsible active-path navigation by default. Pass `mobileNavigation={false}` to opt out or `mobileNavigationProps` to configure its title, search content, controlled state, slots, and sidebar. Props: `page`, `nav`, `headings`, `stickyTop`, `scrollMarginTop`, `slotProps`, `contentSlotProps`, `sidebarContent`, `sidebarBadgeSlotProps`, `sidebarCollapsible`, `sidebarDefaultExpanded`, `sidebarExpandedIds`, `onSidebarExpandedChange`, `sidebarTriggerSlotProps`, `sidebarIndicatorSlotProps`, `sidebarContentSlotProps`, `sidebarSlotProps`, `mobileNavigation`, `mobileNavigationProps`, `tocSlotProps`, `children`.
- `DocsArticle` — article wrapper that renders the page title and description header, with optional `breadcrumbs` and `actions` regions.
- `DocsBreadcrumbs` — navigation path derived from `nav` and `page.route`, with optional site-level home item.
- `DocsPageActions` — compound page action API with `Root`, `CopyPage`, `CopyLink`, `ViewMarkdown`, `Edit`, `Menu`, `Submenu`, `Group`, `Separator`, and `Item` components. Without children, `Root` composes Copy page with a menu of the available standard actions; its `split` variant uses a compact chevron trigger while safely falling back when either half is unavailable. `Root` supports `sm`, `md`, and `lg` sizes, and its Chakra Menu-backed overlays provide controlled or uncontrolled state, nested menus, automatic close on selection, Escape and outside-click dismissal, focus restoration, keyboard navigation, typeahead, and collision-aware positioning.
- `DocsHeadingPermalink` — accessible clipboard action for a section URL.
- `DocsPageFeedback` — compound feedback form with controlled or uncontrolled choice/comment state, async submission status, and application-owned persistence.
- `DocsCards` — compound responsive card grid with `Root` and safe linked `Card` parts.
- `DocsSteps` — semantic ordered procedure with `Root` and independently composable `Item` parts.
- `DocsTabs` — compound tabs powered by Chakra Tabs, with arrow/Home/End keyboard navigation, roving focus, controlled/uncontrolled state, and optional same-page synchronization through `syncKey`. Styling remains owned by `chakraDocsTabs` and per-instance slot props.
- `DocsApiTable` — responsive semantic API-reference table for names, types, defaults, descriptions, and required markers.
- `DocsBadge` — neutral metadata badge with an opt-in `accent` tone.
- `DocsSidebar` — sticky nav list built from `DocsNavItem[]`, highlighting the active route. Children render above the navigation list. Its direct disclosure props are `collapsible`, `defaultExpanded`, `expandedIds`, and `onExpandedChange`, with matching `triggerSlotProps`, `indicatorSlotProps`, and `contentSlotProps` overrides. Branch headings become buttons with `aria-expanded` and `aria-controls`; linked branches retain their link and add a separately labeled disclosure button. Badge elements expose their value through `data-badge` and `title`. The legacy `children` recipe slot remains supported alongside the new `trigger`, `indicator`, and `content` slots.
- `DocsMobileNavigation` — compound hamburger/drawer navigation with `Root`, `Trigger`, `Content`, `Header`, `Title`, `CloseTrigger`, `Search`, `Body`, and `Sidebar` parts. The default root composition handles focus, Escape, outside interaction, scroll containment, active-path expansion, route-change closing, and close-on-selection. Use the parts to replace any visual region while retaining the shared state and accessibility behavior.
- `DocsTableOfContents` — sticky "On this page" list that tracks the active heading on scroll and smooth-scrolls on click. The active section uses a square `activeIndicator` slot, which can be overridden in the theme or with `activeIndicatorSlotProps`.
- `DocsMobileTableOfContents` — disclosure-based mobile heading navigation using the same active-heading and scroll-offset behavior. `DocsLayout` includes it by default when headings are provided; pass `mobileToc={false}` to opt out.
- `DocsSearch` — Cmd/Ctrl+K search dialog with keyboard navigation, popular/default results, and collection scoping. Pass `records` for synchronous local search or `searchProvider` for remote search; the provider takes precedence when both are present. Remote mode sends `collectionId`/`collectionIds`, `limit`, and `popularLimit` to the server, loads popular results on open, debounces typed queries (`debounceMs`, default 150 ms), and aborts superseded requests. `onNavigate` handles both unmodified pointer selection and Enter-key activation; modified clicks retain normal browser behavior. Props: `records`, `searchProvider`, `debounceMs`, `collectionId`, `collectionIds`, `limit`, `popularLimit`, `placeholder`, `onNavigate`, `onResultSelect`, plus `slotProps`/`triggerSlotProps`/`inputSlotProps`/`resultSlotProps`.
- `DocsVersionSelect` — labeled native select for switching collections/versions. Props: `collections` or `options`, `value`/`defaultValue`, `onValueChange`, `includeAll`, `allValue`, `allLabel`, `label`, `labelHidden`, plus slot props.
- `DocsPagination` — previous/next links derived from the flattened nav and the current `page.route`. Props: `nav`, `page`.
- `MarkdownContent` — lightweight Markdown renderer (headings with manifest-consistent anchor ids, optional copyable permalinks, paragraphs, internal/external links, lists, quotes rendered as `Callout`, and backtick- or tilde-fenced code rendered as `CodeBlock`). Props include `source`, `headingPermalinks`, `getHeadingHref`, `codeBlockProps`, and slot props.
- `Callout` — bordered note box. Props: `type` (`'info' | 'warning' | 'success' | 'danger'`, default `'info'`), `title`, `slotProps`, `children`.
- `CodeBlock` — Chakra `CodeBlock`-based code shell with an optional title/language header and configurable copy action, line numbers, wrapping, highlighted lines, size, maximum height, and `outline`, `subtle`, or `plain` recipe variant. Props include `code`, `language`, `title`, `copy`, `lineNumbers`, `wrap`, `highlightLines`, `size`, `variant`, `maxHeight`, `slotProps`, and `children`. Copying defaults on; line numbers and wrapping default off.

### Hooks and helpers

- `useDocsConfig()` — read the merged `ChakraDocsConfig` (with default labels applied).
- `createDocsVersionOptions(collections)` — map collections to `DocsVersionOption[]`.
- `filterSearchRecordsByCollections(records, collectionIds)` — scope search records to a set of collections.
- `createDocsBreadcrumbItems(nav, activeRoute)` — return every nav ancestor and the active page for breadcrumb rendering.

### Types

`ChakraDocsConfig`, `DocsLabels`, `DocsAnalyticsCallbacks`, `DocsLinkProps`, `DocsLinkComponent`, `DocsComponentProps`, `DocsLayoutProps`, `DocsArticleProps`, `DocsBreadcrumbsProps`, `DocsBreadcrumbItem`, `DocsPageActionsRootProps`, `DocsPageActionsSize`, `DocsPageActionProps`, `DocsPageActionsMenuProps`, `DocsPageActionsSubmenuProps`, `DocsPageActionsGroupProps`, `DocsPageActionsSeparatorProps`, `DocsPageActionsOpenChangeDetails`, `DocsPageActionsPositioning`, `DocsPageActionsPlacement`, `DocsHeadingPermalinkProps`, `DocsPageFeedbackRootProps`, `DocsPageFeedbackValue`, `DocsPageFeedbackSubmitDetails`, `DocsCardsRootProps`, `DocsCardProps`, `DocsStepsRootProps`, `DocsStepProps`, `DocsTabsRootProps`, `DocsTabsValuePartProps`, `DocsApiTableProps`, `DocsApiTableItem`, `DocsBadgeProps`, `DocsSidebarProps`, `DocsSidebarDefaultExpanded`, `DocsMobileNavigationRootProps`, `DocsMobileNavigationTriggerProps`, `DocsMobileNavigationContentProps`, `DocsMobileNavigationPartProps`, `DocsMobileNavigationCloseTriggerProps`, `DocsMobileNavigationSidebarProps`, `DocsMobileNavigationOpenChangeDetails`, `DocsTableOfContentsProps`, `DocsMobileTableOfContentsProps`, `DocsSearchProps`, `DocsVersionSelectProps`, `DocsVersionOption`, `CalloutProps`, `CodeBlockProps`, `MarkdownContentProps`, `ChakraDocsLayoutConfig`, `ChakraDocsStickyTop`, `ChakraDocsCodeBlockConfig`, `ChakraDocsCodeBlockAdapter`, `ChakraDocsCodeBlockHighlighter`, and related code block types.

## Help and contributing

See the [project README](https://github.com/chakra-docs/chakra-docs#readme), [open an issue](https://github.com/chakra-docs/chakra-docs/issues), or read the [contribution guidelines](https://github.com/chakra-docs/chakra-docs/blob/main/CONTRIBUTING.md). Report vulnerabilities privately through the [security policy](https://github.com/chakra-docs/chakra-docs/security/policy).

## License

MIT
