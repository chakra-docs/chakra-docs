import type { SystemStyleObject } from '@chakra-ui/react';
import {
  chakraDocsSlotRecipes,
  chakraDocsThemeConfig,
} from '@chakra-docs/chakra/theme';
import {
  createSystem,
  defaultConfig,
  defineConfig,
  defineRecipe,
  defineSlotRecipe,
} from '@chakra-ui/react';
import { createPostkitTheme } from '@postkit/react/theme';
import { siteSlotRecipes } from './site-recipes';

const postkitTheme = createPostkitTheme({
  codeBlock: {
    base: {
      root: { bg: 'black', color: 'gray.100', _dark: { bg: 'gray.900' } },
      copyTrigger: {
        color: 'white',
        _hover: { bg: 'whiteAlpha.200', color: 'white' },
      },
    },
  },
  prose: {
    base: {
      a: {
        color: 'site.link',
        textDecoration: 'none',
        _hover: { textDecoration: 'underline' },
        _focusVisible: { textDecoration: 'underline' },
      },
    },
  },
});

// Apply these through slotProps as well as the recipe: unlayered Dialog and
// Button styles otherwise take precedence over the recipe cascade layer.
export const siteMobileNavigationStyles = {
  header: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minH: '56px',
    gap: 3,
    px: 4,
    pt: 'calc(env(safe-area-inset-top, 0px) + 6px)',
    pb: '6px',
  },
  title: { flex: 1, minW: 0, m: 0, lineHeight: '24px' },
  closeTrigger: {
    // asChild merges Dialog.CloseTrigger styles after the Button styles.
    '&&': { position: 'static', inset: 'auto' },
    flexShrink: 0,
    p: 0,
    boxSize: '44px',
    minW: '44px',
    minH: '44px',
    _icon: { boxSize: '24px', display: 'block' },
  },
  search: {
    minW: 0,
    p: 0,
    '& button[data-scope="dialog"][data-part="trigger"]': {
      w: '100%',
      minW: 0,
      maxW: '100%',
      minH: '56px',
      borderWidth: 0,
      borderRadius: 0,
      bg: 'transparent',
      boxShadow: 'none',
      px: 4,
      justifyContent: 'space-between',
      _hover: { bg: 'bg.subtle' },
      _focusVisible: {
        outline: '2px solid',
        outlineColor: 'fg',
        outlineOffset: '-2px',
      },
    },
  },
} satisfies Record<string, SystemStyleObject>;

export const siteThemeConfig = defineConfig({
  globalCss: {
    html: {
      bg: 'bg',
      color: 'fg',
      scrollBehavior: 'smooth',
      _motionReduce: { scrollBehavior: 'auto' },
    },
    body: { bg: 'bg', color: 'fg' },
    'strong, b': { fontWeight: 500 },
    'header, footer, [aria-label="By Commune Software"]': {
      _print: { display: 'none !important' },
    },
  },
  theme: {
    tokens: {
      colors: { black: { value: '#000000' }, white: { value: '#ffffff' } },
      sizes: { siteHeader: { value: 'calc({sizes.11} + {spacing.6} + 1px)' } },
      spacing: {
        docsStickyTop: { value: '5rem' },
        docsScrollMargin: { value: '6rem' },
      },
      zIndex: { siteHeader: { value: '50' } },
      fontWeights: { semibold: { value: '500' } },
      fonts: {
        body: {
          value:
            "'Suisse Intl', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
        heading: {
          value:
            "'Suisse Intl', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
        mono: {
          value:
            "'Suisse Intl Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        },
      },
    },
    semanticTokens: {
      colors: {
        'og.canvas': { value: '{colors.black}' },
        'og.foreground': { value: '{colors.white}' },
        'og.muted': { value: '{colors.gray.400}' },
        'og.rule': { value: '{colors.gray.800}' },
        bg: {
          DEFAULT: {
            value: { _light: '{colors.white}', _dark: '{colors.black}' },
          },
        },
        fg: {
          DEFAULT: {
            value: { _light: '{colors.black}', _dark: '{colors.white}' },
          },
        },
        'site.link': {
          value: { _light: '{colors.blue.600}', _dark: '{colors.blue.300}' },
        },
      },
    },
    recipes: {
      heading: defineRecipe({
        base: { fontWeight: 500, letterSpacing: 'tight' },
      }),
    },
    slotRecipes: {
      ...siteSlotRecipes,
      chakraDocsLayout: defineSlotRecipe({
        slots: [...chakraDocsSlotRecipes.chakraDocsLayout.slots],
        base: { root: { pt: { base: 4, lg: 8 } } },
      }),
      chakraDocsMobileNavigation: defineSlotRecipe({
        slots: [...chakraDocsSlotRecipes.chakraDocsMobileNavigation.slots],
        base: {
          trigger: {
            borderWidth: 0,
            boxSize: '44px',
            minW: '44px',
            minH: '44px',
            px: 0,
            gap: 0,
            justifyContent: 'center',
            _icon: { boxSize: '24px' },
          },
          triggerIcon: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSize: '24px',
            lineHeight: 1,
            '& svg': { display: 'block' },
          },
          triggerLabel: { display: 'none' },
          positioner: {
            position: 'fixed',
            inset: 0,
            w: '100dvw',
            h: '100dvh',
            p: 0,
            overflow: 'hidden',
          },
          content: {
            w: '100dvw',
            maxW: 'none',
            h: '100dvh',
            maxH: '100dvh',
            flexShrink: 0,
            m: 0,
            borderEndWidth: 0,
            borderRadius: 0,
            boxShadow: 'none',
            overflow: 'hidden',
          },
          ...siteMobileNavigationStyles,
          body: {
            flex: 1,
            minH: 0,
            overflowY: 'auto',
            overscrollBehaviorY: 'contain',
            pb: 'max(1rem, env(safe-area-inset-bottom))',
          },
        },
      }),
      chakraDocsMarkdownContent: defineSlotRecipe({
        slots: [...chakraDocsSlotRecipes.chakraDocsMarkdownContent.slots],
        base: {
          link: { color: 'site.link', _hover: { textDecoration: 'underline' } },
        },
      }),
      chakraDocsPageActions: defineSlotRecipe({
        slots: [...chakraDocsSlotRecipes.chakraDocsPageActions.slots],
        variants: {
          size: {
            sm: {
              root: {
                '--chakra-docs-page-actions-height': {
                  base: 'sizes.11',
                  md: 'sizes.8',
                },
              },
              menuTrigger: { minW: { base: 11, md: 8 } },
            },
          },
        },
      }),
      chakraDocsSearch: defineSlotRecipe({
        slots: [...chakraDocsSlotRecipes.chakraDocsSearch.slots],
        base: {
          trigger: { minW: { base: 0, md: '13rem' }, flexShrink: 0 },
          shortcut: { display: { base: 'none', md: 'inline-flex' } },
          root: { borderRadius: 'xl' },
          input: {
            borderTopRadius: 'xl',
            focusRingColor: 'fg.muted',
            focusRingWidth: '1px',
            _focusVisible: {
              borderColor: 'transparent',
              boxShadow: 'none',
              outline: '1px solid',
              outlineColor: 'fg.muted',
              outlineOffset: '-2px',
            },
          },
        },
      }),
      chakraDocsCodeBlock: defineSlotRecipe({
        slots: [...chakraDocsSlotRecipes.chakraDocsCodeBlock.slots],
        base: {
          root: {
            bg: 'black',
            borderColor: 'gray.800',
            borderRadius: 'lg',
            color: 'gray.100',
            my: 4,
            _dark: { bg: 'gray.900' },
          },
          header: { borderBottomColor: 'gray.800' },
          title: { color: 'gray.400' },
          language: { color: 'gray.400' },
          copyTrigger: {
            color: 'white',
            _hover: { bg: 'whiteAlpha.200', color: 'white' },
            _focusVisible: { outlineColor: 'white' },
          },
          copyIndicator: { boxSize: 4 },
        },
      }),
    },
  },
});

export const docsSystem = createSystem(
  defaultConfig,
  chakraDocsThemeConfig,
  postkitTheme,
  siteThemeConfig,
);
