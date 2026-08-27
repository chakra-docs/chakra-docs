import * as ChakraStyledSystemRuntime from '@chakra-ui/react/styled-system';

const { defineConfig, defineSlotRecipe } =
  ChakraStyledSystemRuntime as unknown as {
    defineConfig: <Config>(config: Config) => Config;
    defineSlotRecipe: <Recipe>(recipe: Recipe) => Recipe;
  };

export const chakraDocsRecipeKeys = {
  article: 'chakraDocsArticle',
  breadcrumbs: 'chakraDocsBreadcrumbs',
  callout: 'chakraDocsCallout',
  codeBlock: 'chakraDocsCodeBlock',
  layout: 'chakraDocsLayout',
  headingPermalink: 'chakraDocsHeadingPermalink',
  markdownContent: 'chakraDocsMarkdownContent',
  mobileTableOfContents: 'chakraDocsMobileTableOfContents',
  pageActions: 'chakraDocsPageActions',
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
  slots: [
    'root',
    'header',
    'breadcrumbs',
    'heading',
    'title',
    'description',
    'actions',
  ],
  base: {
    root: { maxW: '3xl' },
    header: { mb: 8 },
    breadcrumbs: { mb: 4 },
    heading: {
      alignItems: 'flex-start',
      display: 'flex',
      gap: 4,
      justifyContent: 'space-between',
    },
    title: { mb: 3 },
    description: { color: 'fg.muted', fontSize: 'lg' },
    actions: { flexShrink: 0 },
  },
});

export const chakraDocsBreadcrumbsSlotRecipe = defineSlotRecipe({
  className: 'chakra-docs-breadcrumbs',
  slots: ['root', 'list', 'item', 'link', 'current', 'separator'],
  base: {
    root: { color: 'fg.muted', fontSize: 'sm' },
    list: {
      alignItems: 'center',
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      listStyleType: 'none',
      m: 0,
      p: 0,
    },
    item: { alignItems: 'center', display: 'inline-flex', gap: 2 },
    link: {
      color: 'fg.muted',
      textDecoration: 'none',
      _hover: { color: 'fg', textDecoration: 'underline' },
    },
    current: { color: 'fg', fontWeight: 'medium' },
    separator: { color: 'fg.subtle', userSelect: 'none' },
  },
});

export const chakraDocsHeadingPermalinkSlotRecipe = defineSlotRecipe({
  className: 'chakra-docs-heading-permalink',
  slots: ['root', 'trigger', 'indicator'],
  base: {
    root: { display: 'inline-flex' },
    trigger: {
      alignItems: 'center',
      appearance: 'none',
      bg: 'transparent',
      borderWidth: 0,
      color: 'fg.muted',
      cursor: 'pointer',
      display: 'inline-flex',
      font: 'inherit',
      fontSize: '0.75em',
      ms: 2,
      opacity: 0.5,
      p: 0,
      _hover: { color: 'fg', opacity: 1 },
      _focusVisible: { outline: '2px solid', outlineColor: 'fg' },
    },
    indicator: { display: 'inline-flex' },
  },
});

export const chakraDocsPageActionsSlotRecipe = defineSlotRecipe({
  className: 'chakra-docs-page-actions',
  slots: [
    'root',
    'copyRoot',
    'trigger',
    'icon',
    'label',
    'indicator',
    'menu',
    'menuTrigger',
    'menuContent',
    'menuItem',
    'description',
  ],
  base: {
    root: {
      alignItems: 'center',
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
    },
    copyRoot: { display: 'contents' },
    trigger: {
      alignItems: 'center',
      appearance: 'none',
      bg: 'bg',
      borderColor: 'border',
      borderRadius: 'md',
      borderWidth: '1px',
      color: 'fg',
      cursor: 'pointer',
      display: 'inline-flex',
      fontSize: 'sm',
      fontWeight: 'medium',
      gap: 2,
      minH: 8,
      px: 3,
      textDecoration: 'none',
      _hover: { bg: 'bg.subtle', textDecoration: 'none' },
      _focusVisible: { outline: '2px solid', outlineColor: 'fg' },
    },
    icon: { display: 'inline-flex', flexShrink: 0 },
    label: { display: 'inline-flex' },
    indicator: { display: 'inline-flex' },
    menu: { position: 'relative' },
    menuTrigger: {
      cursor: 'pointer',
      listStyle: 'none',
      _marker: { display: 'none' },
    },
    menuContent: {
      bg: 'bg.panel',
      borderColor: 'border',
      borderRadius: 'md',
      borderWidth: '1px',
      boxShadow: 'md',
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      insetInlineEnd: 0,
      minW: '15rem',
      mt: 2,
      p: 1,
      position: 'absolute',
      zIndex: 'dropdown',
    },
    menuItem: {
      alignItems: 'flex-start',
      appearance: 'none',
      bg: 'transparent',
      borderRadius: 'sm',
      borderWidth: 0,
      color: 'fg',
      cursor: 'pointer',
      display: 'flex',
      fontSize: 'sm',
      gap: 3,
      p: 2,
      textAlign: 'start',
      textDecoration: 'none',
      w: 'full',
      _hover: { bg: 'bg.subtle', textDecoration: 'none' },
      _focusVisible: { outline: '2px solid', outlineColor: 'fg' },
    },
    description: { color: 'fg.muted', fontSize: 'xs' },
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
    'trigger',
    'indicator',
    'content',
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
    trigger: {
      alignItems: 'center',
      appearance: 'none',
      bg: 'transparent',
      borderWidth: 0,
      color: 'inherit',
      cursor: 'pointer',
      display: 'inline-flex',
      font: 'inherit',
      fontWeight: 'semibold',
      gap: 2,
      justifyContent: 'space-between',
      p: 0,
      textAlign: 'start',
      w: 'full',
    },
    indicator: {
      display: 'inline-flex',
      flex: '0 0 auto',
      transition: 'transform 150ms ease',
    },
    content: {},
  },
  variants: {
    active: {
      true: {
        link: {
          color: 'fg',
          fontWeight: 'semibold',
        },
      },
      false: {},
    },
    expanded: {
      true: {
        indicator: { transform: 'rotate(90deg)' },
        content: { display: 'block' },
      },
      false: {
        indicator: { transform: 'rotate(0deg)' },
        content: { display: 'none' },
      },
    },
    linked: {
      true: { trigger: { ms: 2, w: 'auto' } },
      false: {},
    },
  },
  defaultVariants: { active: false, expanded: true, linked: false },
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
          color: 'fg',
          _hover: { color: 'fg' },
        },
        activeIndicator: { bg: 'currentColor' },
      },
      false: {},
    },
  },
  defaultVariants: { active: false },
});

export const chakraDocsMobileTableOfContentsSlotRecipe = defineSlotRecipe({
  className: 'chakra-docs-mobile-table-of-contents',
  slots: [
    'root',
    'trigger',
    'triggerLabel',
    'current',
    'indicator',
    'content',
    'list',
    'item',
    'link',
    'activeIndicator',
  ],
  base: {
    root: {
      borderBottomWidth: '1px',
      display: { base: 'block', xl: 'none' },
      mb: 6,
      pb: 3,
    },
    trigger: {
      alignItems: 'center',
      cursor: 'pointer',
      display: 'flex',
      fontSize: 'sm',
      fontWeight: 'semibold',
      gap: 2,
      justifyContent: 'space-between',
      listStyle: 'none',
      _marker: { display: 'none' },
    },
    triggerLabel: { color: 'fg' },
    current: {
      color: 'fg.muted',
      fontWeight: 'normal',
      marginInlineStart: 'auto',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    indicator: { color: 'fg.muted', flexShrink: 0 },
    content: { pt: 3 },
    list: { listStyleType: 'none', m: 0, p: 0 },
    item: { py: 1 },
    link: {
      color: 'fg.muted',
      display: 'block',
      fontSize: 'sm',
      position: 'relative',
      px: 2,
      py: 1,
      textDecoration: 'none',
      _hover: { color: 'fg', textDecoration: 'none' },
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
        link: { color: 'fg', fontWeight: 'semibold' },
        activeIndicator: { bg: 'currentColor' },
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
          bg: 'bg.subtle',
          borderColor: 'border.emphasized',
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
      color: 'fg',
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
  [chakraDocsRecipeKeys.breadcrumbs]: chakraDocsBreadcrumbsSlotRecipe,
  [chakraDocsRecipeKeys.callout]: chakraDocsCalloutSlotRecipe,
  [chakraDocsRecipeKeys.codeBlock]: chakraDocsCodeBlockSlotRecipe,
  [chakraDocsRecipeKeys.layout]: chakraDocsLayoutSlotRecipe,
  [chakraDocsRecipeKeys.headingPermalink]: chakraDocsHeadingPermalinkSlotRecipe,
  [chakraDocsRecipeKeys.markdownContent]: chakraDocsMarkdownContentSlotRecipe,
  [chakraDocsRecipeKeys.mobileTableOfContents]:
    chakraDocsMobileTableOfContentsSlotRecipe,
  [chakraDocsRecipeKeys.pageActions]: chakraDocsPageActionsSlotRecipe,
  [chakraDocsRecipeKeys.pagination]: chakraDocsPaginationSlotRecipe,
  [chakraDocsRecipeKeys.search]: chakraDocsSearchSlotRecipe,
  [chakraDocsRecipeKeys.sidebar]: chakraDocsSidebarSlotRecipe,
  [chakraDocsRecipeKeys.tableOfContents]: chakraDocsTableOfContentsSlotRecipe,
  [chakraDocsRecipeKeys.versionSelect]: chakraDocsVersionSelectSlotRecipe,
};

export const chakraDocsThemeConfig = defineConfig({
  theme: { slotRecipes: chakraDocsSlotRecipes },
});
