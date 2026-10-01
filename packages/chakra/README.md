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

## Syntax highlighting

Install the optional `@chakra-docs/shiki` package to highlight both `CodeBlock` and Markdown code fences without Postkit:

```tsx
import { DocsProvider } from '@chakra-docs/chakra';
import { createChakraDocsShikiAdapter } from '@chakra-docs/shiki';

const adapter = createChakraDocsShikiAdapter();

<DocsProvider config={{ codeBlock: { adapter } }}>{children}</DocsProvider>;
```

Create the adapter once at module scope. It lazily loads Shiki and accepts `languages` and `themes: { light, dark }` options. The code-block shell remains styled by Chakra recipes. Existing Chakra UI and Postkit adapters remain supported; no adapter means plain-text code rendering. See the [Shiki package](../shiki/README.md) for defaults, preloading, and resource lifecycle guidance.

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

`DocsPageActions.Root` uses the `standard` preset by default. With only `page`,
it renders the available split actions, supplies accessible package icons, and
copies deterministic Markdown containing the page title, description, and body.
Pass the host-owned `markdownUrl` only when the site actually exposes a Markdown
endpoint. Configure defaults once or override any action locally:

```tsx
<DocsProvider
  config={{
    pageActions: {
      icons: { copyLink: <BrandLinkIcon /> },
      size: 'sm',
    },
  }}
>
  <DocsPageActions.Root page={page} markdownUrl={markdownUrl} />
  <DocsPageActions.Root page={page} preset="minimal" />
  <DocsPageActions.Root markdown={markdown}>
    <DocsPageActions.CopyPage icon={null} />
  </DocsPageActions.Root>
</DocsProvider>
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

<DocsSearch records={manifest.search} title="Search documentation" />

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
  page actions/copies, heading-link copies, feedback, and preference changes. Callbacks are optional,
  provider-neutral observers; thrown errors and rejected promises are isolated
  from the UI. Report integration failures inside your callback if needed.
  `onPageAction` also receives `{ action: 'menu-open', page }` when the
  top-level page-actions menu opens, including keyboard activation. Closing
  the menu or opening a submenu does not emit this event.
- `codeBlock` — shared `CodeBlock` defaults. `adapter` configures syntax highlighting; `copy`, `lineNumbers`, `size`, `variant`, and `wrap` configure every nested code block unless an instance overrides them.
- `icons` — shared navigation indicators. Set `sidebarIndicator` and `mobileTocIndicator` to components from the site's icon system; direct component props remain the final override.
- `layout` — `ChakraDocsLayoutConfig` sticky offsets (`stickyTop`, `sidebarStickyTop`, `tocStickyTop`, `scrollMarginTop`), each accepting responsive Chakra values.

Code-copy events fire after a successful clipboard write, not on click. Use
`<CodeBlock code="pnpm add @chakra-docs/chakra" packageManager="pnpm" />` to
emit `onPackageCommandCopy({ command, manager })` as well as `onCodeCopy`.
The manager is explicit metadata; ordinary shell blocks are not guessed to be
package commands. A root `slotProps.onCopy` observer runs alongside analytics.
Standalone Postkit components have their own callbacks; this provider does not
automatically instrument another renderer. Only forward query/content fields
to your analytics service when appropriate for your privacy and consent policy.

### Site-wide content preferences

Use `DocsPreferences` for choices that should follow readers across pages, such
as package manager, language, framework, platform, or REST versus GraphQL.
Definitions use lightweight types from `@chakra-docs/core` and validate every
default, stored value, and programmatic update.

```tsx
const definitions = [
  {
    id: 'package-manager',
    label: 'Package manager',
    options: ['npm', 'pnpm', { value: 'yarn', label: 'Yarn' }, 'bun'],
    defaultValue: 'npm',
  },
  {
    id: 'api-style',
    label: 'API style',
    options: ['rest', 'graphql'],
    defaultValue: 'rest',
  },
] as const;

<DocsPreferences.Root definitions={definitions} storage="local">
  <DocsPreferences.Select preference="package-manager" />
  <DocsPreferences.When preference="api-style" value="rest">
    <RestExample />
  </DocsPreferences.When>
  <DocsPreferences.When preference="api-style" value="graphql">
    <GraphqlExample />
  </DocsPreferences.When>
</DocsPreferences.Root>;
```

`storage="local"` persists under `chakra-docs.preference.{id}` and reads only
after hydration, keeping the declared default deterministic during SSR. Pass
`storageKeyPrefix` to namespace it, a custom synchronous or asynchronous
`DocsPreferenceStorage` for cookies/account settings, or omit `storage` for
session-only state. Invalid, unknown, or disabled stored values are ignored.
Storage failures are isolated and reported through `onStorageError`.

Use `values` and `onValuesChange` for controlled state, or `defaultValues` for
uncontrolled overrides. `onPreferenceChange` and
`DocsProvider.config.analytics.onPreferenceChange` receive the id, new and
previous values, and a `selector`, `tabs`, `api`, `storage`, or `reset` source.
`useDocsPreferences()` exposes the complete state plus `setValue` and `reset`;
`useDocsPreference(id)` scopes those operations to one dimension.

`DocsPreferences.When` keeps every branch server-rendered and hides the inactive
branch by default, which preserves indexable content and avoids hydration
mismatches. Set `unmountOnExit` for expensive interactive branches. A `fallback`
can be rendered while a branch is inactive.

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

The defaults also include visible keyboard-focus states, 44px mobile hit areas
for standalone controls (without expanding inline links), and wrapping for long
navigation labels, card content and prose. Tables and code blocks retain their
own horizontal scroll areas. Disclosure indicators and dialog surfaces respect
`prefers-reduced-motion`.

Page-action menus and submenus fit the available viewport and scroll when tall.
Their `size` and root CSS custom-property overrides carry through portals; root
layout styles do not. Customize `menuContent`/`submenuContent` for menu surfaces,
`menuItem` for rows, and `actionContent`/`label`/`description` for the text stack.
Per-instance slot props still take precedence over recipe defaults.

| Recipe key                        | Slots                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `chakraDocsApiTable`              | `root`, `table`, `caption`, `header`, `row`, `columnHeader`, `cell`, `name`, `type`, `defaultValue`, `description`, `required`                                                                                                                                                                                                             |
| `chakraDocsLayout`                | `root`, `mobileNavigation`, `inner`, `sidebar`, `content`                                                                                                                                                                                                                                                                                  |
| `chakraDocsArticle`               | `root`, `header`, `breadcrumbs`, `heading`, `title`, `description`, `actions`                                                                                                                                                                                                                                                              |
| `chakraDocsBadge`                 | `root`                                                                                                                                                                                                                                                                                                                                     |
| `chakraDocsBreadcrumbs`           | `root`, `list`, `item`, `link`, `current`, `separator`                                                                                                                                                                                                                                                                                     |
| `chakraDocsCards`                 | `root`, `card`, `icon`, `content`, `title`, `description`, `badge`                                                                                                                                                                                                                                                                         |
| `chakraDocsHeadingPermalink`      | `root`, `trigger`, `indicator`                                                                                                                                                                                                                                                                                                             |
| `chakraDocsFeedback`              | `root`, `prompt`, `choices`, `option`, `comment`, `actions`, `submit`, `status`                                                                                                                                                                                                                                                            |
| `chakraDocsPageActions`           | `root`, `copyRoot`, `trigger`, `primaryTrigger`, `icon`, `actionContent`, `label`, `indicator`, `menu`, `menuTrigger`, `menuIndicator`, `menuPositioner`, `menuContent`, `menuItem`, `menuGroup`, `menuGroupLabel`, `menuSeparator`, `submenu`, `submenuTrigger`, `submenuIndicator`, `submenuPositioner`, `submenuContent`, `description` |
| `chakraDocsPreferences`           | `root`, `label`, `control`, `select`, `indicator`, `content`                                                                                                                                                                                                                                                                               |
| `chakraDocsSidebar`               | `root`, `list`, `item`, `link`, `sectionTitle`, `badge`, `children`, `trigger`, `indicator`, `content`                                                                                                                                                                                                                                     |
| `chakraDocsSteps`                 | `root`, `item`, `indicator`, `content`, `title`, `description`                                                                                                                                                                                                                                                                             |
| `chakraDocsTabs`                  | `root`, `list`, `trigger`, `content`                                                                                                                                                                                                                                                                                                       |
| `chakraDocsTableOfContents`       | `root`, `label`, `list`, `item`, `link`, `activeIndicator`                                                                                                                                                                                                                                                                                 |
| `chakraDocsMobileTableOfContents` | `root`, `trigger`, `triggerLabel`, `current`, `indicator`, `content`, `list`, `item`, `link`, `activeIndicator`                                                                                                                                                                                                                            |
| `chakraDocsMobileNavigation`      | `root`, `trigger`, `triggerIcon`, `triggerLabel`, `backdrop`, `positioner`, `content`, `header`, `title`, `closeTrigger`, `search`, `body`, `sidebar`                                                                                                                                                                                      |
| `chakraDocsSearch`                | `trigger`, `triggerLabel`, `shortcut`, `backdrop`, `positioner`, `root`, `header`, `title`, `body`, `inputGroup`, `input`, `searchIcon`, `clearTrigger`, `results`, `sectionLabel`, `resultList`, `result`, `resultLink`, `resultRow`, `resultContent`, `resultTitle`, `resultDescription`, `resultBadge`, `status`                        |
| `chakraDocsVersionSelect`         | `root`, `label`, `select`                                                                                                                                                                                                                                                                                                                  |
| `chakraDocsMarkdownContent`       | `root`, `heading`, `paragraph`, `list`, `listItem`, `inlineCode`, `link`, `quote`, `codeBlock`, `image`, `separator`, `tableContainer`, `table`, `tableHead`, `tableBody`, `tableRow`, `tableHeader`, `tableCell`, `taskCheckbox`                                                                                                          |
| `chakraDocsPagination`            | `root`, `item`, `label`, `link`                                                                                                                                                                                                                                                                                                            |
| `chakraDocsCallout`               | `root`, `icon`, `body`, `title`, `content`                                                                                                                                                                                                                                                                                                 |
| `chakraDocsCodeBlock`             | `root`, `header`, `title`, `control`, `language`, `copyTrigger`, `copyIndicator`, `content`, `code`, `codeText`                                                                                                                                                                                                                            |

Page actions stack their label and description vertically inside `actionContent`, while the consistently sized icon remains alongside the text. Override `chakraDocsPageActions.base.actionContent` to customize the text layout or spacing; `icon`, `label`, and `description` remain independently themeable.

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

- `DocsProvider` — merges and provides `ChakraDocsConfig` (labels, link component, analytics, navigation icons, code block adapter, layout offsets, and page-action defaults) to descendants.
- `DocsLayout` — responsive shell that renders `DocsSidebar` at `lg` and above, an automatic `DocsMobileNavigation` below `lg` (when `nav` is passed), a content area, and `DocsTableOfContents` (when `headings` is passed). Its content wrapper is a `div` by default so it can safely sit inside an application's existing `main`; standalone pages can opt in with `contentSlotProps={{ as: 'main' }}`. Use `sidebarContent` for a legend, version control, or other content above the navigation, and `sidebarBadgeSlotProps` to style nav badges. Collapsible desktop navigation is enabled with `sidebarCollapsible`; configure its initial state with `sidebarDefaultExpanded`, or control it with `sidebarExpandedIds` and `onSidebarExpandedChange`. The mobile drawer uses collapsible active-path navigation by default. Pass `mobileNavigation={false}` to opt out or `mobileNavigationProps` to configure its title, search content, controlled state, slots, and sidebar. Use `sidebarIndicator` and `mobileTocIndicator` for per-layout icon overrides. Props: `page`, `nav`, `headings`, `stickyTop`, `scrollMarginTop`, `slotProps`, `contentSlotProps`, `sidebarContent`, `sidebarBadgeSlotProps`, `sidebarCollapsible`, `sidebarDefaultExpanded`, `sidebarExpandedIds`, `onSidebarExpandedChange`, `sidebarTriggerSlotProps`, `sidebarIndicator`, `sidebarIndicatorSlotProps`, `sidebarContentSlotProps`, `sidebarSlotProps`, `mobileTocIndicator`, `mobileNavigation`, `mobileNavigationProps`, `tocSlotProps`, `children`.
- `DocsArticle` — article wrapper that renders the page title and description header, with optional `breadcrumbs` and `actions` regions.
- `DocsBreadcrumbs` — navigation path derived from `nav` and `page.route`, with optional site-level home item.
- `DocsPageActions` — compound page action API with `Root`, `CopyPage`, `CopyLink`, `ViewMarkdown`, `Edit`, `Menu`, `Submenu`, `Group`, `Separator`, and `Item` components. The default `standard` preset automatically composes a split Copy page button and compact menu, supplies lightweight action icons, serializes the page title/description/body, and omits unavailable actions. Use `preset="minimal"` for the previous text-only, separated presentation. Provider-level `pageActions` config can replace icons, serialization, size, or variant; root/action props, `icon={null}`, custom children, slot props, and recipes remain the final overrides. Defaults are transparent `fg` triggers, a shared `border` outline with one divider, and `bg` menu surfaces with hover, keyboard-highlight and focus states. `Root` supports `sm`, `md`, and `lg` sizes, and its Chakra Menu-backed overlays provide controlled or uncontrolled state, nested menus, automatic close on selection, Escape and outside-click dismissal, focus restoration, keyboard navigation, typeahead, and collision-aware positioning.
- `DocsHeadingPermalink` — accessible clipboard action for a section URL.
- `DocsPageFeedback` — compound feedback form with controlled or uncontrolled choice/comment state, async submission status, and application-owned persistence.
- `DocsCards` — compound responsive card grid with `Root` and safe linked `Card` parts.
- `DocsSteps` — semantic ordered procedure with `Root` and independently composable `Item` parts.
- `DocsTabs` — compound tabs powered by Chakra Tabs, with arrow/Home/End keyboard navigation, roving focus, controlled/uncontrolled state, optional same-page synchronization through `syncKey`, and site-wide binding through `preference`. A group missing the global value falls back locally without overwriting the saved preference. Styling remains owned by `chakraDocsTabs` and per-instance slot props.
- `DocsPreferences` — site-wide preference state with `Root`, accessible `Select`, and conditional `When`; supports controlled state, validated sync/async persistence, SSR-safe defaults, hooks, reset, analytics, and recipe slots.
- `DocsApiTable` — responsive semantic API-reference table for names, types, defaults, descriptions, and required markers.
- `DocsBadge` — neutral metadata badge with an opt-in `accent` tone.
- `DocsSidebar` — sticky nav list built from `DocsNavItem[]`, highlighting the active route. Children render above the navigation list. Its direct disclosure props are `collapsible`, `defaultExpanded`, `expandedIds`, and `onExpandedChange`, with `indicator` for custom icon content and matching `triggerSlotProps`, `indicatorSlotProps`, and `contentSlotProps` overrides. Branch headings become buttons with `aria-expanded` and `aria-controls`; linked branches retain their link and add a separately labeled disclosure button. Badge elements expose their value through `data-badge` and `title`. The legacy `children` recipe slot remains supported alongside the new `trigger`, `indicator`, and `content` slots.
- `DocsMobileNavigation` — compound hamburger/drawer navigation with `Root`, `Trigger`, `Content`, `Header`, `Title`, `CloseTrigger`, `Search`, `Body`, and `Sidebar` parts. The default root composition handles focus, Escape, outside interaction, scroll containment, active-path expansion, route-change closing, and close-on-selection. Use the parts to replace any visual region while retaining the shared state and accessibility behavior.
- `DocsTableOfContents` — sticky "On this page" list that tracks the active heading on scroll and smooth-scrolls on click. The active section uses a square `activeIndicator` slot, which can be overridden in the theme or with `activeIndicatorSlotProps`.
- `DocsMobileTableOfContents` — disclosure-based mobile heading navigation using the same active-heading and scroll-offset behavior. `DocsLayout` includes it by default when headings are provided; pass `mobileToc={false}` to opt out or `indicator` to replace the default disclosure glyph.
- `DocsSearch` — Cmd/Ctrl+K search dialog with a compact search field, built-in magnifier, accessible query clearing, keyboard navigation, popular/default results, and collection scoping. The visible header is omitted by default; pass `title` to render it while the dialog always retains an accessible name. Pass `records` for synchronous local search or `searchProvider` for remote search; the provider takes precedence when both are present. Remote mode sends `collectionId`/`collectionIds`, `limit`, and `popularLimit` to the server, loads popular results on open, debounces typed queries (`debounceMs`, default 150 ms), and aborts superseded requests. `onNavigate` handles both unmodified pointer selection and Enter-key activation; modified clicks retain normal browser behavior. Props: `records`, `searchProvider`, `title`, `debounceMs`, `collectionId`, `collectionIds`, `limit`, `popularLimit`, `placeholder`, `onNavigate`, `onResultSelect`, plus slot props including `inputGroupSlotProps`, `inputSlotProps`, `searchIconSlotProps`, and `clearTriggerSlotProps`.
- `DocsVersionSelect` — labeled native select for switching collections/versions. Props: `collections` or `options`, `value`/`defaultValue`, `onValueChange`, `includeAll`, `allValue`, `allLabel`, `label`, `labelHidden`, plus slot props.
- `DocsPagination` — previous/next links derived from the flattened nav and the current `page.route`. Props: `nav`, `page`.
- `MarkdownContent` — CommonMark/GFM renderer powered by `react-markdown` and `remark-gfm`, with no Postkit dependency. Supports h1–h6 and Setext headings, nested/ordered/task lists, emphasis, strikethrough, reference links, autolinks, images, footnotes, thematic/hard breaks, responsive tables, quotes rendered as `Callout`, and fenced/indented code rendered as `CodeBlock`. Heading anchors agree with filesystem manifests and section search. Raw HTML/JSX is escaped; executable MDX and directives require a separate renderer. Unsafe link/image URLs are omitted. Props include `source`, `headingPermalinks`, `getHeadingHref`, `codeBlockProps`, `tableLabel`, and slot props. Tables scroll horizontally in a labelled, keyboard-focusable region. Style them through `tableContainer`, `table`, `tableHead`, `tableBody`, `tableRow`, `tableHeader`, and `tableCell` recipe slots or corresponding `*SlotProps`. Images, separators and task checkboxes expose `image`, `separator`, and `taskCheckbox` slots.
- `Callout` — bordered note box. Props: `type` (`'info' | 'warning' | 'success' | 'danger'`, default `'info'`), `title`, optional `icon` (any React node), `slotProps`, `iconSlotProps`, `bodySlotProps`, `titleSlotProps`, `contentSlotProps`, and `children`. Omit `icon` or pass `null` to retain an icon-free callout. Set `aria-hidden="true"` on decorative icons; custom components retain their own accessibility semantics.

```tsx
<Callout title="Compatibility" icon={<LuInfo aria-hidden="true" />}>
  Use this setup for projects with the pages directory.
</Callout>
```

Import `LuInfo` from `react-icons/lu`, or supply a component from your own icon system. The `icon` and `body` recipe slots keep the leading component aligned beside both the title and content, with independent per-instance overrides.

Callouts have a transparent background and a 1px `currentColor` border by default. Status variants only set the foreground (`fg.info`, `fg.warning`, `fg.success`, or `fg.error`), so text, icons, and border share that color in either color mode. Set `slotProps={{ color: 'fg' }}` for a neutral callout, or override the foreground/background through `chakraDocsCallout` in your system theme or per-instance slot props.

- `CodeBlock` — Chakra `CodeBlock`-based code shell with an optional title/language header and configurable copy action, line numbers, wrapping, highlighted lines, size, maximum height, and `outline`, `subtle`, or `plain` recipe variant. Props include `code`, `language`, `title`, `copy`, `lineNumbers`, `wrap`, `highlightLines`, `size`, `variant`, `maxHeight`, `slotProps`, and `children`. Copying defaults on; line numbers and wrapping default off.

### Hooks and helpers

- `useDocsConfig()` — read the merged `ChakraDocsConfig` (with default labels applied).
- `useDocsPreferences()` / `useDocsPreference(id)` — read and update all preferences or one declared dimension.
- `createDocsLocalPreferenceStorage(options?)` — create the local-storage adapter used by `storage="local"`.
- `createDocsVersionOptions(collections)` — map collections to `DocsVersionOption[]`.
- `filterSearchRecordsByCollections(records, collectionIds)` — scope search records to a set of collections.
- `createDocsBreadcrumbItems(nav, activeRoute)` — return every nav ancestor and the active page for breadcrumb rendering.

### Types

`ChakraDocsConfig`, `ChakraDocsIcons`, `ChakraDocsPageActionsConfig`, `DocsPageActionsIcons`, `DocsPageActionsPreset`, `DocsPageActionsVariant`, `DocsLabels`, `DocsAnalyticsCallbacks`, `DocsLinkProps`, `DocsLinkComponent`, `DocsComponentProps`, `DocsLayoutProps`, `DocsArticleProps`, `DocsBreadcrumbsProps`, `DocsBreadcrumbItem`, `DocsPageActionsRootProps`, `DocsPageActionsSize`, `DocsPageActionProps`, `DocsPageActionsMenuProps`, `DocsPageActionsSubmenuProps`, `DocsPageActionsGroupProps`, `DocsPageActionsSeparatorProps`, `DocsPageActionsOpenChangeDetails`, `DocsPageActionsPositioning`, `DocsPageActionsPlacement`, `DocsHeadingPermalinkProps`, `DocsPageFeedbackRootProps`, `DocsPageFeedbackValue`, `DocsPageFeedbackSubmitDetails`, `DocsCardsRootProps`, `DocsCardProps`, `DocsStepsRootProps`, `DocsStepProps`, `DocsTabsRootProps`, `DocsTabsValuePartProps`, `DocsPreferencesRootProps`, `DocsPreferenceSelectProps`, `DocsPreferenceWhenProps`, `DocsPreferenceDefinition`, `DocsPreferenceStorage`, `DocsPreferenceValues`, `DocsPreferenceChangeEvent`, `DocsApiTableProps`, `DocsApiTableItem`, `DocsBadgeProps`, `DocsSidebarProps`, `DocsSidebarDefaultExpanded`, `DocsMobileNavigationRootProps`, `DocsMobileNavigationTriggerProps`, `DocsMobileNavigationContentProps`, `DocsMobileNavigationPartProps`, `DocsMobileNavigationCloseTriggerProps`, `DocsMobileNavigationSidebarProps`, `DocsMobileNavigationOpenChangeDetails`, `DocsTableOfContentsProps`, `DocsMobileTableOfContentsProps`, `DocsSearchProps`, `DocsVersionSelectProps`, `DocsVersionOption`, `CalloutProps`, `CodeBlockProps`, `MarkdownContentProps`, `ChakraDocsLayoutConfig`, `ChakraDocsStickyTop`, `ChakraDocsCodeBlockConfig`, `ChakraDocsCodeBlockAdapter`, `ChakraDocsCodeBlockHighlighter`, and related code block types.

## Help and contributing

See the [project README](https://github.com/chakra-docs/chakra-docs#readme), [open an issue](https://github.com/chakra-docs/chakra-docs/issues), or read the [contribution guidelines](https://github.com/chakra-docs/chakra-docs/blob/main/CONTRIBUTING.md). Report vulnerabilities privately through the [security policy](https://github.com/chakra-docs/chakra-docs/security/policy).

## License

MIT
