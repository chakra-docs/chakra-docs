# Changelog

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
