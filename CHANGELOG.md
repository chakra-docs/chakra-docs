# Changelog

## 0.3.0 (2026-10-04)

### 🚀 Features

- **core:** add framework-neutral documentation preference definitions,
  validation, value resolution, persistence contracts, and change events.
- **chakra:** add controlled or persistent site-wide preferences, accessible
  selectors, conditional content, hooks, analytics, recipe slots, and preference-bound
  tab groups with non-destructive local fallback behavior.
- **chakra:** make the polished `standard` page-action preset the default, with
  automatic split composition, lightweight icons, deterministic page Markdown,
  provider-level defaults, and per-action icon opt-out. Retain the previous
  text-only presentation through `preset="minimal"`.
- **core:** add an SSR-safe `resolveDocsUrl` helper and a shared Markdown
  serializer contract for page actions and machine-readable routes.
- **chakra:** streamline the search dialog around a native search field with a
  built-in magnifier, accessible clear action, themeable input slots, and an
  opt-in visible title.
- **chakra:** add custom sidebar disclosure indicators and code-copy icons;
  report page-action menu opens through the analytics callbacks.
- **chakra:** add callout `icon`, `left`, and `right` component slots alongside
  the body, with recipe-owned spacing and transparent, foreground-colored
  default styling.
- **shiki:** accept host-defined syntax themes as well as bundled theme names.
- **docs:** align the docs-first site with the shared OSS typography, system
  color mode, credit/license and COMMUNE footers, separated OSS dependency
  credits, and page-specific Open Graph capture routes.

### 🩹 Fixes

- **chakra:** restore focus on page-action dismissal and keep closed menus
  hidden despite host CSS resets.
- **chakra:** align linked and heading-only sidebar disclosure indicators,
  center article content by default, and keep callout text and borders neutral
  instead of inheriting intent colors.
- **deps:** update Next.js and its lint plugin to 16.3.8; require Next.js
  16.3.6+ on the adapter's 16.x peer range. Patch Undici, devalue,
  http-cache-semantics, Axios, fast-uri, brace-expansion, Piscina, and
  @xhmikosr/decompress in the workspace lockfile.
- **security:** bound `braces@3.0.3` parsing and AST recursion with a verified
  pnpm patch while no upstream fix is available. Keep production audits
  unfiltered; allow only the tested development-only advisory through an
  expiring, fail-closed audit gate documented in `SECURITY.md`.
- **docs:** use public React Fathom 0.2.0 without yalc, with a temporary
  shared-context Pages Router tracker that excludes capture pages and strips
  query strings and fragments. Fix showcase formatting.
- **release:** verify public registry propagation with fresh anonymous
  requests, bounded retries, useful failure diagnostics, and latest-tag checks.

### 🔥 Performance

- **chakra:** add focused `/provider` and `/code-block` entry points and
  preserve direct Chakra export access for optimized host imports.

### 🛠️ Tooling

- Pin development/release tooling to Node 24 and pnpm 11.25.0, migrate the
  workspace lockfile and CI, and deduplicate the Chakra runtime under pnpm.
- Add release configuration, public analytics integration, dependency-patch,
  audit-policy, and shared site rendering regression checks.

### Upgrade notes

- Page actions now default to `preset="standard"`; choose `preset="minimal"`
  to retain the previous text-only presentation. Icons and slot recipes remain
  overridable at the provider, theme, and instance levels.
- Callouts now use transparent backgrounds and foreground borders/text.
  Restore colored intent surfaces through the callout recipe if desired.
- All 12 public packages and their internal dependency pins are aligned to
  0.3.0. There are no new package names in this release.

## 0.2.0 (2026-09-04)

### 🚀 Features

- **shiki:** add an optional first-party Shiki adapter with lazy/preloaded initialization, configurable grammars and light/dark themes, safe fallbacks, and Chakra code-line metadata. The docs site uses it for both Chakra Docs and Postkit rendering; Postkit's adapter remains compatible.
- **chakra:** render CommonMark and GFM content, including responsive tables, nested/ordered/task lists, images, reference links, footnotes, emphasis, and Setext headings. Share heading discovery with filesystem manifests and section search; keep raw HTML and executable MDX inert.
- **chakra:** expose sidebar badge styling ([ff0653f](https://github.com/chakra-docs/chakra-docs/commit/ff0653f))
- **chakra:** add collapsible docs sidebar ([e673a99](https://github.com/chakra-docs/chakra-docs/commit/e673a99))
- **chakra:** add composable page actions ([9bdc57d](https://github.com/chakra-docs/chakra-docs/commit/9bdc57d))
- **chakra:** add docs navigation affordances ([cc75f1b](https://github.com/chakra-docs/chakra-docs/commit/cc75f1b))
- **chakra:** add composable page feedback ([cd4df52](https://github.com/chakra-docs/chakra-docs/commit/cd4df52))
- **chakra:** add docs content primitives ([3c7cc03](https://github.com/chakra-docs/chakra-docs/commit/3c7cc03))
- **chakra:** expand page action menus ([23d5d9c](https://github.com/chakra-docs/chakra-docs/commit/23d5d9c))
- **chakra:** configure code block behavior ([e6d24ac](https://github.com/chakra-docs/chakra-docs/commit/e6d24ac))
- **chakra:** configure markdown code blocks ([097a4d2](https://github.com/chakra-docs/chakra-docs/commit/097a4d2))
- **chakra:** add neutral code block recipe ([5912782](https://github.com/chakra-docs/chakra-docs/commit/5912782))
- **chakra:** add composable mobile navigation ([d21858e](https://github.com/chakra-docs/chakra-docs/commit/d21858e))
- **chakra:** integrate responsive docs navigation ([ee67846](https://github.com/chakra-docs/chakra-docs/commit/ee67846))
- **chakra:** add focused theme entry point ([1bcf077](https://github.com/chakra-docs/chakra-docs/commit/1bcf077))
- **chakra:** complete split page action sizing ([cdfa489](https://github.com/chakra-docs/chakra-docs/commit/cdfa489))
- **chakra:** compose complete page actions by default ([4ff443a](https://github.com/chakra-docs/chakra-docs/commit/4ff443a))
- **chakra:** harden page action menus ([660f800](https://github.com/chakra-docs/chakra-docs/commit/660f800))
- **docs:** add Postkit rendering guide ([10f9aeb](https://github.com/chakra-docs/chakra-docs/commit/10f9aeb))
- **docs:** enable fuzzy server search ([d5fb689](https://github.com/chakra-docs/chakra-docs/commit/d5fb689))
- **next:** add machine-readable docs handlers ([6ff0f56](https://github.com/chakra-docs/chakra-docs/commit/6ff0f56))
- **search:** improve normalization and synonyms ([3211dd3](https://github.com/chakra-docs/chakra-docs/commit/3211dd3))
- **search:** add MiniSearch adapter ([b22943f](https://github.com/chakra-docs/chakra-docs/commit/b22943f))
- **search-pagefind:** preserve enhanced search metadata ([7d8718a](https://github.com/chakra-docs/chakra-docs/commit/7d8718a))
- **skill:** add chakra docs composition skill ([bb84b66](https://github.com/chakra-docs/chakra-docs/commit/bb84b66))

### 🩹 Fixes

- **chakra:** keep closed page-action menus and submenus hidden even when their
  flex recipe styles would otherwise override the browser's hidden-element rule.

- **deps:** patch Vitest, Nx's TOML parser, module-federation ZIP extraction, and both SVGO major versions without downgrading Nx or changing the test-runner major version.
- **deps:** update the docs site to Next.js 16.3.4 and patch Sharp and YAML dependencies. Adapter peers now require Next.js 15.5.24+/16.3.3+ or Astro 7.2.8+ to exclude affected framework releases.
- **docs:** pin published Postkit 0.2.0 with locked transitive dependencies, replacing the required local yalc setup and removing MDX dependency workarounds.
- **chakra:** position page-action overlays above sticky headers with viewport-fixed positioning and keyboard scroll padding; positioning and stacking remain overridable.

- **chakra:** wrap long navigation, breadcrumb, card, pagination and prose content without changing code whitespace; respect reduced motion for disclosure indicators and dialogs.

- **chakra:** provide 44px mobile hit areas for standalone navigation, disclosure, tab, copy, search, feedback and version controls while retaining compact desktop and inline-link spacing.

- **chakra:** give navigation links, cards, disclosure triggers, search and feedback controls explicit semantic keyboard-focus styles at the recipe level.

- **chakra:** bound page-action menus to the available viewport, scroll tall menus, and wrap long labels and descriptions.

- **chakra:** preserve page-action recipe variables and root CSS/inline variable overrides in portaled menus and submenus without leaking split-button layout styles.

- **chakra:** give page-action menus and submenus explicit muted inset keyboard-focus outlines.

- **chakra:** keep copy confirmation text visible, default to “Copied!”, and preserve provider/per-action copied-label overrides with polite live feedback.

- **chakra:** refine page-action defaults with 44px minimum-height buttons, panel hover states, muted inset focus outlines, 16px chevrons, and roomier rounded menus and items.

- **chakra:** stack page-action labels and descriptions vertically in a themeable `actionContent` slot, keeping icons alongside the text.

- **chakra:** default page actions to transparent `fg` triggers and `bg` menus, with consistent recipe-owned sizing, a single split divider, and visible hover/keyboard-focus states. Flatten composed slot styles so Chakra applies them, and prevent generic Button, Clipboard and Link recipes from overriding page-action defaults.
- **chakra:** honor mobile navigation dismissal preferences and preserve manual sidebar expansion across drawer reopenings and navigation.
- **chakra:** use Chakra Tabs for keyboard navigation, roving focus, and unique tab/panel relationships while retaining recipes and synchronized selection.
- **search:** match MiniSearch synonyms at punctuation boundaries without matching inside identifiers.
- **next:** normalize Markdown catch-all parameters without duplicating the `.md` suffix.
- **chakra:** preserve flex recipe styles ([1d777a0](https://github.com/chakra-docs/chakra-docs/commit/1d777a0))
- **chakra:** use portable semantic color defaults ([bbe8fb6](https://github.com/chakra-docs/chakra-docs/commit/bbe8fb6))
- **deps:** resolve dependency advisories ([1204f00](https://github.com/chakra-docs/chakra-docs/commit/1204f00))
- **docs:** resolve Postkit MDX dependencies ([3b0099f](https://github.com/chakra-docs/chakra-docs/commit/3b0099f))
- **release:** support granular Nx release commands ([fe80651](https://github.com/chakra-docs/chakra-docs/commit/fe80651))
- **search:** preserve exact identifier ranking ([4dc41c0](https://github.com/chakra-docs/chakra-docs/commit/4dc41c0))
- **tooling:** keep yalc publish compatible ([7b2eb64](https://github.com/chakra-docs/chakra-docs/commit/7b2eb64))

### 🔥 Performance

- **chakra:** bound public theme declarations ([42dfc6a](https://github.com/chakra-docs/chakra-docs/commit/42dfc6a))

### ❤️ Thank You

- Ryan Hefner

## 0.1.0 (2026-08-05) - Initial Release

Initial public release of the fixed Chakra Docs package group.

### Added

- Framework-neutral document, manifest, navigation, and rendering contracts.
- Filesystem and Git content sources, plus a command-line interface.
- Adapters for Chakra UI, Next.js, Astro, and React Router.
- Optional search, Pagefind search, and feed packages.
