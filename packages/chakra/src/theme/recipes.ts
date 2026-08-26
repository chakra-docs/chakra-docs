import * as ChakraStyledSystemRuntime from '@chakra-ui/react/styled-system';

const { defineConfig, defineSlotRecipe } =
  ChakraStyledSystemRuntime as unknown as {
    defineConfig: <Config>(config: Config) => Config;
    defineSlotRecipe: <Recipe>(recipe: Recipe) => Recipe;
  };

export const chakraDocsRecipeKeys = {
  article: 'chakraDocsArticle',
  callout: 'chakraDocsCallout',
  codeBlock: 'chakraDocsCodeBlock',
  layout: 'chakraDocsLayout',
  markdownContent: 'chakraDocsMarkdownContent',
  pagination: 'chakraDocsPagination',
  search: 'chakraDocsSearch',
  sidebar: 'chakraDocsSidebar',
  tableOfContents: 'chakraDocsTableOfContents',
  versionSelect: 'chakraDocsVersionSelect',
} as const;

export const chakraDocsLayoutSlotRecipe = defineSlotRecipe({
  className: 'chakra-docs-layout',
  slots: ['root', 'inner', 'content'],
  base: {
    root: {
      maxW: '7xl',
      px: { base: 4, md: 8 },
      py: 8,
    },
    inner: {
      alignItems: 'flex-start',
      display: 'flex',
      flexDirection: { base: 'column', lg: 'row' },
      gap: { base: 8, lg: 12 },
    },
    content: {
      flex: '1',
      minW: 0,
    },
  },
});

export const chakraDocsArticleSlotRecipe = defineSlotRecipe({
  className: 'chakra-docs-article',
  slots: ['root', 'header', 'title', 'description'],
  base: {
    root: { maxW: '3xl' },
    header: { mb: 8 },
    title: { mb: 3 },
    description: { color: 'fg.muted', fontSize: 'lg' },
  },
});

export const chakraDocsSidebarSlotRecipe = defineSlotRecipe({
  className: 'chakra-docs-sidebar',
  slots: [
    'root',
    'list',
    'item',
    'link',
    'sectionTitle',
    'badge',
    'children',
  ],
  base: {
    root: {
      flex: '0 0 16rem',
      position: { lg: 'sticky' },
      w: { base: '100%', lg: '16rem' },
    },
    list: { listStyleType: 'none', m: 0, ps: 0 },
    item: { py: 1 },
    sectionTitle: { fontWeight: 'semibold' },
    badge: { ms: 2 },
    children: { mt: 1, ps: 4 },
  },
  variants: {
    active: {
      true: {
        link: {
          color: 'colorPalette.fg',
          fontWeight: 'semibold',
        },
      },
      false: {},
    },
  },
  defaultVariants: { active: false },
});

export const chakraDocsTableOfContentsSlotRecipe = defineSlotRecipe({
  className: 'chakra-docs-table-of-contents',
  slots: ['root', 'label', 'list', 'item', 'link', 'activeIndicator'],
  base: {
    root: {
      display: { base: 'none', xl: 'block' },
      flex: '0 0 14rem',
      position: 'sticky',
    },
    label: { fontWeight: 'semibold', mb: 3 },
    list: { listStyleType: 'none', m: 0, ps: 0 },
    item: { py: 1 },
    link: {
      color: 'fg.muted',
      display: 'block',
      fontSize: 'sm',
      fontWeight: 'medium',
      position: 'relative',
      px: 2,
      py: 1,
      _hover: {
        color: 'fg',
        textDecoration: 'none',
      },
    },
    activeIndicator: {
      bg: 'transparent',
      insetBlock: 0,
      insetInlineStart: 0,
      position: 'absolute',
      w: '2px',
    },
  },
  variants: {
    active: {
      true: {
        link: {
          color: 'colorPalette.fg',
          _hover: { color: 'colorPalette.solid' },
        },
        activeIndicator: { bg: 'colorPalette.solid' },
      },
      false: {},
    },
  },
  defaultVariants: { active: false },
});

export const chakraDocsSearchSlotRecipe = defineSlotRecipe({
  className: 'chakra-docs-search',
  slots: [
    'trigger',
    'triggerLabel',
    'shortcut',
    'backdrop',
    'positioner',
    'root',
    'header',
    'title',
    'body',
    'input',
    'results',
    'sectionLabel',
    'resultList',
    'result',
    'resultLink',
    'resultRow',
    'resultContent',
    'resultTitle',
    'resultDescription',
    'resultBadge',
    'status',
  ],
  base: {
    trigger: {
      justifyContent: 'space-between',
      minW: { base: 'full', md: '13rem' },
    },
    triggerLabel: { color: 'fg.muted', fontWeight: 'medium' },
    positioner: { px: 4, pt: { base: 12, md: 20 } },
    root: { maxW: '2xl', overflow: 'hidden', p: 0 },
    header: { borderBottomWidth: '1px', p: 4 },
    title: { fontSize: 'sm' },
    body: { p: 0 },
    input: {
      borderRadius: 0,
      borderWidth: 0,
      fontSize: 'lg',
      h: 14,
      _focus: { boxShadow: 'none' },
    },
    results: {
      borderTopWidth: '1px',
      maxH: '420px',
      overflowY: 'auto',
      p: 3,
    },
    sectionLabel: {
      color: 'fg.muted',
      fontSize: 'xs',
      fontWeight: 'semibold',
      px: 2,
      py: 1,
    },
    resultList: { gap: 1 },
    result: {
      bg: 'transparent',
      borderColor: 'transparent',
      borderRadius: 'md',
      borderWidth: '1px',
      display: 'block',
      p: 3,
      _hover: { bg: 'bg.subtle', textDecoration: 'none' },
    },
    resultRow: {
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    resultContent: { gap: 1 },
    resultTitle: { fontWeight: 'semibold' },
    resultDescription: { color: 'fg.muted', fontSize: 'sm' },
    resultBadge: { flexShrink: 0 },
    status: {
      color: 'fg.muted',
      fontSize: 'sm',
      px: 2,
      py: 6,
      textAlign: 'center',
    },
  },
  variants: {
    active: {
      true: {
        result: {
          bg: 'colorPalette.subtle',
          borderColor: 'colorPalette.muted',
        },
      },
      false: {},
    },
  },
  defaultVariants: { active: false },
});

export const chakraDocsVersionSelectSlotRecipe = defineSlotRecipe({
  className: 'chakra-docs-version-select',
  slots: ['root', 'label', 'select'],
  base: {
    root: {
      alignItems: 'center',
      display: 'inline-flex',
      gap: 2,
      minW: 0,
    },
    label: {
      color: 'fg.muted',
      fontSize: 'xs',
      fontWeight: 'semibold',
      lineHeight: 1,
    },
    select: {
      bg: 'bg',
      borderColor: 'border',
      borderRadius: 'md',
      borderWidth: '1px',
      fontSize: 'sm',
      fontWeight: 'semibold',
      h: 8,
      lineHeight: 1,
      minW: '7.5rem',
      px: 2,
    },
  },
});

export const chakraDocsMarkdownContentSlotRecipe = defineSlotRecipe({
  className: 'chakra-docs-markdown-content',
  slots: [
    'root',
    'heading',
    'paragraph',
    'list',
    'listItem',
    'inlineCode',
    'link',
    'quote',
    'codeBlock',
  ],
  base: {
    root: { gap: 4 },
    paragraph: { color: 'fg.muted', fontSize: 'md' },
    list: { color: 'fg.muted', ps: 6 },
    listItem: { mt: 1 },
    link: {
      color: 'colorPalette.fg',
      fontWeight: 'semibold',
      textDecoration: 'underline',
      textUnderlineOffset: '3px',
    },
  },
  variants: {
    headingLevel: {
      section: { heading: { mt: 8 } },
      subsection: { heading: { mt: 3 } },
    },
  },
  defaultVariants: { headingLevel: 'subsection' },
});

export const chakraDocsPaginationSlotRecipe = defineSlotRecipe({
  className: 'chakra-docs-pagination',
  slots: ['root', 'item', 'label', 'link'],
  base: {
    root: {
      borderTopWidth: '1px',
      display: 'flex',
      gap: 4,
      justifyContent: 'space-between',
      mt: 12,
      pt: 6,
    },
    label: { color: 'fg.muted', fontSize: 'sm' },
  },
  variants: {
    direction: {
      previous: {},
      next: { item: { textAlign: 'right' } },
    },
  },
});

export const chakraDocsCalloutSlotRecipe = defineSlotRecipe({
  className: 'chakra-docs-callout',
  slots: ['root', 'title', 'content'],
  base: {
    root: { borderWidth: '1px', p: 4, rounded: 'md' },
    title: { fontWeight: 'semibold', mb: 2 },
  },
  variants: {
    status: {
      info: {
        root: {
          bg: 'bg.info',
          borderColor: 'border.info',
          color: 'fg.info',
        },
      },
      warning: {
        root: {
          bg: 'bg.warning',
          borderColor: 'border.warning',
          color: 'fg.warning',
        },
      },
      success: {
        root: {
          bg: 'bg.success',
          borderColor: 'border.success',
          color: 'fg.success',
        },
      },
      danger: {
        root: {
          bg: 'bg.error',
          borderColor: 'border.error',
          color: 'fg.error',
        },
      },
    },
  },
  defaultVariants: { status: 'info' },
});

export const chakraDocsCodeBlockSlotRecipe = defineSlotRecipe({
  className: 'chakra-docs-code-block',
  slots: [
    'root',
    'header',
    'title',
    'control',
    'language',
    'copyTrigger',
    'copyIndicator',
    'content',
    'code',
    'codeText',
  ],
});

export const chakraDocsSlotRecipes = {
  [chakraDocsRecipeKeys.article]: chakraDocsArticleSlotRecipe,
  [chakraDocsRecipeKeys.callout]: chakraDocsCalloutSlotRecipe,
  [chakraDocsRecipeKeys.codeBlock]: chakraDocsCodeBlockSlotRecipe,
  [chakraDocsRecipeKeys.layout]: chakraDocsLayoutSlotRecipe,
  [chakraDocsRecipeKeys.markdownContent]: chakraDocsMarkdownContentSlotRecipe,
  [chakraDocsRecipeKeys.pagination]: chakraDocsPaginationSlotRecipe,
  [chakraDocsRecipeKeys.search]: chakraDocsSearchSlotRecipe,
  [chakraDocsRecipeKeys.sidebar]: chakraDocsSidebarSlotRecipe,
  [chakraDocsRecipeKeys.tableOfContents]:
    chakraDocsTableOfContentsSlotRecipe,
  [chakraDocsRecipeKeys.versionSelect]: chakraDocsVersionSelectSlotRecipe,
};

export const chakraDocsThemeConfig = defineConfig({
  theme: { slotRecipes: chakraDocsSlotRecipes },
});
