# Theming and recipes

## Register the package recipes

Combine the package theme config with the host system, then apply host overrides after it.

```ts
import { createSystem, defaultConfig } from '@chakra-ui/react';
import {
  chakraDocsRecipeKeys,
  chakraDocsThemeConfig,
} from '@chakra-docs/chakra';

export const system = createSystem(defaultConfig, chakraDocsThemeConfig, {
  theme: {
    slotRecipes: {
      [chakraDocsRecipeKeys.tableOfContents]: {
        base: {
          activeIndicator: { bg: 'fg', w: '3px' },
        },
      },
    },
  },
});
```

Pass `system` to the host's `ChakraProvider`. Do not add a second Chakra provider around only the docs subtree unless the user explicitly wants an isolated theme.

## Color contract

Keep reusable defaults on Chakra semantic values:

- surfaces: `bg`, `bg.subtle`, `bg.panel`, `bg.emphasized`;
- text and icons: `fg`, `fg.muted`, `fg.subtle`;
- outlines and dividers: `border`, `border.emphasized`;
- contextual states: Chakra's semantic success, warning, info, and error values.

Avoid direct palette references such as `teal.*`. A host can introduce brand tokens or override an accent variant, but package-level neutral defaults must work in ordinary Chakra v3 systems and color modes.

## Customization levels

1. Prefer theme-level recipe overrides for site-wide appearance.
2. Use named `*SlotProps` for one instance or one page.
3. Compose compound component parts when the structure or behavior changes.
4. Replace a component only when its contract cannot express the requirement.

Every public recipe is exported individually and through `chakraDocsSlotRecipes`, `chakraDocsThemeConfig`, and `chakraDocsRecipeKeys`. Inspect the installed recipe's `slots` before overriding it; newer versions may add slots.

Important recipe families include layout/article, sidebar, desktop/mobile table of contents, breadcrumbs, heading permalink, page actions, feedback, search, Markdown, pagination, callout, code block, cards, steps, tabs, API table, and badge.

## Sticky layout diagnostics

When a sidebar or table of contents does not stick:

1. Verify the component recipe still sets `position: sticky` at the intended breakpoint.
2. Confirm a `top` value resolves from the component prop or `DocsProvider.config.layout`.
3. Inspect ancestor `overflow`, `contain`, transforms, and available column height in the host layout.
4. Verify the correct package build is installed, especially with `yalc`.
5. Test at the recipe's desktop breakpoint; the mobile TOC intentionally replaces the desktop one.

When active heading state does not appear, confirm headings have stable IDs matching the manifest, the page passed `headings`, and the active recipe variant has not been overwritten by a full replacement.

## Accessibility checks

- Section disclosures need `aria-expanded` and `aria-controls`.
- Tabs need related tab/panel IDs and selected state.
- copy actions need meaningful labels and visible success feedback.
- active navigation should not rely on color alone; retain the indicator or another non-color cue.
- preserve focus-visible styles in recipe overrides.
